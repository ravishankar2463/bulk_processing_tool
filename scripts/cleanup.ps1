# scripts/cleanup.ps1
# Comprehensive, idempotent cleanup script to terminate all backend, frontend, watchdog,
# and port-listener instances, and bring down Docker containers.

$ErrorActionPreference = "SilentlyContinue"

# -------------------------------------------------------------
# 1. Resolve Workspace Root Reliably
# -------------------------------------------------------------
$WorkspaceRoot = $null
if ($PSScriptRoot) {
    if (Test-Path (Join-Path $PSScriptRoot "..\package.json")) {
        $WorkspaceRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    }
    elseif (Test-Path (Join-Path $PSScriptRoot "package.json")) {
        $WorkspaceRoot = (Resolve-Path $PSScriptRoot).Path
    }
}

if (-not $WorkspaceRoot) {
    $current = (Get-Location).Path
    if (Test-Path (Join-Path $current "scripts\cleanup.ps1")) {
        $WorkspaceRoot = $current
    }
    elseif (Test-Path (Join-Path $current "..\scripts\cleanup.ps1")) {
        $WorkspaceRoot = (Resolve-Path (Join-Path $current "..")).Path
    }
    else {
        $WorkspaceRoot = $current
    }
}

$RunDir = Join-Path $WorkspaceRoot ".run"

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "       STOPPING ALL BULK PROCESSOR INSTANCES & CLEANING UP           " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "Workspace Root: $WorkspaceRoot" -ForegroundColor Gray

# Helper to kill a process and its children aggressively
function Kill-ProcessTree([int]$targetPid, [string]$label = "") {
    if ($targetPid -le 0 -or $targetPid -eq $PID) { return }
    try {
        $proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
        if ($proc) {
            $name = $proc.ProcessName
            Write-Host "  Terminating $label (PID: $targetPid, Name: $name)..." -ForegroundColor Yellow
            & taskkill.exe /PID $targetPid /T /F 2>$null | Out-Null
            Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
        }
    }
    catch {}
}

# -------------------------------------------------------------
# 2. Terminate Running Watchdogs and Runner Wrappers
# -------------------------------------------------------------
try {
    $watchdogs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $cmd = $_.CommandLine
        if (-not $cmd) { return $false }
        return ($cmd -match "watchdog\.ps1" -or $cmd -match "run-frontend\.ps1" -or $cmd -match "run-backend\.ps1") -and ($_.ProcessId -ne $PID)
    }
    foreach ($w in $watchdogs) {
        Kill-ProcessTree $w.ProcessId "Watchdog/Runner"
    }
}
catch {}

# -------------------------------------------------------------
# 3. Kill Processes from PID Files
# -------------------------------------------------------------
$pidFiles = @("backend.pid", "frontend.pid", "terminal.pid")
foreach ($pf in $pidFiles) {
    $fullPath = Join-Path $RunDir $pf
    if (Test-Path $fullPath) {
        try {
            $savedPid = (Get-Content $fullPath -Raw -ErrorAction SilentlyContinue).Trim()
            if ($savedPid -match '^\d+$') {
                Kill-ProcessTree ([int]$savedPid) "Saved PID ($pf)"
            }
        }
        catch {}
        Remove-Item $fullPath -Force -ErrorAction SilentlyContinue
    }
}

# -------------------------------------------------------------
# 4. Terminate Any Processes Listening on Ports (5173, 5174, 5175, 8080)
# -------------------------------------------------------------
$targetPorts = @(5173, 5174, 5175, 8080)
foreach ($port in $targetPorts) {
    # Strategy A: Get-NetTCPConnection (PowerShell NetTCPIP)
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        foreach ($conn in $connections) {
            $listenerProcessId = $conn.OwningProcess
            if ($listenerProcessId -gt 0 -and $listenerProcessId -ne $PID) {
                Kill-ProcessTree $listenerProcessId "Port $port listener (Get-NetTCPConnection)"
            }
        }
    }
    catch {}

    # Strategy B: netstat -ano fallback (Universal across all Windows versions & permissions)
    try {
        $lines = netstat.exe -ano | Select-String ":$port\s+"
        foreach ($line in $lines) {
            $parts = ($line.ToString().Trim() -split '\s+')
            if ($parts.Length -ge 5) {
                $pIdStr = $parts[-1]
                if ($pIdStr -match '^\d+$') {
                    $listenerProcessId = [int]$pIdStr
                    if ($listenerProcessId -gt 0 -and $listenerProcessId -ne $PID) {
                        Kill-ProcessTree $listenerProcessId "Port $port listener (netstat)"
                    }
                }
            }
        }
    }
    catch {}
}

# -------------------------------------------------------------
# 5. Terminate Any Lingering Project-Specific Node & Java Processes
# -------------------------------------------------------------
try {
    $projectProcs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $cmd = $_.CommandLine
        if (-not $cmd) { return $false }
        $isProjectNode = ($_.Name -eq "node.exe" -and ($cmd -match "bulk_processing_tool" -or $cmd -match "vite" -or $cmd -match "webapp"))
        $isProjectJava = ($_.Name -eq "java.exe" -and ($cmd -match "bulkprocessor" -or $cmd -match "bulk_processing_tool" -or $cmd -match "spring-boot:run"))
        return ($isProjectNode -or $isProjectJava) -and ($_.ProcessId -ne $PID)
    }
    foreach ($p in $projectProcs) {
        Kill-ProcessTree $p.ProcessId "Lingering project process ($($p.Name))"
    }
}
catch {}

# -------------------------------------------------------------
# 6. Bring Down Docker Containers
# -------------------------------------------------------------
Write-Host "Bringing down Docker containers (PostgreSQL, Redis, Kafka)..." -ForegroundColor Gray
try {
    Push-Location $WorkspaceRoot
    & docker compose down 2>$null | Out-Null
    & docker compose -f observability/docker-compose.observability.yml down 2>$null | Out-Null
    Pop-Location
}
catch {}

# -------------------------------------------------------------
# 7. Clean Up Lockfiles and Temporary Scripts
# -------------------------------------------------------------
if (Test-Path $RunDir) {
    Remove-Item (Join-Path $RunDir "*.pid") -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $RunDir "run-*.ps1") -Force -ErrorAction SilentlyContinue
}

# -------------------------------------------------------------
# 8. Post-Verification Check
# -------------------------------------------------------------
$remainingListeners = @()
foreach ($port in @(5173, 8080)) {
    $check = netstat.exe -ano | Select-String ":$port\s+.*LISTENING"
    if ($check) {
        $remainingListeners += $port
    }
}

Write-Host ""
if ($remainingListeners.Count -gt 0) {
    Write-Host "[WARNING] Active listeners still detected on ports: $($remainingListeners -join ', ')" -ForegroundColor Red
}
else {
    Write-Host "[SUCCESS] All instances terminated. Ports 5173 and 8080 are completely closed." -ForegroundColor Green
    Write-Host "UI on http://localhost:5173/ is offline." -ForegroundColor Green
}
Write-Host "=====================================================================" -ForegroundColor Cyan
