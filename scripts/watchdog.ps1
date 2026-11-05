# scripts/watchdog.ps1
# Background guard process that monitors the parent terminal PID.
# When the parent terminal closes or is terminated, this watchdog automatically executes cleanup.

param(
    [Parameter(Mandatory=$true)][int]$TerminalPid,
    [Parameter(Mandatory=$true)][string]$WorkspaceRoot
)

$ErrorActionPreference = "SilentlyContinue"

try {
    $parentProcess = Get-Process -Id $TerminalPid -ErrorAction SilentlyContinue
    if ($parentProcess) {
        $parentProcess.WaitForExit()
    }
} catch {
    # If parent process is already gone or cannot be accessed
}

# Terminal has exited - trigger cleanup
$cleanupScript = Join-Path $WorkspaceRoot "scripts\cleanup.ps1"
if (Test-Path $cleanupScript) {
    & powershell.exe -ExecutionPolicy Bypass -File $cleanupScript
}

