# scripts/start-observability.ps1
# Starts the Enterprise Observability Stack (Prometheus, Grafana, Loki, Tempo, OpenTelemetry Collector, Alertmanager, Node Exporter)

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$WorkspaceRoot = Split-Path -Parent $ScriptDir
$ObservabilityCompose = Join-Path $WorkspaceRoot "observability\docker-compose.observability.yml"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "         STARTING ENTERPRISE OBSERVABILITY & MONITORING ECOSYSTEM              " -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

Set-Location $WorkspaceRoot
& docker compose -f $ObservabilityCompose up -d

Write-Host ""
Write-Host "Observability Services Active:" -ForegroundColor Green
Write-Host "  > Grafana Dashboards:      http://localhost:3000 (User: admin / Pass: admin)" -ForegroundColor Cyan
Write-Host "  > Prometheus Engine:       http://localhost:9090" -ForegroundColor Cyan
Write-Host "  > Alertmanager UI:         http://localhost:9093" -ForegroundColor Cyan
Write-Host "  > Loki Log Aggregator:     http://localhost:3100" -ForegroundColor Cyan
Write-Host "  > Tempo Trace Engine:      http://localhost:3200" -ForegroundColor Cyan
Write-Host "  > OpenTelemetry Collector: localhost:4317 (gRPC) / localhost:4318 (HTTP)" -ForegroundColor Cyan
Write-Host "  > Node Exporter:           http://localhost:9100/metrics" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Green
