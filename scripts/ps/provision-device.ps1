#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Pre-stages a new device computer account in Active Directory, assigns it to the
    correct OU, and registers it in the asset inventory CSV. Run this BEFORE the
    device joins the domain so the account is ready and policies apply on first join.
.EXAMPLE
    .\provision-device.ps1 -ComputerName DESKTOP-001 -AssetTag IT-2024-001
    .\provision-device.ps1 -ComputerName LAPTOP-HR-05 -AssetTag IT-2024-002 -AssignedUser jdoe -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Computer name (NetBIOS, max 15 chars)")]
    [ValidateLength(1, 15)]
    [ValidatePattern('^[A-Za-z0-9\-]+$')]
    [string]$ComputerName,

    [Parameter(Mandatory = $true, HelpMessage = "Asset tag for inventory tracking")]
    [ValidateNotNullOrEmpty()]
    [string]$AssetTag,

    [Parameter(HelpMessage = "AD username of the primary user (optional)")]
    [string]$AssignedUser = '',

    [Parameter(HelpMessage = "Preview changes without making them")]
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
$logFile = Join-Path $config.logPath 'provision-device.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

if ($DryRun) { Write-Log "DRY RUN mode — no changes will be made" }
Write-Log "Provisioning device '$ComputerName' (AssetTag: $AssetTag, AssignedUser: $(if ($AssignedUser) { $AssignedUser } else { 'None' }))"

# ── Check for existing computer account ───────────────────────────────────────
$existing = Get-ADComputer -Filter "Name -eq '$ComputerName'" -ErrorAction SilentlyContinue
if ($existing) {
    Write-Log "Computer account '$ComputerName' already exists in AD — skipping creation" 'WARN'
} else {
    # ── Create pre-staged computer account ────────────────────────────────────
    $targetOU = if ($config.deviceOU) { $config.deviceOU } else { $config.adminOU }
    try {
        if (-not $DryRun) {
            New-ADComputer `
                -Name        $ComputerName `
                -SamAccountName "$ComputerName$" `
                -Path        $targetOU `
                -Description "AssetTag: $AssetTag | Provisioned: $(Get-Date -Format 'yyyy-MM-dd') | User: $AssignedUser" `
                -Enabled     $true `
                -ErrorAction Stop
            Write-Log "Computer account '$ComputerName' created in '$targetOU'"
        } else {
            Write-Log "[DRY RUN] Would create computer account '$ComputerName' in '$targetOU'"
        }
    } catch {
        Write-Log "FAILED to create computer account '$ComputerName': $_" 'ERROR'
        exit 1
    }
}

# ── Add to device group (if configured) ───────────────────────────────────────
if ($config.deviceGroup) {
    try {
        if (-not $DryRun) {
            Add-ADGroupMember -Identity $config.deviceGroup -Members "$ComputerName$" -ErrorAction Stop
            Write-Log "Added '$ComputerName' to group '$($config.deviceGroup)'"
        } else {
            Write-Log "[DRY RUN] Would add '$ComputerName' to '$($config.deviceGroup)'"
        }
    } catch {
        Write-Log "Could not add to device group '$($config.deviceGroup)': $_" 'WARN'
    }
}

# ── Log to asset inventory CSV ────────────────────────────────────────────────
$inventoryPath = if ($config.assetInventoryPath) { $config.assetInventoryPath } else {
    Join-Path $config.logPath 'asset-inventory.csv'
}

$inventoryRow = [PSCustomObject]@{
    ComputerName  = $ComputerName
    AssetTag      = $AssetTag
    AssignedUser  = $AssignedUser
    Status        = if ($DryRun) { 'DryRun' } else { 'Provisioned' }
    ProvisionedBy = $env:USERNAME
    Date          = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Notes         = ''
}

try {
    $writeHeader = -not (Test-Path $inventoryPath)
    if (-not $DryRun) {
        $inventoryRow | Export-Csv -Path $inventoryPath -NoTypeInformation -Append -Encoding UTF8
        if ($writeHeader) {
            Write-Log "Asset inventory created: $inventoryPath"
        } else {
            Write-Log "Asset inventory updated: $inventoryPath"
        }
    } else {
        Write-Log "[DRY RUN] Would log to asset inventory: $inventoryPath"
    }
} catch {
    Write-Log "Could not update asset inventory: $_" 'WARN'
}

Write-Log "=== Device provisioning complete for '$ComputerName' ==="
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Boot the device and join it to domain '$($config.domain)' using any admin account"
Write-Host "  2. Group Policy will apply automatically on first login"
Write-Host "  3. Install approved software using your deployment tool or the device setup checklist"
Write-Host "  4. Assign AssetTag label '$AssetTag' to the physical device"
exit 0
