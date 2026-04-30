#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Finds all enabled AD accounts inactive for more than the configured number of days,
    disables them, moves them to the disabled OU, and exports a CSV audit report.
.EXAMPLE
    .\account-deactivation.ps1
    .\account-deactivation.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(HelpMessage = "Preview accounts that would be deactivated without making changes")]
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Load config ───────────────────────────────────────────────────────────────
$configPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $configPath)) { Write-Error "config.json not found at: $configPath"; exit 1 }
$config = Get-Content -Raw $configPath | ConvertFrom-Json

if (-not (Test-Path $config.logPath)) {
    New-Item -ItemType Directory -Path $config.logPath -Force | Out-Null
}
$logFile = Join-Path $config.logPath 'account-deactivation.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

$inactivityDays = if ($config.inactivityDays) { [int]$config.inactivityDays } else { 90 }
$cutoffDate     = (Get-Date).AddDays(-$inactivityDays)

if ($DryRun) { Write-Log "DRY RUN mode — no accounts will be disabled" }
Write-Log "Scanning for accounts with no logon since $($cutoffDate.ToString('yyyy-MM-dd')) ($inactivityDays days)"

# ── Find inactive enabled accounts ────────────────────────────────────────────
try {
    $inactive = Search-ADAccount `
        -AccountInactive `
        -TimeSpan ([timespan]::FromDays($inactivityDays)) `
        -UsersOnly `
        -SearchBase $config.usersOU `
        -ErrorAction Stop |
        Get-ADUser -Properties DisplayName, LastLogonDate, EmailAddress |
        Where-Object { $_.Enabled -eq $true }
} catch {
    Write-Log "Failed to query Active Directory: $_" 'ERROR'
    exit 1
}

Write-Log "Found $($inactive.Count) inactive enabled account(s)"

$auditRows    = [System.Collections.Generic.List[object]]::new()
$disabledCount = 0

foreach ($user in $inactive) {
    $action = ''
    try {
        if (-not $DryRun) {
            Disable-ADAccount -Identity $user.SamAccountName -ErrorAction Stop

            if ($config.disabledOU) {
                $freshUser = Get-ADUser -Identity $user.SamAccountName -Properties DistinguishedName
                Move-ADObject -Identity $freshUser.DistinguishedName `
                    -TargetPath $config.disabledOU -ErrorAction Stop
            }

            Write-Log "Disabled '$($user.SamAccountName)' (last logon: $($user.LastLogonDate))"
            $action = 'Disabled'
            $disabledCount++
        } else {
            Write-Log "[DRY RUN] Would disable '$($user.SamAccountName)' (last logon: $($user.LastLogonDate))"
            $action = 'DryRun — Would Disable'
        }
    } catch {
        Write-Log "FAILED to process '$($user.SamAccountName)': $_" 'ERROR'
        $action = "FAILED: $_"
    }

    $auditRows.Add([PSCustomObject]@{
        Username    = $user.SamAccountName
        DisplayName = $user.DisplayName
        Email       = $user.EmailAddress
        LastLogon   = $user.LastLogonDate
        Action      = $action
        Timestamp   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    })
}

# ── Save CSV audit report ─────────────────────────────────────────────────────
if ($auditRows.Count -gt 0) {
    $reportDir = if ($config.reportPath) { $config.reportPath } else { $config.logPath }
    if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }

    $reportFile = Join-Path $reportDir "account-deactivation-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $auditRows | Export-Csv -Path $reportFile -NoTypeInformation -Encoding UTF8
    Write-Log "Audit report saved: $reportFile"
} else {
    Write-Log "No inactive accounts found — nothing to report"
}

Write-Log "=== Account deactivation complete. $disabledCount account(s) disabled ==="
exit 0
