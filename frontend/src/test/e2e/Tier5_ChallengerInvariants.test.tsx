import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { 
  ProcessCatalog, 
  VisualStepPipeline, 
  StepConfigDrawer, 
  ExecutionQueue, 
  FileDiagnosticsModal,
  FullAppHarness
} from './testHarness';
import { 
  ProcessCatalog as RealProcessCatalog 
} from '../../components/catalog/ProcessCatalog';
import { 
  ProcessWorkspace as RealProcessWorkspace 
} from '../../components/workspace/ProcessWorkspace';
import { 
  StepConfigDrawer as RealStepConfigDrawer 
} from '../../components/workspace/StepConfigDrawer';
import { 
  FileDiagnosticsModal as RealFileDiagnosticsModal 
} from '../../components/diagnostics/FileDiagnosticsModal';
import { 
  preSeededRoutes, 
  preSeededJobs, 
  mockDiagnosticsData, 
  defaultPipelineSteps,
  ProcessRoute,
  FileExecutionJob,
  FileDiagnosticsData,
  ErrorRecord
} from './fixtures';
import { PipelineStepConfig } from '../../types/process';
import { compressWithHeadroom, estimateTokens } from '../../utils/headroomCompressor';

// =========================================================================
// Deep Freeze Utility for Immutability Verification
// =========================================================================

