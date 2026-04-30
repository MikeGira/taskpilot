#Requires -Version 5.1
#Requires -Modules ActiveDirectory

<#
.SYNOPSIS
    Decommissions a device: removes its AD computer account, updates the asset
    inventory CSV, and logs the action. Back up user data and physically wipe
    the device before running this script.
.EXAMPLE
    .\decommission-device.ps1 -ComputerName DESKTOP-001 -AssetTag IT-2024-001 -Reason "End of life"
    .\decommission-device.ps1 -ComputerName DESKTOP-001 -AssetTag IT-2024-001 -Reason "Replaced" -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "NetBIOS name of the device to decommission")]
    [ValidateNotNullOrEmpty()]
    [string]$ComputerName,

    [Parameter(Mandatory = $true, HelpMessage = "Asset tag of the device")]
    [ValidateNotNullOrEmpty()]
    [string]$AssetTag,

    [Parameter(Mandatory = $true, HelpMessage = "Reason for decommission (e.g. End of life, Replaced, Lost)")]
    [ValidateNotNullOrEmpty()]
    [string]$Reason,

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
$logFile = Join-Path $config.logPath 'decommission-device.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    if ($Level -eq 'ERROR') { Write-Error $Message } else { Write-Host $entry }
}

if ($DryRun) { Write-Log "DRY RUN mode — no changes will be made" }
Write-Log "Decommissioning '$ComputerName' (AssetTag: $AssetTag, Reason: $Reason)"

# ── Safety confirmation ───────────────────────────────────────────────────────
if (-not $DryRun) {
    Write-Host "`nWARNING: This will permanently remove '$ComputerName' from Active Directory." -ForegroundColor Yellow
    Write-Host "Ensure user data has been backed up and the device has been wiped before proceeding." -ForegroundColor Yellow
    $confirm = Read-Host "Type '$ComputerName' to confirm"
    if ($confirm -ne $ComputerName) {
        Write-Log "Confirmation failed — decommission aborted"
        Write-Host "Aborted." -ForegroundColor Red
        exit 0
    }
}

# ── Look up computer in AD ────────────────────────────────────────────────────
$adComputer = Get-ADComputer -Filter "Name -eq '$ComputerName'" -Properties Description, DistinguishedName -ErrorAction SilentlyContinue

if (-not $adComputer) {
    Write-Log "Computer '$ComputerName' not found in Active Directory — may have already been removed" 'WARN'
} else {
    # ── Disable then remove computer account ──────────────────────────────────
    try {
        if (-not $DryRun) {
            Disable-ADAccount -Identity $adComputer.DistinguishedName -ErrorAction Stop
            Write-Log "Computer account '$ComputerName' disabled"

            Remove-ADComputer -Identity $adComputer.DistinguishedName -Confirm:$false -ErrorAction Stop
            Write-Log "Computer account '$ComputerName' removed from Active Directory"
        } else {
            Write-Log "[DRY RUN] Would disable and remove computer account '$ComputerName'"
        }
    } catch {
        Write-Log "FAILED to remove computer account '$ComputerName': $_" 'ERROR'
        exit 1
    }
}

# ── Update asset inventory CSV ────────────────────────────────────────────────
$inventoryPath = if ($config.assetInventoryPath) { $config.assetInventoryPath } else {
    Join-Path $config.logPath 'asset-inventory.csv'
}

$inventoryRow = [PSCustomObject]@{
    ComputerName  = $ComputerName
    AssetTag      = $AssetTag
    AssignedUser  = ''
    Status        = if ($DryRun) { 'DryRun — Decommission' } else { 'Decommissioned' }
    ProvisionedBy = $env:USERNAME
    Date          = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Notes         = $Reason
}

try {
    if (-not $DryRun) {
        $inventoryRow | Export-Csv -Path $inventoryPath -NoTypeInformation -Append -Encoding UTF8
        Write-Log "Asset inventory updated: $inventoryPath"
    } else {
        Write-Log "[DRY RUN] Would log decommission to asset inventory: $inventoryPath"
    }
} catch {
    Write-Log "Could not update asset inventory: $_" 'WARN'
}

Write-Log "=== Decommission complete for '$ComputerName' (Reason: $Reason) ==="
Write-Host "`nDecommission complete. Next steps:" -ForegroundColor Cyan
Write-Host "  1. Confirm physical device has been wiped (use manufacturer reset or DBAN)"
Write-Host "  2. Remove the device from any MDM or endpoint management console"
Write-Host "  3. Update your hardware disposal or donation records"
Write-Host "  4. Retain asset inventory log at: $inventoryPath"
exit 0
