# scripts/watchdog.ps1
# Background guard process that monitors the parent terminal PID.
# When the parent terminal closes or is terminated, this watchdog automatically executes cleanup.

param(
    [Parameter(Mandatory=$true)][int]$TerminalPid,
    [Parameter(Mandatory=$true)][string]$WorkspaceRoot
)

$ErrorActionPreference = "SilentlyContinue"

$RunDir = Join-Path $WorkspaceRoot ".run"
$watchdogLog = Join-Path $RunDir "watchdog.log"
"Watchdog started for TerminalPid $TerminalPid at $(Get-Date)" | Out-File $watchdogLog -Append

# 1. Acquire reference to the parent terminal process with retries
$parentProcess = $null
for ($i = 0; $i -lt 10; $i++) {
    $parentProcess = Get-Process -Id $TerminalPid -ErrorAction SilentlyContinue
    if ($parentProcess) { break }
    Start-Sleep -Milliseconds 500
}

if (-not $parentProcess) {
    "Failed to find process $TerminalPid after retries. Aborting watchdog without cleanup." | Out-File $watchdogLog -Append
    exit 0
}

"Found process $TerminalPid ($($parentProcess.ProcessName)). Waiting for termination..." | Out-File $watchdogLog -Append

# 2. Wait until parent process terminates
try {
    $parentProcess.WaitForExit()
    "Process $TerminalPid has exited. Initiating cleanup at $(Get-Date)" | Out-File $watchdogLog -Append
} catch {
    "Error waiting for process ${TerminalPid}: $_" | Out-File $watchdogLog -Append
}

# 3. Terminal has genuinely exited - trigger cleanup
$cleanupScript = Join-Path $WorkspaceRoot "scripts\cleanup.ps1"
if (Test-Path $cleanupScript) {
    & powershell.exe -ExecutionPolicy Bypass -File $cleanupScript
}
"Watchdog completed." | Out-File $watchdogLog -Append

