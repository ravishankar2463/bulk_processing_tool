# SRE Incident Runbook: HighHttpErrorRate5xx
**Severity**: HIGH  
**Alert Condition**: `rate(5xx requests) / rate(total requests) * 100 > 5%` sustained for 1 minute  
**Impact**: Users experiencing request failures, uploads failing, or pipeline crashes.

---

## 1. Immediate Diagnostic Steps
1. Open Grafana Dashboard: `http://localhost:3000/d/bp-error-diagnostics`
2. Check the **Centralized Error & Exception Log Stream (Loki)** panel to see the most recent stack traces.
3. Query Loki for recent exceptions:
   ```logql
   {app="bulk-processing-tool"} | json | level="ERROR"
   ```
4. Find the offending endpoint in the **Failed API Endpoints Breakdown** panel.

## 2. Common Causes & Mitigations
- **Step Execution Failure in User-Defined Scripts**: If users uploaded malformed CSVs or script syntax errors in Janino compiler, inspect the Dead Letter Queue (DLQ) in Admin Studio (`/admin/dlq`).
- **PostgreSQL Lock Contention**: Check Grafana Dashboard 03 (**Database & HikariCP Pool**). If pending connections are spiking, investigate slow queries or long-running transactions.
- **Kafka / Camel Broker Delays**: Verify Kafka broker health (`docker compose ps kafka`).

## 3. Resolution Verification
- Confirm that 5xx error rate drops below 1% in Grafana Dashboard 01.
- Verify resolution event in Alertmanager.
