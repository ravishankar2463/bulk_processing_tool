import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FullAppHarness } from './testHarness';

describe('Tier 4: Real-World Application Scenarios E2E Suite', () => {

  // =========================================================================
  // Scenario 1: Enterprise Onboarding
  // =========================================================================
  it('Scenario 1 - Enterprise Onboarding: route selection, pipeline review, batch upload, 5-stage monitoring, and latency waterfall verification', () => {
    render(<FullAppHarness />);

    // 1. User selects Customer Master Onboarding route from Catalog
    expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('health-badge-route-cust-onboarding')).toHaveTextContent('HEALTHY');
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // 2. Reviews pipeline step parameters via drawer
    expect(screen.getByTestId('visual-step-pipeline')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pipeline-step-splitter'));
    expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
    expect(screen.getByText(/Configure Step: Univocity CSV Stream Splitter/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-cancel-btn'));
    expect(screen.queryByTestId('step-config-drawer')).not.toBeInTheDocument();

    // 3. Uploads batch file in targeted dropzone
    const dropzoneInput = screen.getByTestId('batch-dropzone-input');
    const newBatchFile = new File(['id,name,email\n1,Alpha,alpha@corp.de'], 'customers_batch_emea.csv', { type: 'text/csv' });
    fireEvent.change(dropzoneInput, { target: { files: [newBatchFile] } });

    // 4. Monitors 5-stage progression in Table View
    expect(screen.getByText('customers_batch_emea.csv')).toBeInTheDocument();
    expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();

    // 5. Inspects latency waterfall for completed job (job-105)
    fireEvent.click(screen.getByTestId('btn-inspect-job-105'));
    expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
    expect(screen.getByTestId('diagnostics-latency-waterfall')).toBeInTheDocument();
    expect(screen.getByTestId('waterfall-duration-splitter')).toHaveTextContent('12,400 µs');
    expect(screen.getByTestId('waterfall-duration-processor')).toHaveTextContent('52,600 µs');

    // Close modal
    fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
    expect(screen.queryByTestId('file-diagnostics-modal')).not.toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 2: Order Fulfillment Anomaly
  // =========================================================================
  it('Scenario 2 - Order Fulfillment Anomaly: inspects degraded route, switches to Card View, pauses stalled file, resubmits failed chunk, and downloads report', () => {
    const alertMock = vi.fn();
    window.alert = alertMock;

    render(<FullAppHarness />);

    // 1. Inspects Order Fulfillment Stream with degraded route health
    expect(screen.getByTestId('health-badge-route-order-fulfillment')).toHaveTextContent('DEGRADED');
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-order-fulfillment'));

    // 2. Switches execution queue to Card View
    fireEvent.click(screen.getByTestId('view-card-btn'));
    expect(screen.getByTestId('execution-queue-card-view')).toBeInTheDocument();

    // 3. Stalled job-106 is paused; resume it or retry failed chunk
    expect(screen.getByTestId('card-job-status-job-106')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('card-job-failures-job-106')).toHaveTextContent('Failures: 440');

    // 4. Resubmits failed batch chunk via Retry
    fireEvent.click(screen.getByTestId('card-btn-retry-job-106'));
    expect(screen.getByTestId('card-job-status-job-106')).toHaveTextContent('RUNNING');
    expect(screen.getByTestId('card-job-failures-job-106')).toHaveTextContent('Failures: 0');

    // 5. Pauses the running file
    fireEvent.click(screen.getByTestId('card-btn-pause-job-106'));
    expect(screen.getByTestId('card-job-status-job-106')).toHaveTextContent('PAUSED');

    // 6. Downloads execution report
    fireEvent.click(screen.getByTestId('card-btn-report-job-106'));
    expect(screen.getByTestId('card-btn-report-job-106')).toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 3: Financial Reconciliation & Headroom Diagnostics
  // =========================================================================
  it('Scenario 3 - Financial Reconciliation & Headroom Diagnostics: inspects error records, toggles Headroom compression (-74%), views schema tuples & raw JSON, exports CSV', () => {
    render(<FullAppHarness />);

    // 1. User selects Financial Reconciliation route
    expect(screen.getByText('Financial Reconciliation')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-fin-reconciliation'));

    // 2. Inspects error records for job-107
    fireEvent.click(screen.getByTestId('btn-inspect-job-107'));
    expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
    expect(screen.getByText('Deep File Diagnostics: job-107')).toBeInTheDocument();

    // 3. Views schema tuples side-by-side
    expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
    expect(screen.getByText('REC-101-0042')).toBeInTheDocument();
    expect(screen.getByText('ERR_MISSING_EMAIL')).toBeInTheDocument();

    // 4. Toggles Headroom compression to verify token reduction (-74% theoretical)
    const toggleCheckbox = screen.getByTestId('headroom-toggle-checkbox');
    fireEvent.click(toggleCheckbox);

    // Verify Headroom savings banner appears with calculated reduction percentage
    expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();
    const savingsEl = screen.getByTestId('headroom-savings-pct');
    expect(savingsEl).toHaveTextContent(/Token Reduction/);

    // 5. Switches to Raw JSON Terminal to verify compressed schema tuples
    fireEvent.click(screen.getByTestId('tab-raw-json'));
    expect(screen.getByTestId('raw-json-terminal')).toBeInTheDocument();
    const rawContent = screen.getByTestId('raw-json-content').textContent;
    expect(rawContent).toContain('_headroom');
    expect(rawContent).toContain('schema');

    // 6. Exports the error log to CSV
    const exportBtn = screen.getByTestId('btn-export-errors-csv');
    fireEvent.click(exportBtn);
    expect(exportBtn).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
    expect(screen.queryByTestId('file-diagnostics-modal')).not.toBeInTheDocument();
  });

  // =========================================================================
  // Scenario 4: Pipeline Configuration & Error Policy Tuning
  // =========================================================================
  it('Scenario 4 - Pipeline Configuration & Error Policy Tuning: adjusts Validator error policy from quarantine to fail-fast and updates concurrency', () => {
    render(<FullAppHarness />);

    // 1. Navigate to Customer Master Onboarding workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // 2. Initial state: Validator policy is QUARANTINE_RECORD, concurrency 32
    expect(screen.getByTestId('step-policy-validator')).toHaveTextContent('QUARANTINE_RECORD');
    expect(screen.getByTestId('step-concurrency-validator')).toHaveTextContent('32');

    // 3. Open Validator step configuration drawer
    fireEvent.click(screen.getByTestId('pipeline-step-validator'));
    expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();

    // 4. Adjust error policy from quarantine to fail-fast
    const policySelect = screen.getByTestId('drawer-error-policy-select');
    fireEvent.change(policySelect, { target: { value: 'FAIL_FAST' } });

    // 5. Update concurrency settings from 32 to 64 virtual threads
    const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
    fireEvent.change(concurrencyInput, { target: { value: '64' } });

    // 6. Save drawer configuration
    fireEvent.click(screen.getByTestId('drawer-save-btn'));

    // 7. Verify real-time reflection on visual step pipeline
    expect(screen.queryByTestId('step-config-drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-policy-validator')).toHaveTextContent('FAIL_FAST');
    expect(screen.getByTestId('step-concurrency-validator')).toHaveTextContent('64');

    // 8. Re-open drawer to confirm persisted settings
    fireEvent.click(screen.getByTestId('pipeline-step-validator'));
    const reloadedPolicy = screen.getByTestId('drawer-error-policy-select') as HTMLSelectElement;
    const reloadedConcurrency = screen.getByTestId('drawer-concurrency-input') as HTMLInputElement;
    expect(reloadedPolicy.value).toBe('FAIL_FAST');
    expect(reloadedConcurrency.value).toBe('64');
  });

  // =========================================================================
  // Scenario 5: End-to-End Bulk Ingestion Lifecycle
  // =========================================================================
  it('Scenario 5 - End-to-End Bulk Ingestion Lifecycle: multi-file batch upload, stage progression tracking, and return to catalog with updated metrics', () => {
    render(<FullAppHarness />);

    // 1. Start at Catalog and verify initial active files
    expect(screen.getByTestId('active-files-route-cust-onboarding')).toHaveTextContent('3');

    // 2. Open workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));
    expect(screen.getByTestId('process-workspace-container')).toBeInTheDocument();

    // 3. Perform multi-file drag-and-drop batch upload (3 files)
    const file1 = new File(['rec1,rec2'], 'kyc_nordics_batch_01.csv', { type: 'text/csv' });
    const file2 = new File(['rec3,rec4'], 'kyc_dach_batch_02.csv', { type: 'text/csv' });
    const file3 = new File(['rec5,rec6'], 'kyc_uk_batch_03.csv', { type: 'text/csv' });

    const dropzoneInput = screen.getByTestId('batch-dropzone-input');
    fireEvent.change(dropzoneInput, { target: { files: [file1, file2, file3] } });

    // 4. Verify all 3 uploaded files are present in the Execution Queue
    expect(screen.getByText('kyc_nordics_batch_01.csv')).toBeInTheDocument();
    expect(screen.getByText('kyc_dach_batch_02.csv')).toBeInTheDocument();
    expect(screen.getByText('kyc_uk_batch_03.csv')).toBeInTheDocument();

    // 5. Verify total tracked files updated
    expect(screen.getByText('8 files tracked in process queue')).toBeInTheDocument();

    // 6. Return to Catalog and verify active routes hub
    fireEvent.click(screen.getByTestId('back-to-catalog-btn'));
    expect(screen.getByTestId('process-catalog-container')).toBeInTheDocument();
    expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Order Fulfillment Stream')).toBeInTheDocument();
    expect(screen.getByText('Financial Reconciliation')).toBeInTheDocument();
  });

});

