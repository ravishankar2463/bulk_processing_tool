# scripts/stop-observability.ps1
# Stops the Enterprise Observability Stack

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ObservabilityCompose = Join-Path $WorkspaceRoot "observability\docker-compose.observability.yml"

Write-Host "Stopping Enterprise Observability Stack..." -ForegroundColor Yellow
Set-Location $WorkspaceRoot
& docker compose -f $ObservabilityCompose down

Write-Host "[OK] Observability stack stopped." -ForegroundColor Green
