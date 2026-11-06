import { describe, it, expect } from 'vitest';
import {
  fetchCatalogRoutes,
  startRoute,
  pauseRoute,
  fetchProcessJobs,
  batchUploadFiles,
  pauseJob,
  resumeJob,
  retryJob,
  cancelJob,
  fetchJobDiagnostics
} from '../services/apiClient';

describe('ApiClient Resilient Service Layer', () => {
  it('fetches enterprise catalog routes with default seed routes', async () => {
    const routes = await fetchCatalogRoutes();
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThanOrEqual(3);

    const cmo = routes.find(r => r.id === 'customer-master-onboarding');
    expect(cmo).toBeDefined();
    expect(cmo?.name).toBe('Customer Master Onboarding');
    expect(cmo?.pipelineSteps.length).toBe(4);
    expect(cmo?.pipelineSteps[0].type).toBe('STREAMING_CSV_SPLITTER');
  });

  it('pauses and starts a route with immediate state persistence', async () => {
    const paused = await pauseRoute('customer-master-onboarding');
    expect(paused.status).toBe('PAUSED');
    expect(paused.health).toBe('DEGRADED');

    const started = await startRoute('customer-master-onboarding');
    expect(started.status).toBe('ACTIVE');
    expect(started.health).toBe('HEALTHY');
  });

  it('fetches process execution jobs and supports filtering by processId', async () => {
    const allJobs = await fetchProcessJobs();
    expect(allJobs.length).toBeGreaterThan(0);

    const filtered = await fetchProcessJobs('customer-master-onboarding');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(j => j.processId === 'customer-master-onboarding')).toBe(true);
  });

  it('performs batch file upload returning newly queued execution jobs', async () => {
    const file1 = new File(['id,name\n1,Alpha'], 'alpha.csv', { type: 'text/csv' });
    const file2 = new File(['id,name\n2,Beta'], 'beta.csv', { type: 'text/csv' });

    const createdJobs = await batchUploadFiles([file1, file2], 'customer-master-onboarding');
    expect(createdJobs.length).toBe(2);
    expect(createdJobs[0].fileName).toBe('alpha.csv');
    expect(createdJobs[1].fileName).toBe('beta.csv');
    expect(createdJobs[0].processId).toBe('customer-master-onboarding');
  });

  it('supports per-job lifecycle actions: pause, resume, retry, cancel', async () => {
    const paused = await pauseJob('job-cmo-001');
    expect(paused.status).toBe('PAUSED');

    const resumed = await resumeJob('job-cmo-001');
    expect(resumed.status).toBe('RUNNING');

    const retried = await retryJob('job-cmo-001');
    expect(retried.status).toBe('RUNNING');
    expect(retried.failedRecords).toBe(0);

    const cancelled = await cancelJob('job-cmo-001');
    expect(cancelled.status).toBe('FAILED');
    expect(cancelled.stage).toBe('DONE');
  });

  it('fetches deep file diagnostics including metadata, latency waterfall, and chunks', async () => {
    const diag = await fetchJobDiagnostics('job-cmo-001');
    expect(diag).toBeDefined();
    expect(diag.jobId).toBe('job-cmo-001');
    expect(diag.metadata.sizeBytes).toBeGreaterThan(0);
    expect(diag.metadata.encoding).toBe('UTF-8');
    expect(diag.metadata.delimiter).toBe(',');
    expect(diag.stageLatencies.length).toBe(4);
    expect(diag.batchChunks.length).toBeGreaterThan(0);
    expect(diag.errorRecords.length).toBeGreaterThan(0);
  });
});

