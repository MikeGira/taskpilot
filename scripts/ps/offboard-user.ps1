#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Offboards a departing employee: disables their AD account, removes all group
    memberships, archives their home folder, and emails an offboarding report to HR.
.EXAMPLE
    .\offboard-user.ps1 -Username jdoe
    .\offboard-user.ps1 -Username jdoe -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "AD sAMAccountName of the departing user")]
    [ValidateNotNullOrEmpty()]
    [string]$Username,

    [Parameter(HelpMessage = "Preview all changes without making them")]
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
$logFile = Join-Path $config.logPath 'offboard-user.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

if ($DryRun) { Write-Log "DRY RUN mode — no changes will be made" }

# ── Validate user ─────────────────────────────────────────────────────────────
try {
    $adUser = Get-ADUser -Identity $Username `
        -Properties DisplayName, EmailAddress, MemberOf, HomeDirectory, DistinguishedName `
        -ErrorAction Stop
} catch {
    Write-Log "User '$Username' not found in Active Directory." 'ERROR'
    exit 1
}

$report = [System.Collections.Generic.List[string]]::new()
$report.Add("Offboarding Report")
$report.Add("User     : $($adUser.DisplayName) ($Username)")
$report.Add("Email    : $($adUser.EmailAddress)")
$report.Add("Date     : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')")
$report.Add("---")

Write-Log "Starting offboarding for '$Username' ($($adUser.DisplayName))"

# ── Disable account ───────────────────────────────────────────────────────────
try {
    if (-not $DryRun) {
        Disable-ADAccount -Identity $Username -ErrorAction Stop
        Write-Log "Account '$Username' disabled"
        $report.Add("Account disabled    : YES")
    } else {
        Write-Log "[DRY RUN] Would disable account '$Username'"
        $report.Add("Account disabled    : DRY RUN")
    }
} catch {
    Write-Log "FAILED to disable '$Username': $_" 'ERROR'
    $report.Add("Account disabled    : FAILED — $_")
}

# ── Remove group memberships (skip Domain Users) ──────────────────────────────
$removedGroups = @()
foreach ($groupDN in @($adUser.MemberOf)) {
    $groupName = ($groupDN -split ',')[0] -replace '^CN=', ''
    if ($groupName -eq 'Domain Users') { continue }
    try {
        if (-not $DryRun) {
            Remove-ADGroupMember -Identity $groupDN -Members $Username -Confirm:$false -ErrorAction Stop
        }
        Write-Log "$(if ($DryRun) {'[DRY RUN] Would remove'} else {'Removed'}) from group '$groupName'"
        $removedGroups += $groupName
    } catch {
        Write-Log "Could not remove from group '$groupName': $_" 'WARN'
    }
}
$report.Add("Groups removed      : $(if ($removedGroups.Count -gt 0) { $removedGroups -join ', ' } else { 'None' })")

# ── Move to disabled OU ───────────────────────────────────────────────────────
if ($config.disabledOU) {
    try {
        if (-not $DryRun) {
            Move-ADObject -Identity $adUser.DistinguishedName -TargetPath $config.disabledOU -ErrorAction Stop
            Write-Log "Moved to disabled OU: $($config.disabledOU)"
        } else {
            Write-Log "[DRY RUN] Would move to $($config.disabledOU)"
        }
        $report.Add("Moved to disabled OU: $($config.disabledOU)")
    } catch {
        Write-Log "Could not move to disabled OU: $_" 'WARN'
        $report.Add("Moved to disabled OU: FAILED — $_")
    }
}

# ── Archive home folder ───────────────────────────────────────────────────────
if ($config.homeBasePath -and $config.archivePath) {
    $homeDir    = Join-Path $config.homeBasePath $Username
    $archiveDir = Join-Path $config.archivePath $Username

    if (Test-Path $homeDir) {
        try {
            if (-not $DryRun) {
                if (-not (Test-Path $config.archivePath)) {
                    New-Item -ItemType Directory -Path $config.archivePath -Force | Out-Null
                }
                Copy-Item -Path $homeDir -Destination $archiveDir -Recurse -Force -ErrorAction Stop
                Write-Log "Home folder archived to '$archiveDir'"
            } else {
                Write-Log "[DRY RUN] Would archive '$homeDir' to '$archiveDir'"
            }
            $report.Add("Home folder archived: $archiveDir")
        } catch {
            Write-Log "Could not archive home folder: $_" 'WARN'
            $report.Add("Home folder archived: FAILED — $_")
        }
    } else {
        Write-Log "No home folder found at '$homeDir'"
        $report.Add("Home folder         : Not found at $homeDir")
    }
}

# ── Email HR report ───────────────────────────────────────────────────────────
$report.Add("")
$report.Add("Generated by TaskPilot offboard-user.ps1")
$reportBody = $report -join "`r`n"

if ($config.smtpServer -and $config.hrEmail -and -not $DryRun) {
    try {
        Send-MailMessage `
            -From       $config.emailFrom `
            -To         $config.hrEmail `
            -Subject    "Offboarding Complete: $($adUser.DisplayName)" `
            -Body       $reportBody `
            -SmtpServer $config.smtpServer `
            -ErrorAction Stop
        Write-Log "Offboarding report emailed to $($config.hrEmail)"
    } catch {
        Write-Log "Could not send email report: $_" 'WARN'
    }
}

Write-Log "=== Offboarding complete for '$Username' ==="
Write-Host "`n$reportBody"
exit 0