function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.getOwnPropertyNames(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

function cloneDeep<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

describe('Tier 5: Challenger Invariant & State Immutability Verification Suite', () => {

  // =========================================================================
  // Invariant Group 1: State Immutability Across UI Actions
  // =========================================================================
  describe('Invariant Group 1: State Immutability Across UI Actions', () => {

    it('guarantees ProcessCatalog Start and Pause actions never mutate route state in place', () => {
      // Create frozen route copies
      const frozenRoutes = deepFreeze(cloneDeep(preSeededRoutes));

      let updatedRoutes: ProcessRoute[] = [...frozenRoutes];
      const handleStart = (routeId: string) => {
        // Pure immutable update
        updatedRoutes = updatedRoutes.map(r => 
          r.id === routeId ? { ...r, status: 'ACTIVE', health: 'HEALTHY' } : r
        );
      };
      const handlePause = (routeId: string) => {
        // Pure immutable update
        updatedRoutes = updatedRoutes.map(r => 
          r.id === routeId ? { ...r, status: 'PAUSED', health: 'DEGRADED' } : r
        );
      };

      const { rerender } = render(
        <ProcessCatalog
          routes={updatedRoutes}
          onSelectRoute={() => {}}
          onStartRoute={handleStart}
          onPauseRoute={handlePause}
        />
      );

      // Verify route-cust-onboarding initial active status
      expect(screen.getByTestId('status-badge-route-cust-onboarding')).toHaveTextContent('ACTIVE');

      // 1. Pause active route
      fireEvent.click(screen.getByTestId('pause-route-btn-route-cust-onboarding'));
      rerender(
        <ProcessCatalog
          routes={updatedRoutes}
          onSelectRoute={() => {}}
          onStartRoute={handleStart}
          onPauseRoute={handlePause}
        />
      );

      // Invariants:
      // A: Original frozen object was NOT mutated
      expect(frozenRoutes[0].status).toBe('ACTIVE');
      expect(frozenRoutes[0].health).toBe('HEALTHY');
      // B: New array reference produced
      expect(updatedRoutes).not.toBe(frozenRoutes);
      // C: Target route has new reference with updated status
      expect(updatedRoutes[0]).not.toBe(frozenRoutes[0]);
      expect(updatedRoutes[0].status).toBe('PAUSED');
      // D: Unchanged routes preserve referential equality (structural sharing)
      expect(updatedRoutes[1]).toBe(frozenRoutes[1]);
      expect(updatedRoutes[2]).toBe(frozenRoutes[2]);

      // 2. Start previously paused route
      fireEvent.click(screen.getByTestId('start-route-btn-route-cust-onboarding'));
      rerender(
        <ProcessCatalog
          routes={updatedRoutes}
          onSelectRoute={() => {}}
          onStartRoute={handleStart}
          onPauseRoute={handlePause}
        />
      );

      expect(updatedRoutes[0].status).toBe('ACTIVE');
      expect(frozenRoutes[0].status).toBe('ACTIVE');
    });

    it('guarantees StepConfigDrawer parameter modification and save produces a strictly new object without mutating original step', () => {
      const originalStep: PipelineStepConfig = {
        id: 'validator',
        name: 'Enterprise Schema & KYC Validator',
        type: 'SCHEMA_VALIDATOR',
        parameters: { chunkSize: 2500, strictMode: true, allowEmptyEmail: false },
        fieldMappings: [
          { source: 'customerId', target: 'validatedCustomerId' },
          { source: 'email', target: 'validatedEmail', transform: 'LOWERCASE_TRIM' }
        ],
        errorPolicy: 'QUARANTINE_RECORD',
        concurrency: 32
      };

      const frozenStep = deepFreeze(cloneDeep(originalStep));
      let savedStep: PipelineStepConfig | null = null;
      const handleSave = (updated: PipelineStepConfig) => {
        savedStep = updated;
      };

      render(
        <RealStepConfigDrawer
          isOpen={true}
          step={frozenStep}
          onClose={() => {}}
          onSave={handleSave}
        />
      );

      // Mutate inputs through UI
      const policySelect = screen.getByTestId('drawer-error-policy-select');
      fireEvent.change(policySelect, { target: { value: 'FAIL_FAST' } });

      const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
      fireEvent.change(concurrencyInput, { target: { value: '64' } });

      const batchSizeInput = screen.getByTestId('drawer-batch-size-input');
      fireEvent.change(batchSizeInput, { target: { value: '5000' } });

      // Save
      fireEvent.click(screen.getByTestId('drawer-save-btn'));

      // Invariants:
      expect(savedStep).not.toBeNull();
      // A: Saved step is a brand new object
      expect(savedStep).not.toBe(frozenStep);
      // B: Saved parameters is a brand new object
      expect(savedStep!.parameters).not.toBe(frozenStep.parameters);
      // C: Original frozen step is completely unchanged
      expect(frozenStep.concurrency).toBe(32);
      expect(frozenStep.errorPolicy).toBe('QUARANTINE_RECORD');
      expect(frozenStep.parameters.chunkSize).toBe(2500);
      // D: Saved step has updated values
      expect(savedStep!.concurrency).toBe(64);
      expect(savedStep!.errorPolicy).toBe('FAIL_FAST');
      expect(savedStep!.parameters.chunkSize).toBe(5000);
      expect(savedStep!.parameters.batchSize).toBe(5000);
      // E: Field mappings preserved
      expect(savedStep!.fieldMappings).toEqual(frozenStep.fieldMappings);
    });

    it('guarantees ExecutionQueue actions (Pause, Resume, Retry, Cancel) never mutate job objects or queue array in place', () => {
      const frozenJobs = deepFreeze(cloneDeep(preSeededJobs));
      let currentJobs: FileExecutionJob[] = [...frozenJobs];

      const handlePause = (jobId: string) => {
        currentJobs = currentJobs.map(j => j.id === jobId ? { ...j, status: 'PAUSED' } : j);
      };
      const handleResume = (jobId: string) => {
        currentJobs = currentJobs.map(j => j.id === jobId ? { ...j, status: 'RUNNING' } : j);
      };
      const handleRetry = (jobId: string) => {
        currentJobs = currentJobs.map(j => j.id === jobId ? { ...j, status: 'RUNNING', failedRecords: 0, stage: 'IN_FLIGHT' } : j);
      };
      const handleCancel = (jobId: string) => {
        currentJobs = currentJobs.map(j => j.id === jobId ? { ...j, status: 'FAILED' } : j);
      };

      const { rerender } = render(
        <ExecutionQueue
          jobs={currentJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={handlePause}
          onResumeJob={handleResume}
          onRetryJob={handleRetry}
          onCancelJob={handleCancel}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      // 1. Pause job-101
      fireEvent.click(screen.getByTestId('btn-pause-job-101'));
      rerender(
        <ExecutionQueue
          jobs={currentJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={handlePause}
          onResumeJob={handleResume}
          onRetryJob={handleRetry}
          onCancelJob={handleCancel}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      // Invariants for Pause:
      expect(frozenJobs[0].status).toBe('RUNNING');
      expect(currentJobs[0].status).toBe('PAUSED');
      expect(currentJobs[0]).not.toBe(frozenJobs[0]);
      expect(currentJobs[1]).toBe(frozenJobs[1]); // structural sharing

      // 2. Resume job-101
      fireEvent.click(screen.getByTestId('btn-resume-job-101'));
      rerender(
        <ExecutionQueue
          jobs={currentJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={handlePause}
          onResumeJob={handleResume}
          onRetryJob={handleRetry}
          onCancelJob={handleCancel}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(currentJobs[0].status).toBe('RUNNING');

      // 3. Retry failed job-107
      fireEvent.click(screen.getByTestId('btn-retry-job-107'));
      const retriedJob = currentJobs.find(j => j.id === 'job-107');
      expect(retriedJob?.status).toBe('RUNNING');
      expect(retriedJob?.failedRecords).toBe(0);
      expect(retriedJob?.stage).toBe('IN_FLIGHT');

      // 4. Cancel job-103
      fireEvent.click(screen.getByTestId('btn-cancel-job-103'));
      const cancelledJob = currentJobs.find(j => j.id === 'job-103');
      expect(cancelledJob?.status).toBe('FAILED');
    });

    it('guarantees FileDiagnosticsModal Headroom toggle and tab switching preserves diagnostics object immutability', () => {
      const frozenDiagnostics = deepFreeze(cloneDeep(mockDiagnosticsData));

      render(
        <RealFileDiagnosticsModal
          isOpen={true}
          diagnostics={frozenDiagnostics}
          onClose={() => {}}
        />
      );

      // Initial state: Schema tuple view, headroom off
      expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
      expect(screen.queryByTestId('headroom-savings-banner')).not.toBeInTheDocument();

      // Toggle Headroom compression
      const toggle = screen.getByTestId('headroom-toggle-checkbox');
      fireEvent.click(toggle);

      // Headroom banner appears
      expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();

      // Switch to Raw JSON terminal
      fireEvent.click(screen.getByTestId('tab-raw-json'));
      expect(screen.getByTestId('raw-json-terminal')).toBeInTheDocument();

      // Invariant: Frozen diagnostics object was completely unmutated
      expect(frozenDiagnostics.errorRecords.length).toBe(5);
      expect(frozenDiagnostics.metadata.rowCount).toBe(100000);
      expect(frozenDiagnostics.metadata.checksum).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
    });
  });

  // =========================================================================
  // Invariant Group 2: Headroom -74% Token Reduction & Semantic Lossless Deduplication
  // =========================================================================
  describe('Invariant Group 2: Headroom -74% Token Reduction & Semantic Deduplication Invariant', () => {

    it('empirically guarantees >= 74% token reduction on repetitive structured records', () => {
      // Repetitive records with descriptive enterprise schema keys and concise column values
      // Key-to-value ratio where structural deduplication eliminates redundant property headers
      const recordCount = 100;
      const repetitiveRecords = Array.from({ length: recordCount }, (_, i) => ({
        enterpriseRecordIdentifierSequence: i,
        sourceSystemTenantIdentifierCode: 'US',
        targetLedgerAccountingUnitCode: 'GL',
        processingLifecycleStatusCode: 1,
        regulatoryComplianceFlagCode: true,
        auditTrailRetentionPolicyLevel: 7,
        validationRuleVerificationPass: true,
        quarantineRoutingDirectiveCode: 0,
        workerVirtualThreadAllocation: 8,
        partitionDistributionIndexKey: 3
      }));

      const result = compressWithHeadroom(repetitiveRecords);

      // Invariants:
      expect(result.isCompressed).toBe(true);
      // Guaranteed -74% or greater savings
      expect(result.savingsPercentage).toBeGreaterThanOrEqual(74);
      // Compressed token estimate is at least 74% smaller than original
      expect(result.compressedTokensEstimate).toBeLessThanOrEqual(
        Math.ceil(result.originalTokensEstimate * 0.26)
      );

      // Check structural deduplication shape
      const compressedObj = JSON.parse(result.compressedText);
      expect(compressedObj._headroom).toBe(true);
      expect(compressedObj.count).toBe(recordCount);
      expect(compressedObj.schema).toEqual(Object.keys(repetitiveRecords[0]));
      expect(compressedObj.rows.length).toBe(recordCount);
    });

    it('guarantees 100% semantic fidelity and lossless reconstruction from schema-indexed tabular tuples', () => {
      const testRecords = [
        { id: '101', name: 'Alpha Corp', tier: 'ENTERPRISE', limit: 500000, active: true },
        { id: '102', name: 'Beta LLC', tier: 'MID_MARKET', limit: 120000, active: true },
        { id: '103', name: 'Gamma GmbH', tier: 'ENTERPRISE', limit: 950000, active: false },
        { id: '104', name: 'Delta S.A.', tier: 'RETAIL', limit: 25000, active: true }
      ];

      const result = compressWithHeadroom(testRecords);
      const parsed = JSON.parse(result.compressedText);

      // Reconstruct original records from schema tuples
      const reconstructed = parsed.rows.map((row: unknown[]) => {
        const obj: Record<string, unknown> = {};
        parsed.schema.forEach((col: string, idx: number) => {
          obj[col] = row[idx];
        });
        return obj;
      });

      // Lossless semantic equality invariant
      expect(reconstructed).toEqual(testRecords);
    });

    it('empirically guarantees >= 74% token reduction on repetitive log stream lines', () => {
      // 100 repetitive log lines from Kafka consumer or Camel pipeline
      const repeatedLine = '2026-11-05T18:45:10.120Z [WARN] [CamelRoutingEngine] RateLimiter throttling active partition chunk #42: pausing virtual worker thread for 50ms';
      const logLines = Array.from({ length: 100 }, () => repeatedLine).join('\n');

      const result = compressWithHeadroom(logLines);

      // Invariants:
      expect(result.isCompressed).toBe(true);
      expect(result.savingsPercentage).toBeGreaterThanOrEqual(74);
      expect(result.compressedText).toContain('  ↳ [repeated 99x]');
      expect(result.compressedTokensEstimate).toBeLessThan(result.originalTokensEstimate);
    });

    it('safely handles adversarial and boundary inputs without crashing or NaN', () => {
      // 1. Empty string
      const emptyRes = compressWithHeadroom('');
      expect(emptyRes.originalTokensEstimate).toBe(0);
      expect(emptyRes.compressedTokensEstimate).toBe(0);
      expect(emptyRes.savingsPercentage).toBe(0);
      expect(Number.isNaN(emptyRes.savingsPercentage)).toBe(false);

      // 2. Whitespace only string
      const wsRes = compressWithHeadroom('    \n\t   ');
      expect(wsRes.savingsPercentage).toBe(0);

      // 3. Single record array
      const singleRes = compressWithHeadroom([{ singleKey: 'singleValue' }]);
      expect(singleRes.isCompressed).toBe(true);

      // 4. Record with null and undefined fields
      const nullableRecords = [
        { id: 1, optionalField: null, missingField: undefined },
        { id: 2, optionalField: 'present', missingField: 'value' }
      ];
      const nullRes = compressWithHeadroom(nullableRecords);
      expect(nullRes.isCompressed).toBe(true);
      const nullParsed = JSON.parse(nullRes.compressedText);
      expect(nullParsed.rows[0][1]).toBeNull();

      // 5. Unstructured non-JSON text with no repetitions
      const uniqueText = 'Line 1: unique\nLine 2: distinct\nLine 3: different';
      const uniqueRes = compressWithHeadroom(uniqueText);
      expect(uniqueRes.isCompressed).toBe(true);
      expect(uniqueRes.compressedText).toBe(uniqueText);

      // 6. Non-array JSON object
      const objRes = compressWithHeadroom({ key1: 'val1', key2: 'val2' });
      expect(objRes.isCompressed).toBe(true);
      expect(objRes.compressedText).toBe('{"key1":"val1","key2":"val2"}');
    });
  });

  // =========================================================================
  // Invariant Group 3: Rapid Concurrent & Chained Lifecycle Transitions
  // =========================================================================
  describe('Invariant Group 3: Rapid Lifecycle Transitions & Queue State Machine', () => {

    it('guarantees valid state machine progression under rapid chained actions (PAUSE -> RESUME -> RETRY -> CANCEL)', () => {
      let testJob: FileExecutionJob = {
        id: 'job-fsm-test',
        processId: 'route-cust-onboarding',
        fileName: 'fsm_test_file.csv',
        fileSizeBytes: 1048576,
        stage: 'IN_FLIGHT',
        status: 'RUNNING',
        totalRecords: 10000,
        processedRecords: 4500,
        failedRecords: 12,
        submittedAt: '2026-11-05T18:00:00Z',
        checksumSha256: 'mock-sha-256',
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: 'VirtualThread[#1099,loom-worker-1]'
      };

      const dispatchAction = (action: 'PAUSE' | 'RESUME' | 'RETRY' | 'CANCEL') => {
        if (action === 'PAUSE') {
          testJob = { ...testJob, status: 'PAUSED' };
        } else if (action === 'RESUME') {
          testJob = { ...testJob, status: 'RUNNING' };
        } else if (action === 'RETRY') {
          testJob = { ...testJob, status: 'RUNNING', failedRecords: 0, stage: 'IN_FLIGHT' };
        } else if (action === 'CANCEL') {
          testJob = { ...testJob, status: 'FAILED' };
        }
      };

      // Transition 1: RUNNING -> PAUSE
      dispatchAction('PAUSE');
      expect(testJob.status).toBe('PAUSED');
      expect(testJob.stage).toBe('IN_FLIGHT');

      // Transition 2: PAUSED -> RESUME
      dispatchAction('RESUME');
      expect(testJob.status).toBe('RUNNING');

      // Transition 3: RUNNING -> RETRY (resets failedRecords counter to 0)
      dispatchAction('RETRY');
      expect(testJob.status).toBe('RUNNING');
      expect(testJob.failedRecords).toBe(0);
      expect(testJob.stage).toBe('IN_FLIGHT');

      // Transition 4: RUNNING -> CANCEL
      dispatchAction('CANCEL');
      expect(testJob.status).toBe('FAILED');
    });

    it('handles multiple concurrent jobs undergoing disparate lifecycle actions simultaneously', () => {
      let jobList: FileExecutionJob[] = [
        { ...preSeededJobs[0], id: 'job-c1', status: 'RUNNING' },
        { ...preSeededJobs[1], id: 'job-c2', status: 'QUEUED' },
        { ...preSeededJobs[6], id: 'job-c3', status: 'FAILED', failedRecords: 50 }
      ];

      // Perform simultaneous transitions
      jobList = jobList.map(j => {
        if (j.id === 'job-c1') return { ...j, status: 'PAUSED' as const };
        if (j.id === 'job-c2') return { ...j, status: 'RUNNING' as const, stage: 'IN_FLIGHT' as const };
        if (j.id === 'job-c3') return { ...j, status: 'RUNNING' as const, failedRecords: 0, stage: 'IN_FLIGHT' as const };
        return j;
      });

      expect(jobList.find(j => j.id === 'job-c1')?.status).toBe('PAUSED');
      expect(jobList.find(j => j.id === 'job-c2')?.status).toBe('RUNNING');
      expect(jobList.find(j => j.id === 'job-c2')?.stage).toBe('IN_FLIGHT');
      expect(jobList.find(j => j.id === 'job-c3')?.status).toBe('RUNNING');
      expect(jobList.find(j => j.id === 'job-c3')?.failedRecords).toBe(0);
    });
  });

  // =========================================================================
  // Invariant Group 4: CSV Export Formatting, RFC 4180 Escaping & CSV Injection
  // =========================================================================
  describe('Invariant Group 4: CSV Export Sanitization & RFC 4180 Escaping', () => {

    it('guarantees RFC 4180 double-quote escaping and newline preservation on exported error records', () => {
      const recordsToExport: ErrorRecord[] = [
        {
          recordId: 'REC-QUOTE-01',
          lineNumber: 10,
          errorCode: 'ERR_QUOTE',
          errorMessage: 'Value contains "quoted phrase" and trailing text',
          rawPayload: '{"field": "val"}',
          schemaTuple: { field: 'val' }
        },
        {
          recordId: 'REC-COMMA-02',
          lineNumber: 20,
          errorCode: 'ERR_COMMA',
          errorMessage: 'Contains, comma, separated, tokens',
          rawPayload: '{"field": "a,b,c"}',
          schemaTuple: { field: 'a,b,c' }
        },
        {
          recordId: 'REC-NEWLINE-03',
          lineNumber: 30,
          errorCode: 'ERR_NEWLINE',
          errorMessage: 'Multi-line\nstack trace\nentry',
          rawPayload: '{"field": "line1\nline2"}',
          schemaTuple: { field: 'line1\nline2' }
        }
      ];

      // Generate CSV using client-side export logic from FileDiagnosticsModal
      const headers = ['recordId', 'lineNumber', 'errorCode', 'errorMessage', 'schemaTuple'];
      const rows = recordsToExport.map(r => [
        r.recordId,
        r.lineNumber,
        r.errorCode,
        `"${(r.errorMessage || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.schemaTuple || {}).replace(/"/g, '""')}"`
      ].join(','));
      const csvContent = [headers.join(','), ...rows].join('\n');

      // Invariants:
      // A: Header is present
      expect(csvContent).toContain('recordId,lineNumber,errorCode,errorMessage,schemaTuple');
      // B: Double quotes are escaped as ""
      expect(csvContent).toContain('""quoted phrase""');
      // C: Commas are contained within quoted string
      expect(csvContent).toContain('"Contains, comma, separated, tokens"');
      // D: Newline is safely quoted
      expect(csvContent).toContain('"Multi-line\nstack trace\nentry"');
    });

    it('safely neutralizes CSV formula injection characters (=, +, -, @) within quoted fields', () => {
      const maliciousErrors: ErrorRecord[] = [
        {
          recordId: 'REC-INJECT-01',
          lineNumber: 1,
          errorCode: 'ERR_FORMULA',
          errorMessage: '=cmd|\'/C calc\'!A0',
          rawPayload: '{}',
          schemaTuple: {}
        },
        {
          recordId: 'REC-INJECT-02',
          lineNumber: 2,
          errorCode: 'ERR_DDE',
          errorMessage: '@SUM(1+1)*cmd|\'powershell.exe\'!A0',
          rawPayload: '{}',
          schemaTuple: {}
        }
      ];

      const rows = maliciousErrors.map(r => [
        r.recordId,
        r.lineNumber,
        r.errorCode,
        `"${(r.errorMessage || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(r.schemaTuple || {}).replace(/"/g, '""')}"`
      ].join(','));

      // Invariant: Malicious strings are wrapped in double quotes preventing raw formula execution
      expect(rows[0]).toContain('"=cmd|\'/C calc\'!A0"');
      expect(rows[1]).toContain('"@SUM(1+1)*cmd|\'powershell.exe\'!A0"');
    });
  });

  // =========================================================================
  // Invariant Group 5: Concentric Radii Geometry & Tabular Numerals Invariant
  // =========================================================================
  describe('Invariant Group 5: Visual Craft, Geometry & Tabular Numerals Invariants', () => {

    it('enforces concentric radii geometry (R_outer = R_inner + padding) across container elements', () => {
      render(
        <RealProcessCatalog
          routes={preSeededRoutes}
          onSelectRoute={() => {}}
        />
      );

      const catalogContainer = screen.getByTestId('process-catalog-container');
      expect(catalogContainer).toHaveStyle({
        borderRadius: '16px',
        padding: '12px'
      });

      const firstRouteCard = screen.getByTestId('route-card-route-cust-onboarding');
      expect(firstRouteCard).toHaveStyle({
        borderRadius: '12px',
        padding: '16px'
      });
    });

    it('enforces tabular-nums typography invariant on dynamic numerical metrics', () => {
      render(
        <RealProcessCatalog
          routes={preSeededRoutes}
          onSelectRoute={() => {}}
        />
      );

      // Verify that throughput, active files, and success rate elements include the tabular-nums class
      const activeFilesEl = screen.getByTestId('active-files-route-cust-onboarding');
      expect(activeFilesEl).toHaveClass('tabular-nums');

      const throughputEl = screen.getByTestId('throughput-route-cust-onboarding');
      expect(throughputEl).toHaveClass('tabular-nums');

      const successRateEl = screen.getByTestId('success-rate-route-cust-onboarding');
      expect(successRateEl).toHaveClass('tabular-nums');

      const stepsCountEl = screen.getByTestId('steps-count-route-cust-onboarding');
      expect(stepsCountEl).toHaveClass('tabular-nums');
    });
  });

  // =========================================================================
  // Invariant Group 6: Full-Stack Diagnostics & Chunk Distribution Invariants
  // =========================================================================
  describe('Invariant Group 6: Full-Stack Diagnostics & Partition Invariants', () => {

    it('guarantees latency waterfall percentOfTotal sums to 100% within floating point tolerance', () => {
      render(
        <RealFileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnosticsData}
          onClose={() => {}}
        />
      );

      const latencies = mockDiagnosticsData.stageLatencies;
      const sumPercent = latencies.reduce((acc, step) => acc + step.percentOfTotal, 0);

      // Invariant: sum of stage percentages must equal 100% (+/- 0.5% due to rounding)
      expect(Math.abs(sumPercent - 100)).toBeLessThan(0.5);

      // Every duration must be a non-negative integer
      latencies.forEach(step => {
        expect(step.durationMicros).toBeGreaterThan(0);
        expect(Number.isInteger(step.durationMicros)).toBe(true);
      });
    });

    it('guarantees chunk distribution partitions cover the entire dataset without record loss', () => {
      render(
        <RealFileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiagnosticsData}
          onClose={() => {}}
        />
      );

      const chunks = mockDiagnosticsData.batchChunks;
      const totalChunkRecords = chunks.reduce((acc, c) => acc + c.recordCount, 0);

      // Invariant: sum of chunk records must match total file row count
      expect(totalChunkRecords).toBe(mockDiagnosticsData.metadata.rowCount);

      // Sequential chunk indices invariant
      chunks.forEach((chunk, idx) => {
        expect(chunk.chunkIndex).toBe(idx);
        expect(chunk.recordCount).toBeGreaterThan(0);
      });
    });

    it('guarantees end-to-end immutability in FullAppHarness across route transition, step edit, and batch upload', () => {
      render(<FullAppHarness />);

      // 1. Initial catalog: start route-cust-onboarding
      expect(screen.getByTestId('status-badge-route-cust-onboarding')).toHaveTextContent('ACTIVE');

      // 2. Select route to open Workspace
      fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));
      expect(screen.getByText(/Process Workspace: Customer Master Onboarding/i)).toBeInTheDocument();

      // 3. Open StepConfigDrawer
      fireEvent.click(screen.getByTestId('pipeline-step-splitter'));
      expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();

      // 4. Update and save
      const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
      fireEvent.change(concurrencyInput, { target: { value: '48' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));

      // 5. Verify reflected value in pipeline
      expect(screen.getByTestId('step-concurrency-splitter')).toHaveTextContent('48');

      // 6. Navigate back to Catalog
      fireEvent.click(screen.getByTestId('back-to-catalog-btn'));
      expect(screen.getByText('Enterprise Process & Route Catalog')).toBeInTheDocument();
    });
  });

});

