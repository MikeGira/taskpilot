#Requires -Version 5.1

<#
.SYNOPSIS
    Generates a concise system health report: CPU, RAM, and disk usage.
    Designed to be scheduled daily and reviewed in the log.
.EXAMPLE
    .\health-check.ps1
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
$logFile = Join-Path $config.logPath 'health-check.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $entry = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] [$Level] $Message"
    Add-Content -Path $logFile -Value $entry
    Write-Host $entry
}

Write-Log "===== HEALTH CHECK: $env:COMPUTERNAME ====="

# ── CPU usage (average over 5 samples, 1s apart) ──────────────────────────────
try {
    $cpuSamples = 1..5 | ForEach-Object {
        (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction Stop).CounterSamples[0].CookedValue
        Start-Sleep -Milliseconds 200
    }
    $avgCpu = [math]::Round(($cpuSamples | Measure-Object -Average).Average, 1)
    $cpuLevel = if ($avgCpu -gt 90) { 'WARN' } elseif ($avgCpu -gt 75) { 'INFO' } else { 'INFO' }
    Write-Log "CPU: $avgCpu% avg (5 samples)" $cpuLevel
} catch {
    Write-Log "CPU check failed: $_" 'WARN'
}

# ── RAM usage ─────────────────────────────────────────────────────────────────
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    $totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
    $freeGB  = [math]::Round($os.FreePhysicalMemory   / 1MB, 1)
    $usedGB  = [math]::Round($totalGB - $freeGB, 1)
    $usedPct = [math]::Round(($usedGB / $totalGB) * 100, 1)
    $ramLevel = if ($usedPct -gt 90) { 'WARN' } else { 'INFO' }
    Write-Log "RAM: $usedGB GB used of $totalGB GB ($usedPct% used, $freeGB GB free)" $ramLevel
} catch {
    Write-Log "RAM check failed: $_" 'WARN'
}

# ── Disk usage ───────────────────────────────────────────────────────────────
foreach ($driveLetter in $config.drivesToMonitor) {
    try {
        $drive = Get-PSDrive -Name $driveLetter -ErrorAction Stop
        $totalGB  = [math]::Round(($drive.Used + $drive.Free) / 1GB, 1)
        $usedGB   = [math]::Round($drive.Used  / 1GB, 1)
        $freeGB   = [math]::Round($drive.Free  / 1GB, 1)
        $freePct  = if (($drive.Used + $drive.Free) -gt 0) {
            [math]::Round(($drive.Free / ($drive.Used + $drive.Free)) * 100, 1)
        } else { 0 }
        $diskLevel = if ($freePct -le $config.diskAlertThresholdPercent) { 'WARN' } else { 'INFO' }
        Write-Log "Disk ${driveLetter}: $usedGB/$totalGB GB used ($freePct% free)" $diskLevel
    } catch {
        Write-Log "Disk ${driveLetter}: check failed — $_" 'WARN'
    }
}

# ── Uptime ───────────────────────────────────────────────────────────────────
try {
    $uptime = (Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
    Write-Log "Uptime: $($uptime.Days)d $($uptime.Hours)h $($uptime.Minutes)m"
} catch {
    Write-Log "Uptime check failed: $_" 'WARN'
}

Write-Log "===== HEALTH CHECK COMPLETE ====="
exit 0
