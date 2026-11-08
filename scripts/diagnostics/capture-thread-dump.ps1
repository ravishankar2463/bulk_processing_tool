# scripts/diagnostics/capture-thread-dump.ps1
# Captures a complete thread dump including Project Loom virtual threads and deadlocks.

param (
    [string]$Filename = "thread-dump-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
)

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$RunDir = Join-Path $WorkspaceRoot ".run"
$OutputDir = Join-Path $WorkspaceRoot "diagnostics-output"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$OutputPath = Join-Path $OutputDir $Filename

# Locate Java PID
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

Write-Host "Capturing Java 21 Thread Dump (including Loom virtual threads) for PID $targetPid..." -ForegroundColor Yellow
& jcmd.exe $targetPid Thread.dump_to_file -format=json $OutputPath 2>$null

if (-not (Test-Path $OutputPath) -or (Get-Item $OutputPath).Length -eq 0) {
    # Fallback to standard plain text dump
    & jcmd.exe $targetPid Thread.print > $OutputPath
}

Write-Host "[SUCCESS] Thread dump written to: $OutputPath" -ForegroundColor Green
