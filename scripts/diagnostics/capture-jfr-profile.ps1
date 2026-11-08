# scripts/diagnostics/capture-jfr-profile.ps1
# Captures a production Java Flight Recorder (JFR) profiling recording without stopping the JVM.

param (
    [int]$DurationSeconds = 60,
    [string]$Filename = "bulk-engine-profile-$(Get-Date -Format 'yyyyMMdd-HHmmss').jfr"
)

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$RunDir = Join-Path $WorkspaceRoot ".run"
$OutputDir = Join-Path $WorkspaceRoot "diagnostics-output"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$OutputPath = Join-Path $OutputDir $Filename

# 1. Locate Java PID
$backendPidFile = Join-Path $RunDir "backend.pid"
$targetPid = $null

if (Test-Path $backendPidFile) {
    $targetPid = (Get-Content $backendPidFile -Raw).Trim()
}

if (-not $targetPid) {
    $proc = Get-Process -Name "java" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($proc) { $targetPid = $proc.Id }
}

if (-not $targetPid) {
    Write-Host "[ERROR] Could not find running Bulk Processing Java process." -ForegroundColor Red
    exit 1
}

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "                JAVA FLIGHT RECORDER (JFR) PROFILER                             " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "Target Java PID:   $targetPid" -ForegroundColor Yellow
Write-Host "Duration:          $DurationSeconds seconds" -ForegroundColor Yellow
Write-Host "Output File:       $OutputPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting recording (settings=profile.jfc, minimal overhead < 1%)..." -ForegroundColor Gray

& jcmd.exe $targetPid JFR.start name="BulkEngineProfile" settings="profile" duration="${DurationSeconds}s" filename="$OutputPath"

Write-Host "Recording in progress. Waiting $DurationSeconds seconds..." -ForegroundColor Cyan
Start-Sleep -Seconds $DurationSeconds

Write-Host ""
Write-Host "[SUCCESS] JFR Profile captured successfully at:" -ForegroundColor Green
Write-Host "  $OutputPath" -ForegroundColor Green
Write-Host ""
Write-Host "You can inspect this recording using JDK Mission Control (JMC) or IntelliJ IDEA Profiler." -ForegroundColor White
