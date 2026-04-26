#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Creates a new Active Directory user, assigns default groups, and sets a temp password.
.EXAMPLE
    .\new-user.ps1 -FirstName Jane -LastName Doe -Department "IT Support"
    .\new-user.ps1 -FirstName Jane -LastName Doe -Department Finance -Manager jsmith
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]  [string]$FirstName,
    [Parameter(Mandatory = $true)]  [string]$LastName,
    [Parameter(Mandatory = $false)] [string]$Department = '',
    [Parameter(Mandatory = $false)] [string]$Manager = '',
    [Parameter(Mandatory = $false)] [string]$Title = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Load config ───────────────────────────────────────────────────────────────
$configPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $configPath)) { Write-Error "config.json not found"; exit 1 }
$config = Get-Content -Raw $configPath | ConvertFrom-Json

if (-not (Test-Path $config.logPath)) {
    New-Item -ItemType Directory -Path $config.logPath -Force | Out-Null
}
$logFile = Join-Path $config.logPath 'new-user.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

# ── Build username (firstname.lastname) ───────────────────────────────────────
$base     = "$($FirstName.ToLower()).$($LastName.ToLower())" -replace '[^a-z0-9.]', ''
$username = $base
$counter  = 1
while (Get-ADUser -Filter "SamAccountName -eq '$username'" -ErrorAction SilentlyContinue) {
    $username = "${base}${counter}"
    $counter++
}

$displayName = "$FirstName $LastName"
$upn         = "$username@$($config.domain)"

Write-Log "Creating user: $username ($displayName) UPN=$upn"

# ── Create AD user ────────────────────────────────────────────────────────────
try {
    $securePass = ConvertTo-SecureString $config.defaultTempPassword -AsPlainText -Force

    $params = @{
        SamAccountName        = $username
        UserPrincipalName     = $upn
        GivenName             = $FirstName
        Surname               = $LastName
        DisplayName           = $displayName
        Name                  = $displayName
        AccountPassword       = $securePass
        Enabled               = $true
        PasswordNeverExpires  = $false
        ChangePasswordAtLogon = $true
        Path                  = $config.usersOU
    }
    if ($Department) { $params['Department'] = $Department }
    if ($Title)      { $params['Title']      = $Title }

    New-ADUser @params -ErrorAction Stop
    Write-Log "AD user '$username' created successfully"
} catch {
    Write-Log "FAILED to create user '$username': $_" 'ERROR'
    exit 1
}

# ── Set manager ───────────────────────────────────────────────────────────────
if ($Manager) {
    try {
        $managerObj = Get-ADUser -Identity $Manager -ErrorAction Stop
        Set-ADUser -Identity $username -Manager $managerObj.DistinguishedName
        Write-Log "Manager set to '$Manager'"
    } catch {
        Write-Log "Could not set manager '$Manager': $_" 'WARN'
    }
}

# ── Assign default groups ─────────────────────────────────────────────────────
foreach ($group in $config.defaultGroups) {
    try {
        Add-ADGroupMember -Identity $group -Members $username -ErrorAction Stop
        Write-Log "Added to group '$group'"
    } catch {
        Write-Log "Could not add to group '$group': $_" 'WARN'
    }
}

Write-Log "=== New user provisioning complete: $username | Temp password must be changed on first login ==="
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  Username : $username"
Write-Host "  UPN      : $upn"
Write-Host "  Display  : $displayName"
Write-Host "  OU       : $($config.usersOU)"
exit 0
