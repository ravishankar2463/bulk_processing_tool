import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { UserDashboard, UserJob } from '../../components/user/UserDashboard';
import { ProcessWorkspace, ExecutionQueue } from '../../components/workspace/ProcessWorkspace';
import { FileDiagnosticsModal } from '../../components/diagnostics/FileDiagnosticsModal';
import { AdminRouteStudio } from '../../components/admin/AdminRouteStudio';
import { AdminPipelineWizard } from '../../components/admin/AdminPipelineWizard';
import { fetchJobDiagnostics } from '../../services/apiClient';
import { FileDiagnosticsData, FileExecutionJob } from '../../types/process';

/**
 * Cucumber & Jasmine E2E BDD Test Suite for File Deep Lineage:
 * - Batches / Chunks distribution (recordCount, success, failures, duration)
 * - Records lineage: Which records are on which step (PASSED_STEP, FAILED_AT_STEP, IN_FLIGHT)
 * - Step Summary breakdown (input, success, failures, in-flight, duration)
 * - Which failed on which step (quarantined error codes and step badges)
 * - Interactive filtering and file click navigation
 */
describe('Feature: File Deep Lineage, Batches, Records, and Step Summary Inspection (Cucumber / Jasmine BDD)', () => {
  let mockDiagnostics: FileDiagnosticsData;

  beforeEach(async () => {
    mockDiagnostics = await fetchJobDiagnostics('job-cmo-001');
  });

  // =========================================================================
  // Scenario 1: Clicking on a file opens the deep file diagnostics drawer
  // =========================================================================
  describe('Scenario: Clicking on a file opens the deep file diagnostics drawer', () => {
    it('Given the user is on the Live Execution Dashboard, When user clicks on file name, Then diagnostics drawer opens', () => {
      const handleInspect = vi.fn();
      const mockJobs: UserJob[] = [
        {
          jobId: 'job-cmo-001',
          fileName: 'customers_q4_enterprise.csv',
          status: 'PROCESSING',
          totalRecords: 10000,
          processedRecords: 6500,
          successfulRecords: 6480,
          failedRecords: 20,
          startTime: new Date().toISOString(),
          processId: 'customer-master-onboarding'
        }
      ];

      // Given
      render(
        <UserDashboard
          jobs={mockJobs}
          onDownloadReport={() => {}}
          onUploadNew={() => {}}
          onInspectErrors={handleInspect}
        />
      );

      // When
      const fileClickBtn = screen.getByTestId('file-name-click-job-cmo-001');
      expect(fileClickBtn).toBeInTheDocument();
      expect(fileClickBtn).toHaveTextContent('customers_q4_enterprise.csv');
      fireEvent.click(fileClickBtn);

      // Then
      expect(handleInspect).toHaveBeenCalledWith('job-cmo-001');
    });

    it('displays the deep diagnostics drawer with overall KPI strip when opened', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // Then
      expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
      expect(screen.getByText('Deep File Diagnostics: job-cmo-001')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-records')).toHaveTextContent('10,000');
      expect(screen.getByTestId('kpi-success-records')).toHaveTextContent('6,480');
      expect(screen.getByTestId('kpi-failed-records')).toHaveTextContent('20');
      expect(screen.getByTestId('kpi-batches-count')).toHaveTextContent('5 chunks');
    });
  });

  // =========================================================================
  // Scenario 2: Inspecting batch chunks distribution with success and failure counts
  // =========================================================================
  describe('Scenario: Inspecting batch chunks distribution with success and failure counts', () => {
    it('renders all batch chunk cards with records, success, and failure counts', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // Chunk 0
      const chunk0 = screen.getByTestId('chunk-card-0');
      expect(chunk0).toHaveTextContent('Chunk #0 (partition-p0)');
      expect(chunk0).toHaveTextContent('Records: 500');
      expect(chunk0).toHaveTextContent('✓ 499');
      expect(chunk0).toHaveTextContent('✗ 1');
      expect(chunk0).toHaveTextContent('● DONE');

      // Chunk 3 (Zero failures)
      const chunk3 = screen.getByTestId('chunk-card-3');
      expect(chunk3).toHaveTextContent('Chunk #3 (partition-p1)');
      expect(chunk3).toHaveTextContent('Records: 500');
      expect(chunk3).toHaveTextContent('✓ 500');
      expect(chunk3).toHaveTextContent('0 err');
      expect(chunk3).toHaveTextContent('● DONE');
    });

    it('filters records lineage when a chunk card is clicked, and clears when clear button is clicked', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // When clicking chunk 0
      const chunk0 = screen.getByTestId('chunk-card-0');
      fireEvent.click(chunk0);

      // Then clear batch filter button appears
      const clearBtn = screen.getByTestId('clear-batch-filter-btn');
      expect(clearBtn).toBeInTheDocument();
      expect(clearBtn).toHaveTextContent('Clear Batch Filter (Show All)');

      // When clearing filter
      fireEvent.click(clearBtn);
      expect(screen.queryByTestId('clear-batch-filter-btn')).not.toBeInTheDocument();
    });

    it('verifies batch chunks failure counts sum exactly to 20 failed records matching overall job metric', () => {
      const totalChunkFailures = mockDiagnostics.batchChunks.reduce((acc, c) => acc + (c.failedCount || 0), 0);
      expect(totalChunkFailures).toBe(20);
    });
  });

  // =========================================================================
  // Scenario 3: Viewing Step Summary breakdown across all pipeline stages
  // =========================================================================
  describe('Scenario: Viewing Step Summary breakdown across all pipeline stages', () => {
    it('displays input, success, failure, and in-flight record counts for all 4 pipeline stages', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // Step Summary container
      expect(screen.getByTestId('step-summary-breakdown')).toBeInTheDocument();

      // Splitter step
      expect(screen.getByTestId('step-input-records-splitter')).toHaveTextContent('10,000');
      expect(screen.getByTestId('step-success-records-splitter')).toHaveTextContent('10,000');
      expect(screen.getByTestId('step-failed-records-splitter')).toHaveTextContent('0');
      expect(screen.getByTestId('step-status-splitter')).toHaveTextContent('SUCCESS');

      // Validator step (has 20 failures)
      expect(screen.getByTestId('step-input-records-validator')).toHaveTextContent('10,000');
      expect(screen.getByTestId('step-success-records-validator')).toHaveTextContent('9,980');
      expect(screen.getByTestId('step-failed-records-validator')).toHaveTextContent('20');
      expect(screen.getByTestId('step-status-validator')).toHaveTextContent('WARNING');

      // Processor step
      expect(screen.getByTestId('step-input-records-processor')).toHaveTextContent('9,980');
      expect(screen.getByTestId('step-success-records-processor')).toHaveTextContent('9,980');
      expect(screen.getByTestId('step-failed-records-processor')).toHaveTextContent('0');

      // Sink step (has 3500 in-flight records)
      expect(screen.getByTestId('step-input-records-sink')).toHaveTextContent('9,980');
      expect(screen.getByTestId('step-success-records-sink')).toHaveTextContent('6,480');
      expect(screen.getByTestId('step-inflight-records-sink')).toHaveTextContent('3,500');
    });

    it('clicking a step card toggles the step filter in the record lineage table', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const validatorCard = screen.getByTestId('step-summary-card-validator');
      fireEvent.click(validatorCard);

      const stepSelect = screen.getByTestId('filter-lineage-step') as HTMLSelectElement;
      expect(stepSelect.value).toBe('validator');
    });
  });

  // =========================================================================
  // Scenario 4: Identifying which records failed on which step
  // =========================================================================
  describe('Scenario: Identifying which records failed on which step', () => {
    it('displays alert card with quarantined error codes and record counts for failed steps', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('which-failed-on-step-summary')).toBeInTheDocument();
      const failedStepItem = screen.getByTestId('failed-step-item-validator');
      expect(failedStepItem).toHaveTextContent('Stage: Dynamic Schema Validator (20 failed records)');
      expect(failedStepItem).toHaveTextContent('INVALID_EMAIL_SYNTAX');
      expect(failedStepItem).toHaveTextContent('POSTAL_CODE_MISMATCH');
      expect(failedStepItem).toHaveTextContent('DUPLICATE_TAX_IDENTIFIER');
    });

    it('clicking "View Failures on Dynamic Schema Validator" auto-filters the lineage table', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const viewFailuresBtn = screen.getByTestId('btn-filter-failed-step-validator');
      fireEvent.click(viewFailuresBtn);

      const stepSelect = screen.getByTestId('filter-lineage-step') as HTMLSelectElement;
      const statusSelect = screen.getByTestId('filter-lineage-status') as HTMLSelectElement;

      expect(stepSelect.value).toBe('validator');
      expect(statusSelect.value).toBe('FAILED_AT_STEP');
    });
  });

  // =========================================================================
  // Scenario 5: Tracking which records are on which step and filtering interactively
  // =========================================================================
  describe('Scenario: Tracking which records are on which step and filtering interactively', () => {
    it('renders the interactive Record Step Lineage table with step and status badges', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('record-step-lineage-table')).toBeInTheDocument();

      // Check rec-101 (failed at validator)
      expect(screen.getByTestId('record-id-rec-101')).toHaveTextContent('Rec #rec-101');
      expect(screen.getByTestId('record-step-rec-101')).toHaveTextContent('Stage: Dynamic Schema Validator');
      expect(screen.getByTestId('record-status-rec-101')).toHaveTextContent('FAILED_AT_STEP');
      expect(screen.getByTestId('record-error-rec-101')).toHaveTextContent('Fault: INVALID_EMAIL_SYNTAX');

      // Check rec-104 (passed at sink)
      expect(screen.getByTestId('record-id-rec-104')).toHaveTextContent('Rec #rec-104');
      expect(screen.getByTestId('record-step-rec-104')).toHaveTextContent('Stage: Audit Report Sink');
      expect(screen.getByTestId('record-status-rec-104')).toHaveTextContent('PASSED_STEP');

      // Check rec-107 (in flight at processor)
      expect(screen.getByTestId('record-id-rec-107')).toHaveTextContent('Rec #rec-107');
      expect(screen.getByTestId('record-step-rec-107')).toHaveTextContent('Stage: Enrichment & Transformation');
      expect(screen.getByTestId('record-status-rec-107')).toHaveTextContent('IN_FLIGHT');
    });

    it('filters lineage records by search query', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const searchInput = screen.getByTestId('filter-lineage-search');
      fireEvent.change(searchInput, { target: { value: 'rec-107' } });

      expect(screen.getByTestId('record-id-rec-107')).toBeInTheDocument();
      expect(screen.queryByTestId('record-id-rec-101')).not.toBeInTheDocument();
      expect(screen.queryByTestId('record-id-rec-104')).not.toBeInTheDocument();
    });

    it('filters lineage records by status: IN_FLIGHT', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const statusSelect = screen.getByTestId('filter-lineage-status');
      fireEvent.change(statusSelect, { target: { value: 'IN_FLIGHT' } });

      expect(screen.getByTestId('record-id-rec-107')).toBeInTheDocument();
      expect(screen.getByTestId('record-id-rec-108')).toBeInTheDocument();
      expect(screen.queryByTestId('record-id-rec-101')).not.toBeInTheDocument();
    });

    it('verifies all 20 failed records are present in lineage when filtered by validator step and FAILED_AT_STEP', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // Verify diagnostics has exactly 20 error records
      expect(mockDiagnostics.errorRecords).toHaveLength(20);

      // Filter by validator step
      const stepSelect = screen.getByTestId('filter-lineage-step');
      fireEvent.change(stepSelect, { target: { value: 'validator' } });

      // Filter by FAILED_AT_STEP status
      const statusSelect = screen.getByTestId('filter-lineage-status');
      fireEvent.change(statusSelect, { target: { value: 'FAILED_AT_STEP' } });

      // Check footer displays 20 of 20 records
      expect(screen.getByTestId('lineage-pagination-info')).toHaveTextContent('Showing 1 to 20 of 20 records');

      // Verify all 20 failed records are rendered in the DOM
      expect(screen.getByTestId('record-id-rec-101')).toBeInTheDocument();
      expect(screen.getByTestId('record-id-rec-102')).toBeInTheDocument();
      expect(screen.getByTestId('record-id-rec-103')).toBeInTheDocument();
      for (let i = 109; i <= 125; i++) {
        expect(screen.getByTestId(`record-id-rec-${i}`)).toBeInTheDocument();
      }
    });
  });

  // =========================================================================
  // Scenario 6: Resubmitting a quarantined failed record from the lineage view
  // =========================================================================
  describe('Scenario: Resubmitting a quarantined failed record directly from the lineage view', () => {
    it('transitions button state to Resubmitted when clicked on failed record', async () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const resubmitBtn = screen.getByTestId('btn-resubmit-record-rec-101');
      expect(resubmitBtn).toBeInTheDocument();
      expect(resubmitBtn).toHaveTextContent('Resubmit');

      fireEvent.click(resubmitBtn);

      await waitFor(() => {
        expect(resubmitBtn).toHaveTextContent('Resubmitted');
        expect(resubmitBtn).toBeDisabled();
      });
    });
  });

  // =========================================================================
  // Scenario 6.1: Inspecting individual record details on click (rec-117)
  // =========================================================================
  describe('Scenario: Inspecting individual record details on click (rec-117)', () => {
    it('clicking on rec-117 row opens record details modal displaying line, fault, schema tuple, and raw payload', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      // 1. Initially record details modal is not open
      expect(screen.queryByTestId('record-details-modal')).not.toBeInTheDocument();

      // 2. Click on record row rec-117
      const recordRow = screen.getByTestId('record-row-rec-117');
      expect(recordRow).toBeInTheDocument();
      fireEvent.click(recordRow);

      // 3. Modal opens with complete record details
      expect(screen.getByTestId('record-details-modal')).toBeInTheDocument();
      expect(screen.getByTestId('record-details-title')).toHaveTextContent('Record Details: rec-117');
      expect(screen.getByTestId('record-details-id')).toHaveTextContent('#rec-117');
      expect(screen.getByTestId('record-details-line')).toHaveTextContent('Line #1250');
      expect(screen.getByTestId('record-details-batch')).toHaveTextContent('job-cmo-001-batch-2');
      expect(screen.getByTestId('record-details-status')).toHaveTextContent('FAILED_AT_STEP');
      expect(screen.getByTestId('record-details-step')).toHaveTextContent('Dynamic Schema Validator');

      // 3.5. Source File Metadata & Ingestion Context verification
      expect(screen.getByTestId('record-details-file-meta-panel')).toBeInTheDocument();
      expect(screen.getByTestId('record-file-name')).toHaveTextContent('customers_q4_enterprise.csv');
      expect(screen.getByTestId('record-file-job')).toHaveTextContent('job-cmo-001');
      expect(screen.getByTestId('record-file-process')).toHaveTextContent('Customer Master Onboarding');
      expect(screen.getByTestId('record-file-size')).toHaveTextContent('4.32 MB');
      expect(screen.getByTestId('record-file-encoding-delimiter')).toHaveTextContent("UTF-8 · Comma (',')");
      expect(screen.getByTestId('record-file-row-count')).toHaveTextContent('10,000 records');
      expect(screen.getByTestId('record-file-loom-thread')).toHaveTextContent('virtual-worker-101-loom-04');
      expect(screen.getByTestId('record-file-checksum')).toHaveTextContent('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

      // 4. Fault code and message verification
      expect(screen.getByTestId('record-details-error-code')).toHaveTextContent('Fault Code: EXPIRED_TIMESTAMP');
      expect(screen.getByTestId('record-details-error-message')).toHaveTextContent('Transaction timestamp is older than permitted SLA (90 days)');

      // 5. Extracted Schema Tuple fields
      expect(screen.getByTestId('record-tuple-field-id')).toHaveTextContent('CUST-1250');
      expect(screen.getByTestId('record-tuple-field-name')).toHaveTextContent('Brutus & Co');
      expect(screen.getByTestId('record-tuple-field-email')).toHaveTextContent('brutus@republic.org');
      expect(screen.getByTestId('record-tuple-field-region')).toHaveTextContent('EMEA');
      expect(screen.getByTestId('record-tuple-field-postal')).toHaveTextContent('00189');
      expect(screen.getByTestId('record-tuple-field-txDate')).toHaveTextContent('2023-01-01');

      // 6. Ingested Raw Payload
      expect(screen.getByTestId('record-details-payload')).toHaveTextContent('Brutus & Co');
      expect(screen.getByTestId('record-details-payload')).toHaveTextContent('2023-01-01');

      // 7. Close modal
      const closeBtn = screen.getByTestId('btn-close-record-details');
      fireEvent.click(closeBtn);
      expect(screen.queryByTestId('record-details-modal')).not.toBeInTheDocument();
    });

    it('clicking "Details" button on rec-117 in Lineage table opens record details modal', () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      const detailsBtn = screen.getByTestId('btn-view-record-rec-117');
      expect(detailsBtn).toBeInTheDocument();
      fireEvent.click(detailsBtn);

      expect(screen.getByTestId('record-details-modal')).toBeInTheDocument();
      expect(screen.getByTestId('record-details-title')).toHaveTextContent('Record Details: rec-117');

      // Close using footer close button
      fireEvent.click(screen.getByTestId('btn-close-record-details-footer'));
      expect(screen.queryByTestId('record-details-modal')).not.toBeInTheDocument();
    });

    it('resubmitting from inside the record details modal updates status', async () => {
      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnostics}
          onClose={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('record-row-rec-117'));

      const modalResubmitBtn = screen.getByTestId('btn-resubmit-record-details');
      expect(modalResubmitBtn).toHaveTextContent('Resubmit Record');
      fireEvent.click(modalResubmitBtn);

      await waitFor(() => {
        expect(modalResubmitBtn).toHaveTextContent('Resubmitted');
        expect(modalResubmitBtn).toBeDisabled();
      });
    });
  });

  // =========================================================================
  // Scenario 7: Clicking on file name in ProcessWorkspace execution queue
  // =========================================================================
  describe('Scenario: ProcessWorkspace Execution Queue file click integration', () => {
    const sampleJobs: FileExecutionJob[] = [
      {
        id: 'job-cmo-001',
        processId: 'customer-master-onboarding',
        fileName: 'customers_q4_enterprise.csv',
        fileSizeBytes: 4528190,
        stage: 'IN_FLIGHT',
        status: 'RUNNING',
        totalRecords: 10000,
        processedRecords: 6500,
        failedRecords: 20,
        submittedAt: new Date().toISOString(),
        checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: 'virtual-worker-101-loom-04'
      }
    ];

    it('clicking file name in table view triggers onInspectErrors', () => {
      const handleInspect = vi.fn();
      render(
        <ExecutionQueue
          jobs={sampleJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={handleInspect}
        />
      );

      const fileClick = screen.getByTestId('file-name-click-job-cmo-001');
      expect(fileClick).toBeInTheDocument();
      fireEvent.click(fileClick);
      expect(handleInspect).toHaveBeenCalledWith('job-cmo-001');
    });

    it('clicking file name in card view triggers onInspectErrors', () => {
      const handleInspect = vi.fn();
      render(
        <ExecutionQueue
          jobs={sampleJobs}
          viewMode="card"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={handleInspect}
        />
      );

      const cardFileClick = screen.getByTestId('card-file-name-click-job-cmo-001');
      expect(cardFileClick).toBeInTheDocument();
      fireEvent.click(cardFileClick);
      expect(handleInspect).toHaveBeenCalledWith('job-cmo-001');
    });
  });

  // =========================================================================
  // Scenario 8: Admin Studio Route Edit Button & Pipeline Wizard Integration
  // =========================================================================
  describe('Scenario: Admin Studio route edit button and pipeline wizard integration', () => {
    it('clicking Edit button on a route opens wizard pre-populated with route config and saves changes', () => {
      const mockRoute = {
        routeId: 'route-cust-onboarding',
        name: 'Customer Master Onboarding',
        status: 'ACTIVE',
        sourceEndpoint: 'file://data/inbox',
        splitterInstanceId: 'splitter-csv-univocity',
        validatorInstanceId: 'val-kyc-01',
        processorInstanceId: 'proc-enricher-01',
        writerInstanceId: 'writer-csv-summary',
        batchSize: 500,
        parallelConsumers: 4
      };

      let editedRoute: any = null;
      let savedPipeline: any = null;

      // 1. Render AdminRouteStudio and click Edit
      const { unmount } = render(
        <AdminRouteStudio
          routes={[mockRoute]}
          onToggleStatus={() => {}}
          onEditRoute={(r) => { editedRoute = r; }}
          onCreateRoute={() => {}}
        />
      );

      const editBtn = screen.getByTestId('edit-route-btn-route-cust-onboarding');
      expect(editBtn).toBeInTheDocument();
      expect(editBtn).toHaveTextContent('Edit');
      fireEvent.click(editBtn);

      expect(editedRoute).not.toBeNull();
      expect(editedRoute.routeId).toBe('route-cust-onboarding');
      unmount();

      // 2. Render AdminPipelineWizard with the edited route as initialData
      render(
        <AdminPipelineWizard
          initialData={editedRoute}
          onSave={(data) => { savedPipeline = data; }}
          onCancel={() => {}}
        />
      );

      // Verify header and pre-filled input values
      expect(screen.getByText(/Edit Pipeline Route: Customer Master Onboarding/i)).toBeInTheDocument();
      const nameInput = screen.getByTestId('pipeline-name-input') as HTMLInputElement;
      expect(nameInput.value).toBe('Customer Master Onboarding');

      // Update name and click quick save
      fireEvent.change(nameInput, { target: { value: 'Customer Master Onboarding (Enterprise)' } });
      const quickSaveBtn = screen.getByTestId('quick-save-pipeline-btn');
      fireEvent.click(quickSaveBtn);

      expect(savedPipeline).not.toBeNull();
      expect(savedPipeline.processId).toBe('route-cust-onboarding');
      expect(savedPipeline.name).toBe('Customer Master Onboarding (Enterprise)');
    });
  });
});
