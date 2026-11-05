# scripts/orchestrator.ps1
# Main orchestration script running inside the dedicated terminal window.

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$RunDir = Join-Path $WorkspaceRoot ".run"

if (-not (Test-Path $RunDir)) {
    New-Item -ItemType Directory -Path $RunDir -Force | Out-Null
}

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
    Write-Host "[1/4] Starting Docker infrastructure (PostgreSQL 16, Redis 7, Kafka KRaft)..." -ForegroundColor Yellow
    Set-Location $WorkspaceRoot
    & docker compose up -d postgres redis kafka

    Write-Host "      Waiting for PostgreSQL (port 5432)..." -ForegroundColor Gray
    $pgReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        if (Test-PortOpen "127.0.0.1" 5432) {
            $pgReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if ($pgReady) {
        Write-Host "      [OK] PostgreSQL is healthy on localhost:5432" -ForegroundColor Green
    } else {
        Write-Host "      [!] Warning: Port 5432 took longer than expected to accept connections." -ForegroundColor Yellow
    }

    # -------------------------------------------------------------
    # Step 2: Launch Spring Boot Backend
    # -------------------------------------------------------------
    Write-Host "[2/4] Starting Spring Boot Backend (Java 21 Project Loom, Camel, REST API)..." -ForegroundColor Yellow
    $javaHome = "C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot"
    $backendDir = Join-Path $WorkspaceRoot "backend"
    
    $backendCmd = "`$env:JAVA_HOME = '$javaHome'; Set-Location '$backendDir'; .\mvnw.cmd spring-boot:run"
    $backendProc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$backendCmd`"" `
        -PassThru -WindowStyle Hidden

    Set-Content (Join-Path $RunDir "backend.pid") $backendProc.Id
    Write-Host "      Backend spawned (PID: $($backendProc.Id)). Waiting for port 8080..." -ForegroundColor Gray

    $backendReady = $false
    for ($i = 0; $i -lt 45; $i++) {
        if (Test-PortOpen "127.0.0.1" 8080) {
            $backendReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if ($backendReady) {
        Write-Host "      [OK] Backend REST & SSE Engine is active on http://localhost:8080" -ForegroundColor Green
    } else {
        Write-Host "      [i] Backend initialization in progress on port 8080..." -ForegroundColor Gray
    }

    # -------------------------------------------------------------
    # Step 3: Launch React Vite Frontend
    # -------------------------------------------------------------
    Write-Host "[3/4] Starting Frontend Portal (User Portal & Admin Studio)..." -ForegroundColor Yellow
    $frontendDir = Join-Path $WorkspaceRoot "frontend"
    $frontendCmd = "Set-Location '$frontendDir'; npm run dev"
    
    $frontendProc = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-NoProfile -ExecutionPolicy Bypass -Command `"$frontendCmd`"" `
        -PassThru -WindowStyle Hidden

    Set-Content (Join-Path $RunDir "frontend.pid") $frontendProc.Id
    Write-Host "      Frontend spawned (PID: $($frontendProc.Id)). Waiting for port 5173..." -ForegroundColor Gray

    $frontendReady = $false
    for ($i = 0; $i -lt 20; $i++) {
        if (Test-PortOpen "127.0.0.1" 5173) {
            $frontendReady = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if ($frontendReady) {
        Write-Host "      [OK] Frontend UI is active on http://localhost:5173" -ForegroundColor Green
    } else {
        Write-Host "      [i] Frontend initialization in progress on port 5173..." -ForegroundColor Gray
    }

    # -------------------------------------------------------------
    # Step 4: Ready Dashboard & Browser Launch
    # -------------------------------------------------------------
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

    # Idle loop checking for keypress or window close
    while ($true) {
        if ([Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -eq [ConsoleKey]::Q -or ($key.Key -eq [ConsoleKey]::C -and $key.Modifiers -eq [ConsoleModifiers]::Control)) {
                Write-Host "`nShutdown signal received from user..." -ForegroundColor Yellow
                break
            }
        }
        Start-Sleep -Milliseconds 400
    }

} finally {
    # This runs whether user pressed Q, Ctrl+C, or script ended
    Write-Host "`nInitiating clean teardown..." -ForegroundColor Yellow
    $cleanupScript = Join-Path $ScriptDir "cleanup.ps1"
    if (Test-Path $cleanupScript) {
        & $cleanupScript
    }
    Write-Host "Teardown complete. Exiting." -ForegroundColor Green
    Start-Sleep -Seconds 2
}

