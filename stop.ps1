# stop.ps1
# Manual teardown script to bring down backend, frontend, and all Docker containers.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CleanupScript = Join-Path $ScriptDir "scripts\cleanup.ps1"

& $CleanupScript

