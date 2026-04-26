#Requires -Version 5.1

<#
.SYNOPSIS
    Clears common temp folders and logs a warning if any monitored drive falls below the threshold.
.EXAMPLE
    .\disk-cleanup.ps1
#>

[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# ── Load config ───────────────────────────────────────────────────────────────
$configPath = Join-Path $PSScriptRoot 'config.json'
if (-not (Test-Path $configPath)) { Write-Error "config.json not found"; exit 1 }
$config = Get-Content -Raw $configPath | ConvertFrom-Json

if (-not (Test-Path $config.logPath)) {
    New-Item -ItemType Directory -Path $config.logPath -Force | Out-Null
}
$logFile = Join-Path $config.logPath 'disk-cleanup.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    Write-Host $entry
}

# ── Folders to clean ─────────────────────────────────────────────────────────
$cleanTargets = @(
    $env:TEMP,
    'C:\Windows\Temp',
    'C:\Windows\Prefetch'
)

Write-Log "=== Disk Cleanup Started ==="

foreach ($target in $cleanTargets) {
    if (-not $target -or -not (Test-Path $target)) { continue }
    try {
        $items = Get-ChildItem $target -Recurse -Force -ErrorAction SilentlyContinue
        $count = 0
        foreach ($item in $items) {
            try { Remove-Item $item.FullName -Force -Recurse -ErrorAction Stop; $count++ } catch { }
        }
        Write-Log "Cleaned '$target' — $count items removed"
    } catch {
        Write-Log "Could not clean '$target': $_" 'WARN'
    }
}

# ── Old log rotation ──────────────────────────────────────────────────────────
if ($config.maxLogAgeDays -gt 0) {
    $cutoff = (Get-Date).AddDays(-$config.maxLogAgeDays)
    Get-ChildItem $config.logPath -Filter '*.log' -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoff } |
        ForEach-Object { Remove-Item $_.FullName -Force; Write-Log "Rotated old log: $($_.Name)" }
}

# ── Disk space check ─────────────────────────────────────────────────────────
$threshold = $config.diskAlertThresholdPercent

foreach ($driveLetter in $config.drivesToMonitor) {
    $drive = Get-PSDrive -Name $driveLetter -ErrorAction SilentlyContinue
    if (-not $drive) {
        Write-Log "Drive $driveLetter`: not found — skipping" 'WARN'
        continue
    }

    $totalGB  = [math]::Round(($drive.Used + $drive.Free) / 1GB, 1)
    $freeGB   = [math]::Round($drive.Free / 1GB, 1)
    $freePercent = if (($drive.Used + $drive.Free) -gt 0) {
        [math]::Round(($drive.Free / ($drive.Used + $drive.Free)) * 100, 1)
    } else { 0 }

    if ($freePercent -le $threshold) {
        Write-Log "⚠ ALERT: Drive ${driveLetter}: is at $freePercent% free ($freeGB GB of $totalGB GB). Threshold: $threshold%" 'WARN'
    } else {
        Write-Log "Drive ${driveLetter}: OK — $freePercent% free ($freeGB GB of $totalGB GB)"
    }
}

Write-Log "=== Disk Cleanup Completed ==="
exit 0
