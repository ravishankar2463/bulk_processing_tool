# SRE Incident Runbook: ApplicationDown
**Severity**: CRITICAL  
**Alert Condition**: `up{job="bulk-processing-engine"} == 0` for > 15 seconds  
**Impact**: Bulk processing APIs unavailable; scheduled routes paused; web portals offline.

---

## 1. Immediate Triage & Escalation
1. Check process status on the host / container:
   ```powershell
   Get-Process -Name "*java*" | Select-Object Id, ProcessName, WorkingSet64, StartTime
   ```
2. Verify port 8080 binding:
   ```powershell
   netstat -ano | Select-String ":8080\s+.*LISTENING"
   ```
3. Inspect the tail of the backend log:
   ```powershell
   Get-Content .run/backend.log -Tail 50
   ```

## 2. Common Root Causes & Recovery Steps

### Scenario A: OutOfMemoryError (OOM) / JVM Crash
- **Symptoms**: Process vanished, `backend.pid` points to non-existent process, hs_err_pid log generated.
- **Action**: Check for `hs_err_pid*.log` or heap dump in workspace root.
- **Immediate Recovery**:
  Restart backend via orchestrator or:
  ```powershell
  .\scripts\orchestrator.ps1
  ```

### Scenario B: Database Connection Refused (PostgreSQL down)
- **Symptoms**: `backend.log` contains `Connection to localhost:5432 refused` or `HikariPool-1 - Exception during pool initialization`.
- **Action**:
  ```powershell
  docker compose ps postgres
  docker compose restart postgres
  ```

### Scenario C: Port Conflict
- **Symptoms**: `Port 8080 was already in use`.
- **Action**: Run `.\scripts\cleanup.ps1` to cleanly terminate orphaned listeners, then restart.

---

## 3. Post-Incident Verification
1. Verify `/actuator/health` returns `{"status":"UP"}`:
   ```powershell
   curl.exe -s http://localhost:8080/actuator/health
   ```
2. Confirm alert resolution in Alertmanager at `http://localhost:9093`.
