# scripts/orchestrator.ps1
# Main orchestration script running inside the dedicated terminal window.

$ErrorActionPreference = "Continue"
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$RunDir = Join-Path $WorkspaceRoot ".run"

if (-not (Test-Path $RunDir)) {
    New-Item -ItemType Directory -Path $RunDir -Force | Out-Null
}

$traceLog = Join-Path $RunDir "orchestrator-trace.log"
"--- NEW ORCHESTRATOR RUN PID $PID at $(Get-Date) ---" | Out-File $traceLog -Append
function Log-Trace([string]$msg) { "$msg at $(Get-Date -Format 'HH:mm:ss.fff')" | Out-File $traceLog -Append }
Log-Trace "Script start"

# 1. Configure Terminal Window
try {
    $host.UI.RawUI.WindowTitle = "Enterprise Bulk Processor - Runtime Console"
} catch {}

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "             ENTERPRISE BULK PROCESSING ENGINE - RUNTIME CONSOLE                " -ForegroundColor Cyan
Write-Host "     Dual Web Portals (Admin & User) | Java 21 Project Loom | Kafka | Camel     " -ForegroundColor DarkCyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# 2. Record Terminal PID and Start Background Guard/Watchdog
Set-Content (Join-Path $RunDir "terminal.pid") $PID
$watchdogScript = Join-Path $ScriptDir "watchdog.ps1"
Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$watchdogScript`" -TerminalPid $PID -WorkspaceRoot `"$WorkspaceRoot`"" `
    -WindowStyle Hidden | Out-Null

function Test-PortOpen([string]$server, [int]$port) {
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $iar = $tcpClient.BeginConnect($server, $port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(600, $false)
        if ($wait -and $tcpClient.Connected) {
            $tcpClient.EndConnect($iar)
            $tcpClient.Close()
            return $true
        }
        $tcpClient.Close()
        return $false
    } catch {
        return $false
    }
}

