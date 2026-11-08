import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ProcessWorkspace } from '../components/workspace/ProcessWorkspace';
import { ProcessRoute, FileExecutionJob } from '../types/process';

describe('ProcessWorkspace & StepConfigDrawer Component (Tier 2)', () => {
  const mockRoute: ProcessRoute = {
    id: 'customer-master-onboarding',
    name: 'Customer Master Onboarding',
    description: 'Streamed customer entity verification pipeline.',
    status: 'ACTIVE',
    health: 'HEALTHY',
    activeFilesInFlight: 2,
    aggregateThroughputRecordsPerSec: 14200,
    successRatePercent: 99.8,
    pipelineSteps: [
      {
        id: 'splitter',
        name: 'Streaming CSV Splitter',
        type: 'SPLITTER',
        parameters: { batchSize: 500, chunkSplitStrategy: 'LINE_COUNT' },
        fieldMappings: [
          { source: 'c_id', target: 'customerId' }
        ],
        errorPolicy: 'QUARANTINE_RECORD',
        concurrency: 32
      },
      {
        id: 'validator',
        name: 'Schema Constraint Validator',
        type: 'VALIDATOR',
        parameters: { strictValidation: true },
        fieldMappings: [],
        errorPolicy: 'FAIL_FAST',
        concurrency: 16
      },
      {
        id: 'processor',
        name: 'KYC Geo-Enricher',
        type: 'PROCESSOR',
        parameters: { lookupCacheSize: 10000 },
        fieldMappings: [],
        errorPolicy: 'QUARANTINE_RECORD',
        concurrency: 64
      },
      {
        id: 'sink',
        name: 'PostgreSQL Aurora Sink',
        type: 'SINK',
        parameters: { batchInsertLimit: 1000 },
        fieldMappings: [],
        errorPolicy: 'QUARANTINE_RECORD',
        concurrency: 8
      }
    ]
  };

  const mockJobs: FileExecutionJob[] = [
    {
      id: 'job-cmo-001',
      processId: 'customer-master-onboarding',
      fileName: 'customers_na_q3.csv',
      fileSizeBytes: 4219904,
      stage: 'IN_FLIGHT',
      status: 'RUNNING',
      totalRecords: 10000,
      processedRecords: 6500,
      failedRecords: 3,
      submittedAt: new Date().toISOString(),
      checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      detectedEncoding: 'UTF-8',
      detectedDelimiter: ',',
      loomThreadAllocation: 'virtual-worker-101-loom-01'
    },
    {
      id: 'job-cmo-002',
      processId: 'customer-master-onboarding',
      fileName: 'customers_emea_legacy.csv',
      fileSizeBytes: 1820400,
      stage: 'DONE',
      status: 'COMPLETED',
      totalRecords: 5000,
      processedRecords: 5000,
      failedRecords: 12,
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: new Date().toISOString(),
      checksumSha256: 'a4f89d9123891048123984128938120489123048912389102489128309128301',
      detectedEncoding: 'UTF-8',
      detectedDelimiter: ',',
      loomThreadAllocation: 'virtual-worker-102-loom-01'
    },
    {
      id: 'job-cmo-003',
      processId: 'customer-master-onboarding',
      fileName: 'customers_apac_delta.csv',
      fileSizeBytes: 8943200,
      stage: 'SPLITTING',
      status: 'PAUSED',
      totalRecords: 25000,
      processedRecords: 2000,
      failedRecords: 0,
      submittedAt: new Date().toISOString(),
      checksumSha256: 'b4a89d9123891048123984128938120489123048912389102489128309128302',
      detectedEncoding: 'UTF-8',
      detectedDelimiter: ',',
      loomThreadAllocation: 'virtual-worker-103-loom-02'
    }
  ];

  it('renders workspace header, route details, and navigates back', () => {
    const handleBack = vi.fn();
    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={handleBack}
      />
    );

    expect(screen.getByText(/Customer Master Onboarding/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to Route Catalog/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Back to Route Catalog/i));
    expect(handleBack).toHaveBeenCalled();
  });

  it('renders visual step pipeline with stages and connectors', () => {
    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={() => {}}
      />
    );

    expect(screen.getByTestId('pipeline-step-splitter')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-validator')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-processor')).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-step-sink')).toBeInTheDocument();

    expect(screen.getByText('Streaming CSV Splitter')).toBeInTheDocument();
    expect(screen.getByText('Schema Constraint Validator')).toBeInTheDocument();
    expect(screen.getByText('KYC Geo-Enricher')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Aurora Sink')).toBeInTheDocument();
  });

  it('opens StepConfigDrawer when a pipeline stage is clicked and updates step configuration', async () => {
    const handleUpdateStep = vi.fn();
    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={() => {}}
        onUpdateStep={handleUpdateStep}
      />
    );

    // Click on splitter step to open drawer
    fireEvent.click(screen.getByTestId('pipeline-step-splitter'));

    // Drawer should open
    expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
    expect(screen.getByText(/Configure Step: Streaming CSV Splitter/i)).toBeInTheDocument();

    // Concurrency input
    const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
    fireEvent.change(concurrencyInput, { target: { value: '64' } });

    // Error policy select
    const policySelect = screen.getByTestId('drawer-error-policy-select');
    fireEvent.change(policySelect, { target: { value: 'FAIL_FAST' } });

    // Field mappings
    expect(screen.getByTestId('drawer-field-mappings-list')).toBeInTheDocument();
    expect(screen.getByText('c_id')).toBeInTheDocument();
    expect(screen.getByText('customerId')).toBeInTheDocument();

    // Click save
    const saveBtn = screen.getByTestId('drawer-save-btn');
    fireEvent.click(saveBtn);

    expect(handleUpdateStep).toHaveBeenCalledWith(expect.objectContaining({
      id: 'splitter',
      concurrency: 64,
      errorPolicy: 'FAIL_FAST'
    }));
  });

  it('switches between Table and Card view for execution queue', () => {
    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={() => {}}
      />
    );

    // Defaults to Table view
    expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
    expect(screen.getByTestId('job-row-job-cmo-001')).toBeInTheDocument();

    // Switch to Card view
    const cardViewBtn = screen.getByTestId('view-card-btn');
    fireEvent.click(cardViewBtn);

    expect(screen.getByTestId('execution-queue-card-view')).toBeInTheDocument();
    expect(screen.getByTestId('job-card-job-cmo-001')).toBeInTheDocument();

    // Switch back to Table view
    const tableViewBtn = screen.getByTestId('view-table-btn');
    fireEvent.click(tableViewBtn);
    expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
  });

  it('handles job action controls (Pause, Resume, Retry, Cancel, Report, Inspect)', () => {
    const handleJobAction = vi.fn();
    const handleInspectFile = vi.fn();

    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={() => {}}
        onJobAction={handleJobAction}
        onInspectFile={handleInspectFile}
      />
    );

    // job-cmo-001 is RUNNING -> click Pause
    const pauseBtn = screen.getByTestId('btn-pause-job-cmo-001');
    fireEvent.click(pauseBtn);
    expect(handleJobAction).toHaveBeenCalledWith('PAUSE', 'job-cmo-001');

    // job-cmo-003 is PAUSED -> click Resume
    const resumeBtn = screen.getByTestId('btn-resume-job-cmo-003');
    fireEvent.click(resumeBtn);
    expect(handleJobAction).toHaveBeenCalledWith('RESUME', 'job-cmo-003');

    // job-cmo-002 has failedRecords > 0 -> click Inspect Errors
    const inspectBtn = screen.getByTestId('btn-inspect-job-cmo-002');
    fireEvent.click(inspectBtn);
    expect(handleInspectFile).toHaveBeenCalledWith('job-cmo-002');

    // job-cmo-002 is COMPLETED -> click Download Report
    const reportBtn = screen.getByTestId('btn-report-job-cmo-002');
    fireEvent.click(reportBtn);
    expect(handleJobAction).toHaveBeenCalledWith('DOWNLOAD_REPORT', 'job-cmo-002');
  });

  it('uploads files through the batch ingestion dropzone', () => {
    const handleUploadBatch = vi.fn();

    render(
      <ProcessWorkspace
        route={mockRoute}
        jobs={mockJobs}
        onBackToCatalog={() => {}}
        onUploadBatch={handleUploadBatch}
      />
    );

    const file = new File(['c_id,name\n1,Alice\n2,Bob'], 'upload_test.csv', { type: 'text/csv' });
    const dropzoneInput = screen.getByTestId('batch-dropzone-input');

    fireEvent.change(dropzoneInput, {
      target: { files: [file] }
    });

    expect(handleUploadBatch).toHaveBeenCalledWith([file]);
  });
});
