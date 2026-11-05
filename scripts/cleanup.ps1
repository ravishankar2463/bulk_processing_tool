# scripts/cleanup.ps1
# Idempotent cleanup script to terminate backend, frontend, and bring down docker containers.

$ErrorActionPreference = "SilentlyContinue"
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$RunDir = Join-Path $WorkspaceRoot ".run"

Write-Host "Stopping services and cleaning up resources..." -ForegroundColor Yellow

# 0. Terminate any running watchdog processes
try {
    Get-CimInstance Win32_Process -Filter "CommandLine LIKE '%watchdog%'" -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.ProcessId -ne $PID) {
            & taskkill.exe /PID $_.ProcessId /T /F 2>$null | Out-Null
        }
    }
} catch {}

# 1. Kill backend process tree
$BackendPidFile = Join-Path $RunDir "backend.pid"
if (Test-Path $BackendPidFile) {
    $bPid = Get-Content $BackendPidFile -Raw
    if ($bPid -match '^\d+$') {
        Write-Host "  Stopping Backend (PID: $bPid)..." -ForegroundColor Gray
        & taskkill.exe /PID $bPid /T /F 2>$null | Out-Null
    }
    Remove-Item $BackendPidFile -Force -ErrorAction SilentlyContinue
}

# 2. Kill frontend process tree
$FrontendPidFile = Join-Path $RunDir "frontend.pid"
if (Test-Path $FrontendPidFile) {
    $fPid = Get-Content $FrontendPidFile -Raw
    if ($fPid -match '^\d+$') {
        Write-Host "  Stopping Frontend (PID: $fPid)..." -ForegroundColor Gray
        & taskkill.exe /PID $fPid /T /F 2>$null | Out-Null
    }
    Remove-Item $FrontendPidFile -Force -ErrorAction SilentlyContinue
}

# 3. Kill any remaining processes listening on ports 8080 and 5173
$targetPorts = @(8080, 5173)
foreach ($port in $targetPorts) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $pId = $conn.OwningProcess
            if ($pId -gt 0 -and $pId -ne $PID) {
                Write-Host "  Terminating remaining process on port $port (PID: $pId)..." -ForegroundColor Gray
                & taskkill.exe /PID $pId /T /F 2>$null | Out-Null
            }
        }
    } catch {
        # ignore
    }
}

# 4. Bring down Docker containers
Write-Host "  Bringing down Docker containers (postgres, redis, kafka)..." -ForegroundColor Gray
Set-Location $WorkspaceRoot
& docker compose down 2>$null | Out-Null

# 5. Clean up lockfiles
Remove-Item (Join-Path $RunDir "terminal.pid") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $RunDir "run-backend.ps1") -Force -ErrorAction SilentlyContinue
Remove-Item (Join-Path $RunDir "run-frontend.ps1") -Force -ErrorAction SilentlyContinue

Write-Host "All services stopped and infrastructure brought down." -ForegroundColor Green

