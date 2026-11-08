# SRE Incident Runbook: DatabaseConnectionPoolExhaustion
**Severity**: CRITICAL  
**Alert Condition**: `(hikaricp_connections_active / hikaricp_connections_max) * 100 > 90` for > 45 seconds  
**Impact**: Application threads blocked awaiting database connections, causing cascading timeouts across all REST endpoints.

---

## 1. Immediate Diagnostic Steps
1. Open Grafana Dashboard: `http://localhost:3000/d/bp-database-hikaricp`
2. Check `Pending Threads Awaiting Connection` metric. If > 0, callers are queuing.
3. Check PostgreSQL active queries directly:
   ```powershell
   docker exec -it bulk_processor_postgres psql -U bulk_user -d bulk_processing_db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
   ```

## 2. Common Root Causes & Immediate Fixes
- **Unindexed / Slow Query**: If a query is stuck on table scans, identify the PID and terminate it if blocking the system:
  ```sql
  SELECT pg_terminate_backend(<pid>);
  ```
- **Connection Leak in Virtual Threads**: Ensure virtual threads complete repository operations within bounded transactional scopes.
- **Pool Sizing Under-allocated**: If traffic increased, scale `spring.datasource.hikari.maximum-pool-size` in `application.yml` from 10 to 30.

## 3. Resolution Verification
- Confirm pool saturation drops below 50% in Grafana.
- Verify pending connection threads drop to 0.