try {
    # -------------------------------------------------------------
    # Step 1: Start Docker Infrastructure
    # -------------------------------------------------------------
    Log-Trace "Step 1: Starting docker compose"
    Write-Host "[1/4] Starting Docker infrastructure (PostgreSQL 16, Redis 7, Kafka KRaft)..." -ForegroundColor Yellow
    Set-Location $WorkspaceRoot
    & docker compose up -d postgres redis kafka
    Log-Trace "Step 1: Docker compose returned exitcode $LASTEXITCODE"

    Write-Host "      Waiting for PostgreSQL (port 5432)..." -ForegroundColor Gray
    $pgReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-PortOpen "127.0.0.1" 5432) {
            $pgReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    Log-Trace "Step 1: Port 5432 ready = $pgReady"
    if ($pgReady) {
        Write-Host "      [OK] PostgreSQL is healthy on localhost:5432" -ForegroundColor Green
    } else {
        Write-Host "      [!] Warning: Port 5432 took longer than expected to accept connections." -ForegroundColor Yellow
    }

    # -------------------------------------------------------------
    # Step 2: Launch Spring Boot Backend
    # -------------------------------------------------------------
    Log-Trace "Step 2: Preparing backend runner"
    Write-Host "[2/4] Starting Spring Boot Backend (Java 21 Project Loom, Camel, REST API)..." -ForegroundColor Yellow
    $javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
    $backendDir = Join-Path $WorkspaceRoot "backend"
    $backendLog = Join-Path $RunDir "backend.log"
    $backendRunner = Join-Path $RunDir "run-backend.ps1"
    if (Test-Path $backendLog) { Remove-Item $backendLog -Force -ErrorAction SilentlyContinue }
    
    $backendScriptContent = "`$env:JAVA_HOME = '$javaHome'`nSet-Location '$backendDir'`n.\mvnw.cmd spring-boot:run *> '$backendLog'"
    Set-Content -Path $backendRunner -Value $backendScriptContent -Force

    Log-Trace "Step 2: Spawning backend process"
    $backendProc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$backendRunner`"" `
        -PassThru -WindowStyle Hidden

    Set-Content (Join-Path $RunDir "backend.pid") $backendProc.Id
    Log-Trace "Step 2: Backend spawned with PID $($backendProc.Id)"
    Write-Host "      Backend spawned (PID: $($backendProc.Id)). Waiting for port 8080..." -ForegroundColor Gray

    $backendReady = $false
    for ($i = 0; $i -lt 55; $i++) {
        if (Test-PortOpen "127.0.0.1" 8080) {
            $backendReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    Log-Trace "Step 2: Backend port 8080 ready = $backendReady"
    if ($backendReady) {
        Write-Host "      [OK] Backend REST & SSE Engine is active on http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "      [!] Backend took longer than expected to bind to port 8080." -ForegroundColor Red
        if (Test-Path $backendLog) {
            Get-Content $backendLog -Tail 15 | ForEach-Object { Write-Host "          $_" -ForegroundColor DarkYellow }
        }
    }

    # -------------------------------------------------------------
    # Step 3: Launch React Vite Frontend
    # -------------------------------------------------------------
    Write-Host "[3/4] Starting Frontend Portal (User Portal & Admin Studio)..." -ForegroundColor Yellow
    $frontendDir = Join-Path $WorkspaceRoot "frontend"
    $frontendLog = Join-Path $RunDir "frontend.log"
    $frontendRunner = Join-Path $RunDir "run-frontend.ps1"
    if (Test-Path $frontendLog) { Remove-Item $frontendLog -Force -ErrorAction SilentlyContinue }
    
    $frontendScriptContent = "Set-Location '$frontendDir'`nnpm run dev *> '$frontendLog'"
    Set-Content -Path $frontendRunner -Value $frontendScriptContent -Force

    Log-Trace "Step 3: Spawning frontend process"
    $frontendProc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$frontendRunner`"" `
        -PassThru -WindowStyle Hidden

    Set-Content (Join-Path $RunDir "frontend.pid") $frontendProc.Id
    Log-Trace "Step 3: Frontend spawned with PID $($frontendProc.Id)"
    Write-Host "      Frontend spawned (PID: $($frontendProc.Id)). Waiting for port 5173..." -ForegroundColor Gray

    $frontendReady = $false
    for ($i = 0; $i -lt 25; $i++) {
        if (Test-PortOpen "127.0.0.1" 5173) {
            $frontendReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    Log-Trace "Step 3: Frontend port 5173 ready = $frontendReady"
    if ($frontendReady) {
        Write-Host "      [OK] Frontend UI is active on http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "      [!] Frontend took longer than expected to bind to port 5173." -ForegroundColor Red
        if (Test-Path $frontendLog) {
            Get-Content $frontendLog -Tail 15 | ForEach-Object { Write-Host "          $_" -ForegroundColor DarkYellow }
        }
    }

    # -------------------------------------------------------------
    # Step 4: Ready Dashboard & Browser Launch
    # -------------------------------------------------------------
    Log-Trace "Step 4: All services ready"
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "                     ALL SERVICES ARE LIVE AND RUNNING!                         " -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "  > User Portal:            http://localhost:5173" -ForegroundColor Cyan
    Write-Host "  > Admin Studio:           http://localhost:5173 (Select 'Admin Studio' Tab)" -ForegroundColor Cyan
    Write-Host "  > Backend REST & SSE API: http://localhost:8080/api/v1" -ForegroundColor Cyan
    Write-Host "  > PostgreSQL:             localhost:5432 (Database: bulk_processing_db)" -ForegroundColor DarkGray
    Write-Host "  > Redis Cache:            localhost:6379" -ForegroundColor DarkGray
    Write-Host "  > Kafka Broker:           localhost:9092" -ForegroundColor DarkGray
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host ""

    # Open default web browser to the portal
    try {
        Start-Process "http://localhost:5173"
    } catch {}

    Write-Host "Terminal is monitoring all services." -ForegroundColor White
    Write-Host "To stop everything and bring down all infrastructure:" -ForegroundColor Yellow
    Write-Host "  - Press 'Q' or Ctrl+C in this terminal, OR" -ForegroundColor Yellow
    Write-Host "  - Simply CLOSE this window (the background watchdog will clean up everything)" -ForegroundColor Yellow
    Write-Host ""

    Log-Trace "Entering monitoring loop"
    # Idle loop checking for keypress or window close
    while ($true) {
        try {
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                if ($key.Key -eq [ConsoleKey]::Q -or ($key.Key -eq [ConsoleKey]::C -and $key.Modifiers -eq [ConsoleModifiers]::Control)) {
                    Write-Host "`nShutdown signal received from user..." -ForegroundColor Yellow
                    Log-Trace "User pressed Q or Ctrl+C"
                    break
                }
            }
        } catch {
            # In case console input is not attached or redirected
        }
        Start-Sleep -Milliseconds 500
    }

} catch {
    Log-Trace "CRITICAL EXCEPTION: $_"
    Write-Host "`n[CRITICAL ERROR] Orchestrator encountered an exception: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkRed
    $_ | Out-File (Join-Path $RunDir "orchestrator-error.log") -Force
    Start-Sleep -Seconds 10
} finally {
    Log-Trace "Finally block entered, starting cleanup"
    # This runs whether user pressed Q, Ctrl+C, or script ended
    Write-Host "`nInitiating clean teardown..." -ForegroundColor Yellow
    $cleanupScript = Join-Path $ScriptDir "cleanup.ps1"
    if (Test-Path $cleanupScript) {
        & $cleanupScript
    }
    Write-Host "Teardown complete. Exiting." -ForegroundColor Green
    Start-Sleep -Seconds 2
}

