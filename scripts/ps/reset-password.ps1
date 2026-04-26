#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Resets an Active Directory user password and optionally forces a change on next login.
.EXAMPLE
    .\reset-password.ps1 -Username jdoe
    .\reset-password.ps1 -Username jdoe -NoForceChange
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "AD sAMAccountName of the user")]
    [ValidateNotNullOrEmpty()]
    [string]$Username,

    [Parameter(HelpMessage = "Skip forcing password change on next login")]
    [switch]$NoForceChange
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Load config ──────────────────────────────────────────────────────────────
$configPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $configPath)) {
    Write-Error "config.json not found at: $configPath"
    exit 1
}
$config = Get-Content -Raw $configPath | ConvertFrom-Json

# ── Ensure log directory exists ───────────────────────────────────────────────
if (-not (Test-Path $config.logPath)) {
    New-Item -ItemType Directory -Path $config.logPath -Force | Out-Null
}
$logFile = Join-Path $config.logPath 'reset-password.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

# ── Validate user exists ──────────────────────────────────────────────────────
try {
    $adUser = Get-ADUser -Identity $Username -ErrorAction Stop
} catch {
    Write-Log "User '$Username' not found in Active Directory." 'ERROR'
    exit 1
}

# ── Reset password ────────────────────────────────────────────────────────────
try {
    $securePass = ConvertTo-SecureString $config.defaultTempPassword -AsPlainText -Force
    Set-ADAccountPassword -Identity $Username -NewPassword $securePass -Reset -ErrorAction Stop
    Unlock-ADAccount -Identity $Username -ErrorAction SilentlyContinue

    $forceChange = -not $NoForceChange.IsPresent
    Set-ADUser -Identity $Username -ChangePasswordAtLogon $forceChange -ErrorAction Stop

    Write-Log "Password reset for '$Username' (DisplayName: $($adUser.Name)). ForceChange=$forceChange"
    exit 0
} catch {
    Write-Log "FAILED to reset password for '$Username': $_" 'ERROR'
    exit 1
}
