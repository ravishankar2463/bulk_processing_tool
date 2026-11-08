import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FullAppHarness } from './testHarness';

describe('Tier 3: Cross-Feature Interactions E2E Suite', () => {

  // =========================================================================
  // Interaction 1: Route Selection -> Step Drawer Configuration -> State Reflection
  // =========================================================================
  it('navigates from Catalog to Workspace, configures pipeline step in drawer, and reflects changes on pipeline', () => {
    render(<FullAppHarness />);

    // 1. Initial Catalog View: select Customer Master Onboarding
    expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // 2. Verified in Workspace
    expect(screen.getByText(/Process Workspace: Customer Master Onboarding/i)).toBeInTheDocument();
    expect(screen.getByTestId('visual-step-pipeline')).toBeInTheDocument();

    // 3. Click Validator stage to open drawer
    expect(screen.getByTestId('step-policy-validator')).toHaveTextContent('QUARANTINE_RECORD');
    expect(screen.getByTestId('step-concurrency-validator')).toHaveTextContent('32');
    fireEvent.click(screen.getByTestId('pipeline-step-validator'));

    // 4. Drawer is open
    expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
    expect(screen.getByText(/Configure Step: Enterprise Schema & KYC Validator/i)).toBeInTheDocument();

    // 5. Update error policy to FAIL_FAST and concurrency to 64
    const policySelect = screen.getByTestId('drawer-error-policy-select');
    fireEvent.change(policySelect, { target: { value: 'FAIL_FAST' } });

    const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
    fireEvent.change(concurrencyInput, { target: { value: '64' } });

    // 6. Save drawer configuration
    fireEvent.click(screen.getByTestId('drawer-save-btn'));

    // 7. Drawer closes and pipeline step badge reflects updated values
    expect(screen.queryByTestId('step-config-drawer')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-policy-validator')).toHaveTextContent('FAIL_FAST');
    expect(screen.getByTestId('step-concurrency-validator')).toHaveTextContent('64');
  });

  // =========================================================================
  // Interaction 2: Route Selection -> Queue View Switcher -> Per-File Lifecycle Controls
  // =========================================================================
  it('toggles execution queue between Table and Card views and executes per-file actions seamlessly', () => {
    render(<FullAppHarness />);

    // Open Customer Master Onboarding workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // Verify default Table View
    expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
    const runningJobRow = screen.getByTestId('job-row-job-101');
    expect(runningJobRow).toBeInTheDocument();
    expect(screen.getByTestId('job-status-job-101')).toHaveTextContent('RUNNING');

    // Switch to Card View
    fireEvent.click(screen.getByTestId('view-card-btn'));
    expect(screen.getByTestId('execution-queue-card-view')).toBeInTheDocument();
    expect(screen.queryByTestId('execution-queue-table-view')).not.toBeInTheDocument();
    expect(screen.getByTestId('card-job-status-job-101')).toHaveTextContent('RUNNING');

    // Pause job-101 in Card View
    fireEvent.click(screen.getByTestId('card-btn-pause-job-101'));
    expect(screen.getByTestId('card-job-status-job-101')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('card-btn-resume-job-101')).toBeInTheDocument();

    // Resume job-101 in Card View
    fireEvent.click(screen.getByTestId('card-btn-resume-job-101'));
    expect(screen.getByTestId('card-job-status-job-101')).toHaveTextContent('RUNNING');

    // Switch back to Table View and verify status persisted
    fireEvent.click(screen.getByTestId('view-table-btn'));
    expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
    expect(screen.getByTestId('job-status-job-101')).toHaveTextContent('RUNNING');
  });

  // =========================================================================
  // Interaction 3: Batch Dropzone Upload -> 5-Stage Progression in Queue
  // =========================================================================
  it('uploads new batch file via dropzone and enqueues job with INGESTING stage progression', () => {
    render(<FullAppHarness />);

    // Open workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // Verify initial file count in queue
    const initialFiles = screen.getAllByTestId(/job-row-/).length;

    // Simulate batch upload of new file
    const newFile = new File(['header1,header2\nval1,val2'], 'enterprise_onboard_q4.csv', { type: 'text/csv' });
    const dropzoneInput = screen.getByTestId('batch-dropzone-input');
    fireEvent.change(dropzoneInput, { target: { files: [newFile] } });

    // Verify new job row is rendered
    expect(screen.getByText('enterprise_onboard_q4.csv')).toBeInTheDocument();
    const updatedFiles = screen.getAllByTestId(/job-row-/).length;
    expect(updatedFiles).toBe(initialFiles + 1);

    // Verify new job begins at INGESTING stage with QUEUED status
    expect(screen.getAllByText('INGESTING').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QUEUED').length).toBeGreaterThan(0);
  });

  // =========================================================================
  // Interaction 4: Diagnostics Modal Inspection -> Headroom Compression -> CSV Export
  // =========================================================================
  it('inspects file errors, verifies metadata & waterfall, toggles Headroom compression, and triggers CSV export', () => {
    render(<FullAppHarness />);

    // Navigate to workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));

    // Click Inspect Errors on job-101
    fireEvent.click(screen.getByTestId('btn-inspect-job-101'));

    // Verify Diagnostics Modal opened with metadata and waterfall
    expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
    expect(screen.getByText('Deep File Diagnostics: job-101')).toBeInTheDocument();
    expect(screen.getByTestId('meta-size')).toHaveTextContent('14.17 MB');
    expect(screen.getByTestId('meta-encoding')).toHaveTextContent('UTF-8');
    expect(screen.getByTestId('meta-loom-thread')).toHaveTextContent('VirtualThread[#1042,loom-worker-4]');
    expect(screen.getByTestId('diagnostics-latency-waterfall')).toBeInTheDocument();

    // Verify initial Schema Tuple View
    expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
    expect(screen.getByText('ERR_MISSING_EMAIL')).toBeInTheDocument();

    // Toggle Headroom Context Compression (-74% tokens)
    const headroomCheckbox = screen.getByTestId('headroom-toggle-checkbox');
    fireEvent.click(headroomCheckbox);

    // Verify Headroom savings banner appears
    expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();
    expect(screen.getByTestId('headroom-savings-pct')).toHaveTextContent(/Token Reduction/);

    // Switch to Raw JSON terminal to inspect compressed schema output
    fireEvent.click(screen.getByTestId('tab-raw-json'));
    expect(screen.getByTestId('raw-json-terminal')).toBeInTheDocument();
    const jsonText = screen.getByTestId('raw-json-content').textContent;
    expect(jsonText).toContain('_headroom');
    expect(jsonText).toContain('schema');

    // Trigger CSV Export
    const exportBtn = screen.getByTestId('btn-export-errors-csv');
    expect(exportBtn).toBeInTheDocument();
    fireEvent.click(exportBtn);

    // Close Diagnostics Modal and return cleanly to workspace
    fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
    expect(screen.queryByTestId('file-diagnostics-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('process-workspace-container')).toBeInTheDocument();
  });

  // =========================================================================
  // Interaction 5: Route Lifecycle Pause/Resume State Transitions
  // =========================================================================
  it('pauses and resumes route from Catalog and verifies status and health badges update', () => {
    render(<FullAppHarness />);

    // Pause Customer Master Onboarding
    const pauseBtn = screen.getByTestId('pause-route-btn-route-cust-onboarding');
    fireEvent.click(pauseBtn);

    expect(screen.getByTestId('status-badge-route-cust-onboarding')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('start-route-btn-route-cust-onboarding')).toBeInTheDocument();

    // Resume route
    const startBtn = screen.getByTestId('start-route-btn-route-cust-onboarding');
    fireEvent.click(startBtn);

    expect(screen.getByTestId('status-badge-route-cust-onboarding')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('health-badge-route-cust-onboarding')).toHaveTextContent('HEALTHY');
  });

  // =========================================================================
  // Interaction 6: Failed Job Retry and Error Reset Flow
  // =========================================================================
  it('retries failed job in execution queue and resets failure counter to running state', () => {
    render(<FullAppHarness />);

    // Navigate to Order Fulfillment Stream workspace
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-order-fulfillment'));

    // job-106 is in this route with errors
    expect(screen.getByTestId('job-row-job-106')).toBeInTheDocument();

    // Switch to Card View to test retry button
    fireEvent.click(screen.getByTestId('view-card-btn'));
    const retryBtn = screen.getByTestId('card-btn-retry-job-106');
    fireEvent.click(retryBtn);

    // Verify failure counter reset and status returned to RUNNING
    expect(screen.getByTestId('card-job-status-job-106')).toHaveTextContent('RUNNING');
    expect(screen.getByTestId('card-job-failures-job-106')).toHaveTextContent('Failures: 0');
  });

  // =========================================================================
  // Interaction 7: Full Roundtrip Integration Flow
  // =========================================================================
  it('executes full roundtrip user journey from catalog to workspace, step config, batch upload, inspection, and return', () => {
    render(<FullAppHarness />);

    // 1. Catalog: verify 3 routes
    expect(screen.getByTestId('catalog-routes-count')).toHaveTextContent('3 Configured Routes');

    // 2. Open Financial Reconciliation
    fireEvent.click(screen.getByTestId('view-workspace-btn-route-fin-reconciliation'));
    expect(screen.getByText(/Process Workspace: Financial Reconciliation/i)).toBeInTheDocument();

    // 3. Configure Splitter in drawer
    fireEvent.click(screen.getByTestId('pipeline-step-splitter'));
    expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawer-save-btn'));
    expect(screen.queryByTestId('step-config-drawer')).not.toBeInTheDocument();

    // 4. Inspect failed fx job
    fireEvent.click(screen.getByTestId('btn-inspect-job-107'));
    expect(screen.getByText('Deep File Diagnostics: job-107')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('close-diagnostics-btn'));

    // 5. Navigate back to Route Catalog
    fireEvent.click(screen.getByTestId('back-to-catalog-btn'));
    expect(screen.getByTestId('process-catalog-container')).toBeInTheDocument();
    expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
  });

});
