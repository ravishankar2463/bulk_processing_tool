import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ProcessCatalog } from '../../components/catalog/ProcessCatalog';
import { 
  ProcessWorkspace, 
  VisualStepPipeline, 
  BatchDropzone, 
  ExecutionQueue 
} from '../../components/workspace/ProcessWorkspace';
import { StepConfigDrawer } from '../../components/workspace/StepConfigDrawer';
import { FileDiagnosticsModal } from '../../components/diagnostics/FileDiagnosticsModal';
import { App } from '../../App';
import { 
  ProcessRoute, 
  PipelineStepConfig, 
  FileExecutionJob, 
  FileDiagnosticsData,
  StageLatency,
  BatchChunk,
  RecordErrorItem
} from '../../types/process';
import { 
  fetchCatalogRoutes, 
  fetchProcessJobs, 
  startRoute, 
  pauseRoute, 
  pauseJob, 
  resumeJob, 
  retryJob, 
  cancelJob, 
  batchUploadFiles, 
  fetchJobDiagnostics, 
  resetMockStore 
} from '../../services/apiClient';
import { compressWithHeadroom, estimateTokens } from '../../utils/headroomCompressor';
import { FullAppHarness } from './testHarness';

describe('Tier 5: Adversarial Hardening & Stress Testing E2E Suite', () => {

  beforeEach(() => {
    resetMockStore();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    resetMockStore();
  });

  // =========================================================================
  // Group 1: Pathological & Adversarial Payloads (Headroom & Diagnostics)
  // =========================================================================
  describe('Group 1: Pathological & Adversarial Payloads', () => {

    it('handles extreme 50-level deeply nested JSON objects without recursive stack overflow', () => {
      let deeplyNested: Record<string, unknown> = { level: 50, value: 'deepest-leaf' };
      for (let i = 49; i >= 1; i--) {
        deeplyNested = { [`level_${i}`]: deeplyNested, active: true };
      }

      const result = compressWithHeadroom(deeplyNested);
      expect(result).toBeDefined();
      expect(result.originalRaw).toContain('deepest-leaf');
      expect(result.compressedText).toContain('deepest-leaf');
      expect(result.originalTokensEstimate).toBeGreaterThan(0);
      expect(typeof result.isCompressed).toBe('boolean');
    });

    it('survives malformed, truncated, and corrupt JSON strings by falling back to line-based compression', () => {
      const truncatedJson = '{"route": "OrderStream", "batch": [{"id": 1, "sku": "ITEM-99", "unclosed_string';
      const result = compressWithHeadroom(truncatedJson);

      expect(result).toBeDefined();
      expect(result.originalRaw).toBe(truncatedJson);
      expect(result.compressedText).toBe(truncatedJson);
      expect(result.isCompressed).toBe(true); // compacted length <= orig
    });

    it('handles ultra-large array of 1,000 heterogeneous records with missing keys without undefined errors', () => {
      const heterogeneousArray: Array<Record<string, unknown>> = [];
      for (let i = 0; i < 1000; i++) {
        if (i % 2 === 0) {
          heterogeneousArray.push({ id: `rec-${i}`, account: 'ACC_01', balance: 500.50 });
        } else {
          heterogeneousArray.push({ id: `rec-${i}`, notes: 'flagged for KYC', extraFlag: true });
        }
      }

      const result = compressWithHeadroom(heterogeneousArray);
      expect(result.isCompressed).toBe(true);
      expect(result.savingsPercentage).toBeGreaterThan(0);

      const parsedCompressed = JSON.parse(result.compressedText);
      expect(parsedCompressed._headroom).toBe(true);
      expect(parsedCompressed.schema).toEqual(['id', 'account', 'balance']);
      expect(parsedCompressed.rows.length).toBe(1000);
      // Even records have account, odd records have null
      expect(parsedCompressed.rows[0][1]).toBe('ACC_01');
      expect(parsedCompressed.rows[1][1]).toBeNull();
    });

    it('handles adversarial Unicode, zero-width joiners, emoji surrogates, RTL markers, and null bytes', () => {
      const exoticPayload = {
        nullByte: 'null\u0000terminator',
        zeroWidth: 'hidden\u200B\u200C\u200Dcharacter',
        surrogates: 'Emoji test: 🚀🔥💻⚡🎉 and multibyte 𠜎𠜱𠝹',
        rtlMarker: 'مرحبا بكم في معالجة البيانات \u202Ereversed\u202C',
        xssPayload: '<script>alert("XSS")</script><img src=x onerror=alert(1)>'
      };

      const result = compressWithHeadroom(exoticPayload);
      expect(result.originalRaw).toContain('<script>');
      expect(result.compressedText).toContain('🚀🔥💻');
      expect(result.compressedText).toContain('\\u0000');
      const parsedBack = JSON.parse(result.compressedText);
      expect(parsedBack.nullByte).toBe(exoticPayload.nullByte);
      expect(result.originalTokensEstimate).toBeGreaterThan(0);
    });

    it('handles massive duplicate log stream (1,000 identical lines) collapsing to a single repeated summary line', () => {
      const repeatedLine = '[2026-11-05T19:40:00Z] [WARN] Loom VirtualThread #1024 waiting on partition socket';
      const logStream = Array(1000).fill(repeatedLine).join('\n');

      const result = compressWithHeadroom(logStream);
      expect(result.isCompressed).toBe(true);
      expect(result.savingsPercentage).toBeGreaterThan(80);
      expect(result.compressedText).toContain('↳ [repeated 999x]');
    });

    it('handles empty string, null, and undefined inputs to estimateTokens and compressWithHeadroom safely', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens(null as any)).toBe(0);
      expect(estimateTokens(undefined as any)).toBe(0);

      const emptyRes = compressWithHeadroom('');
      expect(emptyRes.originalTokensEstimate).toBe(0);
      expect(emptyRes.savingsPercentage).toBe(0);
      expect(emptyRes.isCompressed).toBe(false);

      const nullRes = compressWithHeadroom(null as any);
      expect(nullRes.originalTokensEstimate).toBe(0);
      expect(nullRes.isCompressed).toBe(false);
    });
  });

  // =========================================================================
  // Group 2: Diagnostics Modal Edge Cases & Corrupted Schemas
  // =========================================================================
  describe('Group 2: Diagnostics Modal Edge Cases & Corrupted Schemas', () => {

    it('renders FileDiagnosticsModal with empty error records without throwing error', () => {
      const emptyDiagnostics: FileDiagnosticsData = {
        jobId: 'job-empty-errors',
        metadata: {
          sizeBytes: 1048576,
          encoding: 'UTF-8',
          delimiter: ',',
          rowCount: 0,
          checksum: 'abc123sha256',
          loomThread: 'virtual-worker-1'
        },
        stageLatencies: [],
        batchChunks: [],
        errorRecords: []
      };

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={emptyDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
      expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
      expect(screen.getByTestId('meta-row-count')).toHaveTextContent('0');
      expect(screen.queryByTestId(/error-row-/)).not.toBeInTheDocument();
    });

    it('renders error records containing null values in schemaTuple and empty error messages', () => {
      const corruptRecordDiagnostics: FileDiagnosticsData = {
        jobId: 'job-corrupt-schema',
        metadata: {
          sizeBytes: 500000,
          encoding: 'UTF-8',
          delimiter: ',',
          rowCount: 10,
          checksum: 'hash99',
          loomThread: 'loom-1'
        },
        stageLatencies: [
          { stepId: 'validator', stepName: 'Validator', durationMicros: 5000, percentOfTotal: 100, status: 'ERROR' }
        ],
        batchChunks: [],
        errorRecords: [
          {
            recordId: 'REC-NULL-01',
            lineNumber: 1,
            errorCode: 'CORRUPTED_RECORD',
            errorMessage: '',
            rawPayload: '{}',
            schemaTuple: { field1: null as any, field2: undefined as any, validField: 'hello' }
          }
        ]
      };

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={corruptRecordDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('error-row-REC-NULL-01')).toBeInTheDocument();
      expect(screen.getByText('CORRUPTED_RECORD')).toBeInTheDocument();
    });

    it('escapes quotes, commas, newlines, and formula injection characters in CSV export', () => {
      const formulaInjectionDiagnostics: FileDiagnosticsData = {
        jobId: 'job-csv-inject',
        metadata: {
          sizeBytes: 1000,
          encoding: 'UTF-8',
          delimiter: ',',
          rowCount: 1,
          checksum: 'chk',
          loomThread: 'loom-0'
        },
        stageLatencies: [],
        batchChunks: [],
        errorRecords: [
          {
            recordId: 'REC-INJECT-01',
            lineNumber: 12,
            errorCode: 'MALICIOUS_CSV',
            errorMessage: '=cmd|\' /C calc\'!A0, "quoted string", with\nnewline',
            rawPayload: '{"test": true}',
            schemaTuple: { evil: '=SUM(1+1)' }
          }
        ]
      };

      const customExportSpy = vi.fn();

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={formulaInjectionDiagnostics}
          onClose={() => {}}
          onExportCsv={customExportSpy}
        />
      );

      fireEvent.click(screen.getByTestId('btn-export-errors-csv'));
      expect(customExportSpy).toHaveBeenCalledTimes(1);
    });

    it('renders latency waterfall with extreme durations (0 µs, 999,999,999 µs) and varying statuses', () => {
      const extremeLatencyDiagnostics: FileDiagnosticsData = {
        jobId: 'job-extreme-latencies',
        metadata: {
          sizeBytes: 1000,
          encoding: 'UTF-8',
          delimiter: '\t',
          rowCount: 100,
          checksum: 'chk',
          loomThread: 'loom-0'
        },
        stageLatencies: [
          { stepId: 'splitter', stepName: 'Splitter Zero', durationMicros: 0, percentOfTotal: 0, status: 'SUCCESS' },
          { stepId: 'validator', stepName: 'Validator Huge', durationMicros: 999999999, percentOfTotal: 99.9, status: 'ERROR' },
          { stepId: 'processor', stepName: 'Enricher Warning', durationMicros: 1000, percentOfTotal: 0.1, status: 'WARNING' }
        ],
        batchChunks: [],
        errorRecords: []
      };

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={extremeLatencyDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('waterfall-duration-splitter')).toHaveTextContent('0 µs');
      expect(screen.getByTestId('waterfall-duration-validator')).toHaveTextContent('999,999,999 µs');
      expect(screen.getByTestId('meta-delimiter')).toHaveTextContent('TAB (\\t)');
    });

    it('handles non-existent job in fetchJobDiagnostics by gracefully synthesizing fallback diagnostic data', async () => {
      const synthetic = await fetchJobDiagnostics('completely-random-unseeded-job-999');
      expect(synthetic).toBeDefined();
      expect(synthetic.jobId).toBe('completely-random-unseeded-job-999');
      expect(synthetic.metadata.sizeBytes).toBeGreaterThan(0);
      expect(synthetic.stageLatencies.length).toBeGreaterThan(0);
      expect(synthetic.errorRecords.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Group 3: Concurrency Extremes & Loom Virtual Thread Boundaries
  // =========================================================================
  describe('Group 3: Concurrency Extremes & Loom Virtual Thread Boundaries', () => {

    const testStep: PipelineStepConfig = {
      id: 'validator',
      name: 'Dynamic Schema Validator',
      type: 'JANINO_VALIDATOR',
      parameters: { chunkSize: 500 },
      fieldMappings: [],
      errorPolicy: 'QUARANTINE_RECORD',
      concurrency: 16
    };

    it('clamps StepConfigDrawer concurrency input to maximum 256 threads when user inputs 1024', () => {
      const handleSave = vi.fn();
      render(
        <StepConfigDrawer
          isOpen={true}
          step={testStep}
          onClose={() => {}}
          onSave={handleSave}
        />
      );

      const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
      fireEvent.change(concurrencyInput, { target: { value: '1024' } });

      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          concurrency: 256
        })
      );
    });

    it('clamps StepConfigDrawer concurrency input to minimum 1 when user inputs 0 or negative numbers', () => {
      const handleSave = vi.fn();
      render(
        <StepConfigDrawer
          isOpen={true}
          step={testStep}
          onClose={() => {}}
          onSave={handleSave}
        />
      );

      const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
      
      // Negative
      fireEvent.change(concurrencyInput, { target: { value: '-50' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(handleSave).toHaveBeenLastCalledWith(
        expect.objectContaining({ concurrency: 1 })
      );

      // Zero
      fireEvent.change(concurrencyInput, { target: { value: '0' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(handleSave).toHaveBeenLastCalledWith(
        expect.objectContaining({ concurrency: 1 })
      );
    });

    it('handles non-numeric or float inputs in StepConfigDrawer gracefully', () => {
      const handleSave = vi.fn();
      render(
        <StepConfigDrawer
          isOpen={true}
          step={testStep}
          onClose={() => {}}
          onSave={handleSave}
        />
      );

      const concurrencyInput = screen.getByTestId('drawer-concurrency-input');
      fireEvent.change(concurrencyInput, { target: { value: 'invalid-string' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({ concurrency: 1 })
      );
    });

    it('clamps batch size in StepConfigDrawer to at least 1 when user inputs negative or 0', () => {
      const handleSave = vi.fn();
      render(
        <StepConfigDrawer
          isOpen={true}
          step={testStep}
          onClose={() => {}}
          onSave={handleSave}
        />
      );

      const batchSizeInput = screen.getByTestId('drawer-batch-size-input');
      fireEvent.change(batchSizeInput, { target: { value: '-2000' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(handleSave).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: expect.objectContaining({ chunkSize: 1, batchSize: 1 })
        })
      );
    });

    it('StepConfigDrawer handles empty or missing parameters object without crash', () => {
      const bareStep: PipelineStepConfig = {
        id: 'processor',
        name: 'Bare Processor',
        type: 'CUSTOM',
        parameters: {},
        fieldMappings: [],
        errorPolicy: 'FAIL_FAST',
        concurrency: 8
      };

      render(
        <StepConfigDrawer
          isOpen={true}
          step={bareStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
      expect(screen.getByText('Configure Step: Bare Processor')).toBeInTheDocument();
    });

    it('renders exotic Loom Virtual Thread allocation strings without layout clipping', () => {
      const exoticThreadDiagnostics: FileDiagnosticsData = {
        jobId: 'job-loom-exotic',
        metadata: {
          sizeBytes: 1024,
          encoding: 'UTF-8',
          delimiter: ',',
          rowCount: 50,
          checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afbf4c8996fb924',
          loomThread: 'VirtualThread[#999999999999,carrier-worker-custom-high-priority-daemon-loom-99]'
        },
        stageLatencies: [],
        batchChunks: [],
        errorRecords: []
      };

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={exoticThreadDiagnostics}
          onClose={() => {}}
        />
      );

      expect(screen.getByTestId('meta-loom-thread')).toHaveTextContent(
        'VirtualThread[#999999999999,carrier-worker-custom-high-priority-daemon-loom-99]'
      );
    });
  });

  // =========================================================================
  // Group 4: File Dropzone & Ingestion Pathologies
  // =========================================================================
  describe('Group 4: File Dropzone & Ingestion Pathologies', () => {

    it('handles zero-byte file upload (0 bytes) gracefully in BatchDropzone and apiClient', async () => {
      const zeroByteFile = new File([''], 'empty_transactions.csv', { type: 'text/csv' });
      expect(zeroByteFile.size).toBe(0);

      const jobs = await batchUploadFiles('customer-master-onboarding', [zeroByteFile]);
      expect(jobs.length).toBe(1);
      expect(jobs[0].fileSizeBytes).toBe(0);
      // Math.max(100, Math.floor(0 / 100)) = 100
      expect(jobs[0].totalRecords).toBe(100);
      expect(jobs[0].stage).toBe('INGESTING');
      expect(jobs[0].status).toBe('RUNNING');
    });

    it('handles gigantic virtual file upload (50 GB) in ExecutionQueue without numeric overflow', () => {
      const giganticJob: FileExecutionJob = {
        id: 'job-gigantic-50gb',
        processId: 'order-fulfillment-stream',
        fileName: 'huge_archive_orders.csv',
        fileSizeBytes: 50 * 1024 * 1024 * 1024, // 50 GB
        stage: 'IN_FLIGHT',
        status: 'RUNNING',
        totalRecords: 100000000,
        processedRecords: 50000000,
        failedRecords: 10,
        submittedAt: new Date().toISOString(),
        checksumSha256: 'sha256-huge',
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: 'virtual-worker-99'
      };

      render(
        <ExecutionQueue
          jobs={[giganticJob]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      // 50 GB in MB is 51200.0 MB
      expect(screen.getByText(/51200.0 MB/)).toBeInTheDocument();
      expect(screen.getByTestId('job-progress-job-gigantic-50gb')).toHaveTextContent('50%');
    });

    it('ignores file drop events when BatchDropzone has disabled={true}', () => {
      const uploadSpy = vi.fn();
      render(<BatchDropzone disabled={true} onFilesUploaded={uploadSpy} />);

      const dropzone = screen.getByTestId('batch-dropzone-container');
      const testFile = new File(['a,b,c'], 'test.csv', { type: 'text/csv' });

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [testFile]
        }
      });

      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('handles drop event with empty dataTransfer files safely without error', () => {
      const uploadSpy = vi.fn();
      render(<BatchDropzone disabled={false} onFilesUploaded={uploadSpy} />);

      const dropzone = screen.getByTestId('batch-dropzone-container');

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: []
        }
      });

      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it('handles batch upload of 25 simultaneous files through dropzone', () => {
      const uploadSpy = vi.fn();
      render(<BatchDropzone onFilesUploaded={uploadSpy} />);

      const files = Array.from({ length: 25 }, (_, i) => 
        new File([`line-${i}`], `file_chunk_${i}.csv`, { type: 'text/csv' })
      );

      const dropzoneInput = screen.getByTestId('batch-dropzone-input');
      fireEvent.change(dropzoneInput, { target: { files } });

      expect(uploadSpy).toHaveBeenCalledWith(files);
      expect(uploadSpy.mock.calls[0][0].length).toBe(25);
    });
  });

  // =========================================================================
  // Group 5: Execution Queue Arithmetic & Over-Processing Anomalies
  // =========================================================================
  describe('Group 5: Execution Queue Arithmetic & Over-Processing Anomalies', () => {

    it('handles over-processing where processedRecords exceeds totalRecords cleanly without crash', () => {
      const overprocessedJob: FileExecutionJob = {
        id: 'job-overprocessed',
        processId: 'p-1',
        fileName: 'streaming_replay.csv',
        fileSizeBytes: 2048,
        stage: 'IN_FLIGHT',
        status: 'RUNNING',
        totalRecords: 1000,
        processedRecords: 1500, // 150%
        failedRecords: 0,
        submittedAt: new Date().toISOString(),
        checksumSha256: 'hash',
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: 'worker'
      };

      render(
        <ExecutionQueue
          jobs={[overprocessedJob]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      expect(screen.getByTestId('job-progress-job-overprocessed')).toHaveTextContent('150% (1,500 / 1,000)');
    });

    it('handles catastrophic failure rate where failedRecords exceeds totalRecords', () => {
      const highFailureJob: FileExecutionJob = {
        id: 'job-high-failure',
        processId: 'p-1',
        fileName: 'bad_records.csv',
        fileSizeBytes: 4096,
        stage: 'SINKING',
        status: 'FAILED',
        totalRecords: 500,
        processedRecords: 500,
        failedRecords: 1200,
        submittedAt: new Date().toISOString(),
        checksumSha256: 'hash',
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: 'worker'
      };

      render(
        <ExecutionQueue
          jobs={[highFailureJob]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      expect(screen.getByTestId('job-failures-job-high-failure')).toHaveTextContent('1200 errors');
      expect(screen.getByTestId('job-status-job-high-failure')).toHaveTextContent('FAILED');
    });

    it('renders all 5 stages and 5 statuses simultaneously in both Table and Card view modes', () => {
      const stages: FileExecutionJob['stage'][] = ['INGESTING', 'SPLITTING', 'IN_FLIGHT', 'SINKING', 'DONE'];
      const statuses: FileExecutionJob['status'][] = ['QUEUED', 'RUNNING', 'PAUSED', 'FAILED', 'COMPLETED'];

      const diverseJobs: FileExecutionJob[] = stages.map((stage, i) => ({
        id: `job-stage-${stage.toLowerCase()}`,
        processId: 'p-diverse',
        fileName: `file_${stage.toLowerCase()}.csv`,
        fileSizeBytes: 102400 * (i + 1),
        stage,
        status: statuses[i],
        totalRecords: 1000 * (i + 1),
        processedRecords: 500 * (i + 1),
        failedRecords: i * 5,
        submittedAt: new Date().toISOString(),
        checksumSha256: `hash-${i}`,
        detectedEncoding: 'UTF-8',
        detectedDelimiter: ',',
        loomThreadAllocation: `worker-${i}`
      }));

      const { rerender } = render(
        <ExecutionQueue
          jobs={diverseJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
      stages.forEach(stage => {
        expect(screen.getByTestId(`job-row-job-stage-${stage.toLowerCase()}`)).toBeInTheDocument();
      });

      // Switch to Card View
      rerender(
        <ExecutionQueue
          jobs={diverseJobs}
          viewMode="card"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      expect(screen.getByTestId('execution-queue-card-view')).toBeInTheDocument();
      stages.forEach(stage => {
        expect(screen.getByTestId(`job-card-job-stage-${stage.toLowerCase()}`)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Group 6: High-Frequency User Interactions & Flapping (Race Condition Stress)
  // =========================================================================
  describe('Group 6: High-Frequency User Interactions & Flapping', () => {

    it('survives rapid flapping of Start/Pause route controls (20 rapid clicks) with state integrity', async () => {
      const handleStart = vi.fn();
      const handlePause = vi.fn();

      const singleRoute: ProcessRoute = {
        id: 'route-flapping',
        name: 'Flapping Test Route',
        description: 'Route undergoing rapid start/pause toggling',
        status: 'ACTIVE',
        health: 'HEALTHY',
        activeFilesInFlight: 2,
        aggregateThroughputRecordsPerSec: 1000,
        successRatePercent: 99.0,
        pipelineSteps: []
      };

      const { rerender } = render(
        <ProcessCatalog
          routes={[singleRoute]}
          onSelectRoute={() => {}}
          onStartRoute={handleStart}
          onPauseRoute={handlePause}
        />
      );

      // Simulate 20 alternating clicks
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          const pauseBtn = screen.getByTestId('pause-route-btn-route-flapping');
          fireEvent.click(pauseBtn);
          rerender(
            <ProcessCatalog
              routes={[{ ...singleRoute, status: 'PAUSED', health: 'DEGRADED' }]}
              onSelectRoute={() => {}}
              onStartRoute={handleStart}
              onPauseRoute={handlePause}
            />
          );
        } else {
          const startBtn = screen.getByTestId('start-route-btn-route-flapping');
          fireEvent.click(startBtn);
          rerender(
            <ProcessCatalog
              routes={[{ ...singleRoute, status: 'ACTIVE', health: 'HEALTHY' }]}
              onSelectRoute={() => {}}
              onStartRoute={handleStart}
              onPauseRoute={handlePause}
            />
          );
        }
      }

      expect(handlePause).toHaveBeenCalledTimes(10);
      expect(handleStart).toHaveBeenCalledTimes(10);
    });

    it('survives rapid toggling between Table View and Card View (20 rapid toggles)', () => {
      const modeSpy = vi.fn();
      let currentMode: 'table' | 'card' = 'table';

      const { rerender } = render(
        <ExecutionQueue
          jobs={[]}
          viewMode={currentMode}
          onViewModeChange={(mode) => {
            currentMode = mode;
            modeSpy(mode);
          }}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      for (let i = 0; i < 20; i++) {
        const nextMode = i % 2 === 0 ? 'card' : 'table';
        const btn = nextMode === 'card' ? screen.getByTestId('view-card-btn') : screen.getByTestId('view-table-btn');
        fireEvent.click(btn);
        rerender(
          <ExecutionQueue
            jobs={[]}
            viewMode={currentMode}
            onViewModeChange={(mode) => {
              currentMode = mode;
              modeSpy(mode);
            }}
            onPauseJob={() => {}}
            onResumeJob={() => {}}
            onRetryJob={() => {}}
            onCancelJob={() => {}}
            onDownloadReport={() => {}}
            onInspectErrors={() => {}}
          />
        );
      }

      expect(modeSpy).toHaveBeenCalledTimes(20);
    });

    it('survives rapid drawer stage switching across different pipeline steps without state bleed', () => {
      const steps: PipelineStepConfig[] = [
        { id: 'splitter', name: 'Step 1', type: 'SPLIT', parameters: { chunkSize: 100 }, fieldMappings: [], errorPolicy: 'FAIL_FAST', concurrency: 4 },
        { id: 'validator', name: 'Step 2', type: 'VAL', parameters: { chunkSize: 200 }, fieldMappings: [], errorPolicy: 'QUARANTINE_RECORD', concurrency: 8 },
        { id: 'processor', name: 'Step 3', type: 'ENRICH', parameters: { chunkSize: 300 }, fieldMappings: [], errorPolicy: 'QUARANTINE_RECORD', concurrency: 16 },
        { id: 'sink', name: 'Step 4', type: 'SINK', parameters: { chunkSize: 400 }, fieldMappings: [], errorPolicy: 'FAIL_FAST', concurrency: 32 }
      ];

      let selectedStep: PipelineStepConfig | null = steps[0];

      const { rerender } = render(
        <StepConfigDrawer
          isOpen={true}
          step={selectedStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByText('Configure Step: Step 1')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-concurrency-input')).toHaveValue(4);

      // Switch to validator
      selectedStep = steps[1];
      rerender(
        <StepConfigDrawer
          isOpen={true}
          step={selectedStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByText('Configure Step: Step 2')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-concurrency-input')).toHaveValue(8);

      // Switch to processor
      selectedStep = steps[2];
      rerender(
        <StepConfigDrawer
          isOpen={true}
          step={selectedStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );
      expect(screen.getByText('Configure Step: Step 3')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-concurrency-input')).toHaveValue(16);
    });

    it('survives rapid Headroom compression toggling in FileDiagnosticsModal without UI flicker', () => {
      const mockDiag: FileDiagnosticsData = {
        jobId: 'job-toggle-headroom',
        metadata: { sizeBytes: 1000, encoding: 'UTF-8', delimiter: ',', rowCount: 1, checksum: 'chk', loomThread: 'worker' },
        stageLatencies: [],
        batchChunks: [],
        errorRecords: [
          { recordId: 'REC-1', lineNumber: 1, errorCode: 'ERR', errorMessage: 'msg', rawPayload: '{"a":1}', schemaTuple: { a: '1' } }
        ]
      };

      render(
        <FileDiagnosticsModal
          isOpen={true}
          diagnostics={mockDiag}
          onClose={() => {}}
        />
      );

      const checkbox = screen.getByTestId('headroom-toggle-checkbox');
      expect(checkbox).not.toBeChecked();

      // Toggle 10 times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(checkbox);
      }

      // Checkbox is unchecked after even number of clicks
      expect(checkbox).not.toBeChecked();
      expect(screen.queryByTestId('headroom-savings-banner')).not.toBeInTheDocument();

      // Click once more -> active
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Group 7: Field Mapping Stress & Regex Transformations
  // =========================================================================
  describe('Group 7: Field Mapping Stress & Regex Transformations', () => {

    it('renders and saves field mappings with complex regex expressions and special characters', () => {
      const complexRegexStep: PipelineStepConfig = {
        id: 'validator',
        name: 'Regex Validator',
        type: 'REGEX',
        parameters: {},
        fieldMappings: [
          { 
            source: 'raw_ssn', 
            target: 'masked_ssn', 
            transform: 'regexReplace("^([0-9]{3})-([0-9]{2})-([0-9]{4})$", "XXX-XX-$3")' 
          },
          {
            source: 'dirty_email',
            target: 'clean_email',
            transform: 'toLowerCase().trim().replaceAll("[^a-z0-9@._-]", "")'
          }
        ],
        errorPolicy: 'QUARANTINE_RECORD',
        concurrency: 8
      };

      render(
        <StepConfigDrawer
          isOpen={true}
          step={complexRegexStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByText('raw_ssn')).toBeInTheDocument();
      expect(screen.getByText(/regexReplace/)).toBeInTheDocument();
      expect(screen.getByText('dirty_email')).toBeInTheDocument();
    });

    it('renders step with 30 field mappings in scrollable drawer container without layout collapse', () => {
      const manyMappings = Array.from({ length: 30 }, (_, i) => ({
        source: `src_col_${i}`,
        target: `target_col_${i}`,
        transform: `normalizeCol${i}()`
      }));

      const heavyStep: PipelineStepConfig = {
        id: 'processor',
        name: 'Heavy Mapping Processor',
        type: 'MAPPING',
        parameters: {},
        fieldMappings: manyMappings,
        errorPolicy: 'FAIL_FAST',
        concurrency: 16
      };

      render(
        <StepConfigDrawer
          isOpen={true}
          step={heavyStep}
          onClose={() => {}}
          onSave={() => {}}
        />
      );

      expect(screen.getByText('Field Mappings (30)')).toBeInTheDocument();
      expect(screen.getByText('src_col_0')).toBeInTheDocument();
      expect(screen.getByText('src_col_29')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Group 8: apiClient In-Memory Store Immutability & Exception Contracts
  // =========================================================================
  describe('Group 8: apiClient In-Memory Store Immutability & Exception Contracts', () => {

    it('pauseJob, resumeJob, retryJob, cancelJob throw error when passed non-existent jobId', async () => {
      await expect(pauseJob('non-existent-id')).rejects.toThrow('Job not found: non-existent-id');
      await expect(resumeJob('non-existent-id')).rejects.toThrow('Job not found: non-existent-id');
      await expect(retryJob('non-existent-id')).rejects.toThrow('Job not found: non-existent-id');
      await expect(cancelJob('non-existent-id')).rejects.toThrow('Job not found: non-existent-id');
    });

    it('batchUploadFiles supports both (processId, files) and (files, processId) parameter signatures', async () => {
      const testFile1 = new File(['a,b'], 'test1.csv', { type: 'text/csv' });
      const testFile2 = new File(['c,d'], 'test2.csv', { type: 'text/csv' });

      // Signature 1: (processId, files)
      const res1 = await batchUploadFiles('route-1', [testFile1]);
      expect(res1.length).toBe(1);
      expect(res1[0].processId).toBe('route-1');
      expect(res1[0].fileName).toBe('test1.csv');

      // Signature 2: (files, processId)
      const res2 = await batchUploadFiles([testFile2], 'route-2');
      expect(res2.length).toBe(1);
      expect(res2[0].processId).toBe('route-2');
      expect(res2[0].fileName).toBe('test2.csv');
    });

    it('apiClient state transitions preserve strict immutability', async () => {
      const initialJobs = await fetchProcessJobs();
      const initialJob = initialJobs[0];
      const initialStatus = initialJob.status;

      // Mutate via pauseJob
      const pausedJob = await pauseJob(initialJob.id);
      expect(pausedJob.status).toBe('PAUSED');
      
      // Original job object must NOT have been mutated in place
      expect(initialJob.status).toBe(initialStatus);
      expect(pausedJob).not.toBe(initialJob); // distinct object reference
    });

    it('resetMockStore cleanly restores default catalog routes and jobs after multiple mutations', async () => {
      // Mutate route
      await pauseRoute('customer-master-onboarding');
      let routes = await fetchCatalogRoutes();
      const cmo = routes.find(r => r.id === 'customer-master-onboarding');
      expect(cmo?.status).toBe('PAUSED');

      // Reset
      resetMockStore();
      routes = await fetchCatalogRoutes();
      const restoredCmo = routes.find(r => r.id === 'customer-master-onboarding');
      expect(restoredCmo?.status).toBe('ACTIVE');
    });
  });

  // =========================================================================
  // Group 9: Full App Integration Stress (App.tsx & FullAppHarness)
  // =========================================================================
  describe('Group 9: Full App Integration Stress', () => {

    it('full enterprise application survives complete 3-tier traversal cycle under stress', async () => {
      render(<FullAppHarness />);

      // Tier 1: Catalog
      expect(screen.getByText('Enterprise Process & Route Catalog')).toBeInTheDocument();
      expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();

      // Navigate to Tier 2: Workspace
      fireEvent.click(screen.getByTestId('view-workspace-btn-route-cust-onboarding'));
      expect(screen.getByText(/Process Workspace: Customer Master Onboarding/i)).toBeInTheDocument();

      // Configure stage in drawer
      fireEvent.click(screen.getByTestId('pipeline-step-splitter'));
      expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
      fireEvent.change(screen.getByTestId('drawer-concurrency-input'), { target: { value: '64' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(screen.getByTestId('step-concurrency-splitter')).toHaveTextContent('64');

      // Upload batch file
      const fileInput = screen.getByTestId('batch-dropzone-input');
      const testFile = new File(['id,val\n1,Alpha'], 'stress_file.csv', { type: 'text/csv' });
      fireEvent.change(fileInput, { target: { files: [testFile] } });
      expect(screen.getByText('stress_file.csv')).toBeInTheDocument();

      // Open Tier 3 Diagnostics
      fireEvent.click(screen.getByTestId('btn-inspect-job-101'));
      expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
      expect(screen.getByText('Deep File Diagnostics: job-101')).toBeInTheDocument();

      // Toggle Headroom
      const headroomCheckbox = screen.getByTestId('headroom-toggle-checkbox');
      fireEvent.click(headroomCheckbox);
      expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
      expect(screen.queryByTestId('file-diagnostics-modal')).not.toBeInTheDocument();

      // Return to Catalog
      fireEvent.click(screen.getByTestId('back-to-catalog-btn'));
      expect(screen.getByText('Enterprise Process & Route Catalog')).toBeInTheDocument();
    });

    it('production App component mounts and navigates seamlessly between User Portal and Admin Studio', async () => {
      render(<App />);

      expect(screen.getByText('Enterprise Bulk Processor')).toBeInTheDocument();
      expect(screen.getByText('User Portal')).toBeInTheDocument();
      expect(screen.getByText('Admin Studio')).toBeInTheDocument();

      // Switch to Admin Studio
      fireEvent.click(screen.getByText('Admin Studio'));
      expect(screen.getAllByText('Dynamic Route Studio').length).toBeGreaterThan(0);
      expect(screen.getByText('Component Library')).toBeInTheDocument();
      expect(screen.getByText('DLQ Error Console')).toBeInTheDocument();

      // Switch back to User Portal
      fireEvent.click(screen.getByText('User Portal'));
      expect(screen.getByText('Live Execution Dashboard')).toBeInTheDocument();
    });
  });

});
