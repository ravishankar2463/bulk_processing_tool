[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '')]
param()

# start.ps1
# Launches the Enterprise Bulk Processor in a dedicated new terminal window.
# When that terminal is closed, all backend, frontend, and docker containers are automatically brought down.

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$OrchestratorPath = Join-Path $ScriptDir "scripts\orchestrator.ps1"

Write-Host "Launching Enterprise Bulk Processor in a new terminal..." -ForegroundColor Cyan

Start-Process -FilePath "powershell.exe" `
    -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$OrchestratorPath`"" `
    -WorkingDirectory "$ScriptDir"

Write-Host "[OK] New terminal session launched. Monitoring active." -ForegroundColor Green

