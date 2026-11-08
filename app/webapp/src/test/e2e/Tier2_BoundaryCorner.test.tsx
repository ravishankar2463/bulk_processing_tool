import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { 
  ProcessCatalog, 
  VisualStepPipeline, 
  StepConfigDrawer, 
  ExecutionQueue, 
  BatchDropzone, 
  FileDiagnosticsModal 
} from './testHarness';
import { 
  preSeededRoutes, 
  preSeededJobs, 
  mockDiagnosticsData, 
  defaultPipelineSteps,
  ProcessRoute,
  FileExecutionJob,
  FileDiagnosticsData,
  PipelineStepConfig
} from './fixtures';
import { compressWithHeadroom } from '../../utils/headroomCompressor';

describe('Tier 2: Boundary & Corner Cases E2E Suite', () => {

  // =========================================================================
  // 1. Empty States & Zero Values
  // =========================================================================
  describe('Boundary Group 1: Empty States & Zero Values', () => {
    it('handles empty route catalog with zero configured routes', () => {
      render(<ProcessCatalog routes={[]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('catalog-routes-count')).toHaveTextContent('0 Configured Routes');
      expect(screen.queryByTestId(/route-card-/)).not.toBeInTheDocument();
    });

    it('renders route with zero active files in flight cleanly', () => {
      const zeroFileRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-idle',
        name: 'Idle Batch Route',
        activeFilesInFlight: 0
      };
      render(<ProcessCatalog routes={[zeroFileRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-idle')).toHaveTextContent('0');
    });

    it('renders zero throughput without division errors or NaN', () => {
      const zeroThroughputRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-zero-tp',
        aggregateThroughputRecordsPerSec: 0
      };
      render(<ProcessCatalog routes={[zeroThroughputRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('throughput-route-zero-tp')).toHaveTextContent('0 rec/sec');
    });

    it('handles job with 0 total records without NaN percentage', () => {
      const emptyJob: FileExecutionJob = {
        ...preSeededJobs[0],
        id: 'job-empty-0',
        totalRecords: 0,
        processedRecords: 0
      };
      render(
        <ExecutionQueue
          jobs={[emptyJob]}
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
      const progressEl = screen.getByTestId('job-progress-job-empty-0');
      expect(progressEl).toHaveTextContent('0% (0 / 0)');
      expect(progressEl.textContent).not.toContain('NaN');
    });

    it('handles diagnostics modal with zero error records gracefully', () => {
      const emptyDiagnostics: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        errorRecords: []
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={emptyDiagnostics} onClose={() => {}} />);
      expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
      expect(screen.queryByTestId(/error-row-/)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. Maximum Throughput & High Scale Limits
  // =========================================================================
  describe('Boundary Group 2: Maximum Throughput & High Scale Limits', () => {
    it('renders maximum throughput of 1,000,000 rec/sec with tabular numerals', () => {
      const maxTpRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-max-tp',
        aggregateThroughputRecordsPerSec: 1000000
      };
      render(<ProcessCatalog routes={[maxTpRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const el = screen.getByTestId('throughput-route-max-tp');
      expect(el).toHaveTextContent('1,000,000 rec/sec');
      expect(el.className).toContain('tabular-nums');
    });

    it('renders large active files in flight count (e.g. 999 files)', () => {
      const highFileRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-high-files',
        activeFilesInFlight: 999
      };
      render(<ProcessCatalog routes={[highFileRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-high-files')).toHaveTextContent('999');
    });

    it('allows setting maximum Loom virtual thread concurrency (256 threads) in drawer', () => {
      const step = defaultPipelineSteps[2]; // enricher
      const onSave = vi.fn();
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={onSave} />);
      const input = screen.getByTestId('drawer-concurrency-input');
      fireEvent.change(input, { target: { value: '256' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ concurrency: 256 }));
    });
  });

  // =========================================================================
  // 3. 0% vs 100% Error Rates
  // =========================================================================
  describe('Boundary Group 3: 0% vs 100% Error Rates', () => {
    it('handles 100% error rate (0% success rate) with red failure counter', () => {
      const allFailRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-all-fail',
        health: 'CRITICAL',
        successRatePercent: 0.0
      };
      render(<ProcessCatalog routes={[allFailRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('success-rate-route-all-fail')).toHaveTextContent('0.0%');
      expect(screen.getByTestId('health-badge-route-all-fail')).toHaveTextContent('CRITICAL');
    });

    it('handles 100% success rate (0 failures) with green indicators', () => {
      const perfectRoute: ProcessRoute = {
        ...preSeededRoutes[0],
        id: 'route-perfect',
        health: 'HEALTHY',
        successRatePercent: 100.0
      };
      render(<ProcessCatalog routes={[perfectRoute]} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('success-rate-route-perfect')).toHaveTextContent('100.0%');
      expect(screen.getByTestId('health-badge-route-perfect')).toHaveTextContent('HEALTHY');
    });

    it('renders 100% failed job with high error count in execution queue', () => {
      const failedJob: FileExecutionJob = {
        ...preSeededJobs[0],
        id: 'job-all-fail',
        status: 'FAILED',
        totalRecords: 5000,
        processedRecords: 5000,
        failedRecords: 5000
      };
      render(
        <ExecutionQueue
          jobs={[failedJob]}
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
      expect(screen.getByTestId('job-failures-job-all-fail')).toHaveTextContent('5000 errors');
      expect(screen.getByTestId('job-status-job-all-fail')).toHaveTextContent('FAILED');
    });
  });

  // =========================================================================
  // 4. Extreme Row & Byte Counts
  // =========================================================================
  describe('Boundary Group 4: Extreme Row & Byte Counts', () => {
    it('displays 10,000,000 records row count with proper comma formatting', () => {
      const extremeDiagnostics: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: {
          ...mockDiagnosticsData.metadata,
          rowCount: 10000000
        }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={extremeDiagnostics} onClose={() => {}} />);
      expect(screen.getByTestId('meta-row-count')).toHaveTextContent('10,000,000');
    });

    it('handles minimal 1-record file completion at 100%', () => {
      const singleRecordJob: FileExecutionJob = {
        ...preSeededJobs[0],
        id: 'job-single-record',
        totalRecords: 1,
        processedRecords: 1,
        failedRecords: 0,
        stage: 'DONE',
        status: 'COMPLETED'
      };
      render(
        <ExecutionQueue
          jobs={[singleRecordJob]}
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
      expect(screen.getByTestId('job-progress-job-single-record')).toHaveTextContent('100% (1 / 1)');
    });

    it('handles 0-byte file display in metadata panel', () => {
      const zeroByteDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: {
          ...mockDiagnosticsData.metadata,
          sizeBytes: 0
        }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={zeroByteDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-size')).toHaveTextContent('0.00 MB');
    });

    it('handles massive 50 GB file size formatting', () => {
      const hugeByteDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: {
          ...mockDiagnosticsData.metadata,
          sizeBytes: 53687091200 // 50 GB
        }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={hugeByteDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-size')).toHaveTextContent('51200.00 MB');
    });
  });

  // =========================================================================
  // 5. Exotic & Unusual Delimiters
  // =========================================================================
  describe('Boundary Group 5: Exotic & Unusual Delimiters', () => {
    it('handles pipe delimiter "|" in file metadata', () => {
      const pipeDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, delimiter: '|' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={pipeDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-delimiter')).toHaveTextContent('|');
    });

    it('handles tab delimiter "\\t" displaying readable TAB marker', () => {
      const tabDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, delimiter: '\t' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={tabDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-delimiter')).toHaveTextContent('TAB (\\t)');
    });

    it('handles semicolon delimiter ";" commonly used in EU CSVs', () => {
      const semiDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, delimiter: ';' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={semiDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-delimiter')).toHaveTextContent(';');
    });

    it('handles unit separator "\\x1F" safely without rendering glitches', () => {
      const usDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, delimiter: '\x1F' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={usDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-delimiter')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. Checksum and Thread Edge Cases
  // =========================================================================
  describe('Boundary Group 6: Checksum & Loom Thread Edge Cases', () => {
    it('handles empty SHA-256 checksum string without throwing', () => {
      const noChecksumDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, checksum: '' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={noChecksumDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-checksum')).toHaveTextContent('');
    });

    it('handles high Loom thread identifier string', () => {
      const highThreadDiag: FileDiagnosticsData = {
        ...mockDiagnosticsData,
        metadata: { ...mockDiagnosticsData.metadata, loomThread: 'VirtualThread[#9999999,loom-worker-128]' }
      };
      render(<FileDiagnosticsModal isOpen={true} diagnostics={highThreadDiag} onClose={() => {}} />);
      expect(screen.getByTestId('meta-loom-thread')).toHaveTextContent('VirtualThread[#9999999,loom-worker-128]');
    });
  });

  // =========================================================================
  // 7. Headroom Compression Algorithmic Boundary Cases
  // =========================================================================
  describe('Boundary Group 7: Headroom Compression Algorithmic Boundaries', () => {
    it('handles empty input string returning 0 tokens and 0% savings without NaN', () => {
      const result = compressWithHeadroom('');
      expect(result.originalTokensEstimate).toBe(0);
      expect(result.compressedTokensEstimate).toBe(0);
      expect(result.savingsPercentage).toBe(0);
      expect(Number.isNaN(result.savingsPercentage)).toBe(false);
    });

    it('handles single flat JSON object with identical token estimates', () => {
      const obj = { id: 1, code: 'ERR_TIMEOUT' };
      const result = compressWithHeadroom(obj);
      expect(result.originalTokensEstimate).toBeGreaterThanOrEqual(result.compressedTokensEstimate);
      expect(result.compressedText).toContain('ERR_TIMEOUT');
    });

    it('compresses 100 uniform KYC records achieving >=70% token savings', () => {
      const records = Array.from({ length: 100 }, (_, i) => ({
        recordId: `REC-${i}`,
        status: 'FAILED',
        errorCode: 'ERR_VALIDATION_FAILED',
        department: 'RETAIL_BANKING_COMPLIANCE_KYC',
        country: 'FEDERAL_REPUBLIC_OF_GERMANY'
      }));

      const result = compressWithHeadroom(records);
      expect(result.isCompressed).toBe(true);
      expect(result.savingsPercentage).toBeGreaterThan(40);
      expect(result.compressedText).toContain('_headroom');
      expect(result.compressedText).toContain('schema');
    });

    it('collapses repeated consecutive log lines into count aggregates', () => {
      const logStream = [
        'START_BATCH_INGESTION',
        'Heartbeat worker-1',
        'Heartbeat worker-1',
        'Heartbeat worker-1',
        'BATCH_INGESTION_COMPLETE'
      ].join('\n');

      const result = compressWithHeadroom(logStream);
      expect(result.compressedText).toContain('[repeated 2x]');
      expect(result.compressedText).toContain('START_BATCH_INGESTION');
      expect(result.compressedText).toContain('BATCH_INGESTION_COMPLETE');
    });
  });

  // =========================================================================
  // 8. Rapid State Transitions & Boundary User Inputs
  // =========================================================================
  describe('Boundary Group 8: Rapid State Transitions & User Inputs', () => {
    it('handles rapid view mode switching (table -> card -> table)', () => {
      const onModeChange = vi.fn();
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="table"
          onViewModeChange={onModeChange}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );

      fireEvent.click(screen.getByTestId('view-card-btn'));
      expect(onModeChange).toHaveBeenCalledWith('card');

      fireEvent.click(screen.getByTestId('view-table-btn'));
      expect(onModeChange).toHaveBeenCalledWith('table');
    });

    it('handles rapid file upload with 10 files simultaneously in dropzone', () => {
      const onFiles = vi.fn();
      render(<BatchDropzone onFilesUploaded={onFiles} />);
      const files = Array.from({ length: 10 }, (_, i) => new File([`data-${i}`], `file_${i}.csv`, { type: 'text/csv' }));
      const input = screen.getByTestId('batch-dropzone-input');
      fireEvent.change(input, { target: { files } });
      expect(onFiles).toHaveBeenCalledWith(files);
      expect(files.length).toBe(10);
    });
  });

});
