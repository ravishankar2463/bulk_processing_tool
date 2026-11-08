/**
 * k6 Enterprise Performance & Load Test Suite for Bulk Processing Tool.
 * Validates RED metrics (Rate, Errors, Duration) under concurrent user pressure.
 * 
 * Execution:
 *   k6 run scripts/load-tests/bulk_processing_perf.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metric trends for Prometheus & SRE validation
const errorRate = new Rate('custom_error_rate');
const catalogDuration = new Trend('catalog_request_duration');
const uploadDuration = new Trend('upload_request_duration');
const healthDuration = new Trend('health_request_duration');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 50 },   // Sustained normal load at 50 users
    { duration: '30s', target: 100 }, // Peak spike load at 100 users
    { duration: '30s', target: 0 },   // Clean ramp-down
  ],
  thresholds: {
    // SLO: 99% of requests must succeed
    'http_req_failed': ['rate<0.01'],
    // SLO: P95 latency must be under 800ms
    'http_req_duration': ['p(95)<800', 'p(99)<1500'],
    'custom_error_rate': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';

// Sample CSV payload for batch upload
const SAMPLE_CSV = `customerId,firstName,lastName,email,annualSpend,riskScore
CUST-001,John,Doe,john.doe@example.com,15420.50,12
CUST-002,Jane,Smith,jane.smith@example.com,8900.00,8
CUST-003,Robert,Johnson,robert.j@example.com,23400.75,25
CUST-004,Alice,Williams,alice.w@example.com,4500.20,5
CUST-005,Michael,Brown,michael.b@example.com,67800.00,42
`;

export default function () {
  const traceId = 'k6-' + Math.random().toString(36).substring(2, 18);
  const headers = {
    'traceparent': `00-${traceId.padEnd(32, '0')}-00f067aa0ba902b7-01`,
    'X-Request-Id': `k6-req-${__VU}-${__ITER}`,
    'Accept': 'application/json',
  };

  // 1. Health check probe
  const healthRes = http.get(`${BASE_URL}/actuator/health`, { headers });
  healthDuration.add(healthRes.timings.duration);
  const healthOk = check(healthRes, {
    'health check returns 200': (r) => r.status === 200,
    'health check reports UP': (r) => r.body && r.body.includes('UP'),
  });
  errorRate.add(!healthOk);

  sleep(0.2);

  // 2. Process Catalog Hub poll
  const catalogRes = http.get(`${BASE_URL}/api/v1/routes/catalog`, { headers });
  catalogDuration.add(catalogRes.timings.duration);
  const catalogOk = check(catalogRes, {
    'catalog returns 200': (r) => r.status === 200,
    'catalog contains routes': (r) => r.body && r.body.includes('routeId'),
  });
  errorRate.add(!catalogOk);

  sleep(0.3);

  // 3. Batch file upload simulation (every 5 iterations per VU)
  if (__ITER % 5 === 0) {
    const data = {
      file: http.file(SAMPLE_CSV, 'customer_batch.csv', 'text/csv'),
      processId: 'proc-customer-master',
    };

    const uploadRes = http.post(`${BASE_URL}/api/v1/user/jobs/upload`, data, { headers });
    uploadDuration.add(uploadRes.timings.duration);
    const uploadOk = check(uploadRes, {
      'upload returns 202 Accepted': (r) => r.status === 202,
      'upload assigns jobId': (r) => r.body && r.body.includes('jobId'),
    });
    errorRate.add(!uploadOk);
  }

  // 4. Prometheus metrics exposition probe
  const promRes = http.get(`${BASE_URL}/actuator/prometheus`, { headers });
  check(promRes, {
    'prometheus endpoint returns 200': (r) => r.status === 200,
    'metrics contain bulk_ metrics': (r) => r.body && r.body.includes('bulk_'),
  });

  sleep(0.5);
}
