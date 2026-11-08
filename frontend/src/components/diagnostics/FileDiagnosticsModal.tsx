import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { 
  FileDiagnosticsData, 
  FileRecordItem, 
  RecordErrorItem,
  RecordStepStatus 
} from '../../types/process';
import { 
  fetchJobDiagnostics, 
  getImmediateJobDiagnostics, 
  resubmitDlqRecord 
} from '../../services/apiClient';
import { generateDiagnosticsCsv } from '../../utils/csvSanitizer';

// Memoized Single-Responsibility Subcomponents (SOLID / DRY)
import { DiagnosticsHeader } from './DiagnosticsHeader';
import { LineageKpiStrip } from './LineageKpiStrip';
import { MetadataPanel } from './MetadataPanel';
import { StepSummaryBreakdown, StepFailureItem } from './StepSummaryBreakdown';
import { StageLatencyWaterfall } from './StageLatencyWaterfall';
import { BatchChunkGrid } from './BatchChunkGrid';
import { RecordLineageTable } from './RecordLineageTable';
import { ErrorInspector } from './ErrorInspector';
import { ReportSummaryStrip } from './ReportSummaryStrip';
import { RecordDetailDrawer } from './RecordDetailDrawer';

export interface FileDiagnosticsModalProps {
  jobId?: string | null;
  diagnostics?: FileDiagnosticsData | null;
  isOpen: boolean;
  onClose: () => void;
  fileName?: string;
  processName?: string;
  onExportCsv?: () => void;
}

/**
 * FileDiagnosticsModal (Tier 3 Deep File Diagnostics Orchestrator)
 *
 * Implements SOLID, KISS, DRY, and YAGNI architectural principles:
 * - Single Responsibility: Coordinates state, delegates rendering to 10 isolated subcomponents.
 * - Open/Closed: Clean subcomponent prop boundaries with strict TypeScript types.
 * - Hardware Accelerated: Uses willChange: 'transform' and translateZ(0) for 60fps interaction.
 * - Render Isolation: Subcomponents wrapped in React.memo prevent cascade re-renders.
 */
export const FileDiagnosticsModal: React.FC<FileDiagnosticsModalProps> = ({
  jobId,
  diagnostics: externalDiagnostics,
  isOpen,
  onClose,
  fileName: propFileName,
  processName: propProcessName,
  onExportCsv
}) => {
  // Local state for diagnostics data with 0ms pre-fill from memory store
  const [internalDiagnostics, setInternalDiagnostics] = useState<FileDiagnosticsData | null>(() => {
    if (externalDiagnostics) return externalDiagnostics;
    if (jobId) return getImmediateJobDiagnostics(jobId);
    return null;
  });

  // Filter & Inspection States
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number | null>(null);
  const [lineageStepFilter, setLineageStepFilter] = useState<string>('ALL');
  const [lineageStatusFilter, setLineageStatusFilter] = useState<'ALL' | RecordStepStatus>('ALL');
  const [lineageSearchQuery, setLineageSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<FileRecordItem | RecordErrorItem | null>(null);
  const [resubmittedIds, setResubmittedIds] = useState<Set<string>>(new Set());

  // Synchronize when externalDiagnostics changes
  useEffect(() => {
    if (externalDiagnostics) {
      setInternalDiagnostics(externalDiagnostics);
    }
  }, [externalDiagnostics]);

  // Zero-latency instantaneous pre-fill + background fetch on jobId change
  useEffect(() => {
    if (!jobId || !isOpen) return;

    const immediate = getImmediateJobDiagnostics(jobId);
    if (immediate) {
      setInternalDiagnostics(immediate);
    }

    // Background fresh fetch
    fetchJobDiagnostics(jobId)
      .then((data: FileDiagnosticsData) => {
        if (data) {
          setInternalDiagnostics(data);
        }
      })
      .catch((err: unknown) => {
        console.warn('Diagnostics background fetch error:', err);
      });
  }, [jobId, isOpen]);

  // Escape key listener for closing modal or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedRecord) {
          setSelectedRecord(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRecord, isOpen, onClose]);

  // Active diagnostics payload
  const diagnostics = externalDiagnostics || internalDiagnostics;

  // Resolved metadata strings
  const resolvedJobId = jobId || diagnostics?.jobId || 'job-source';
  const resolvedFileName = propFileName || diagnostics?.fileName || diagnostics?.reportSummary?.fileName || (diagnostics ? `${diagnostics.jobId}.csv` : (jobId ? `${jobId}.csv` : 'job-source.csv'));
  const resolvedProcessName = propProcessName || diagnostics?.processName || diagnostics?.reportSummary?.processName || 'Bulk Pipeline Execution';

  // Synthesize or normalize records lineage
  const recordsLineage = useMemo<ReadonlyArray<FileRecordItem>>(() => {
    if (!diagnostics) return [];
    if (diagnostics.recordsLineage && diagnostics.recordsLineage.length > 0) {
      return diagnostics.recordsLineage;
    }
    return diagnostics.errorRecords.map((err, idx) => ({
      recordId: err.recordId,
      lineNumber: err.lineNumber || idx + 1,
      batchIndex: idx % (diagnostics.batchChunks.length || 1),
      batchId: err.batchId || `${diagnostics.jobId}-batch-0`,
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP' as const,
      errorCode: err.errorCode,
      errorMessage: err.errorMessage,
      schemaTuple: err.schemaTuple,
      rawPayload: err.rawPayload,
      processedAt: new Date().toISOString()
    }));
  }, [diagnostics]);

  // Aggregate step failure breakdown
  const stepFailureBreakdown = useMemo<StepFailureItem[]>(() => {
    if (!diagnostics) return [];
    const map = new Map<string, { stepName: string; failCount: number; distinctErrors: Set<string> }>();

    recordsLineage.forEach(rec => {
      if (rec.stepStatus === 'FAILED_AT_STEP') {
        const stepId = rec.currentStepId || 'validator';
        const stepName = rec.currentStepName || 'Dynamic Schema Validator';
        if (!map.has(stepId)) {
          map.set(stepId, { stepName, failCount: 0, distinctErrors: new Set() });
        }
        const item = map.get(stepId)!;
        item.failCount += 1;
        if (rec.errorCode) item.distinctErrors.add(rec.errorCode);
      }
    });

    if (map.size === 0 && diagnostics.errorRecords.length > 0) {
      diagnostics.errorRecords.forEach(err => {
        const stepId = 'validator';
        const stepName = err.stepName || 'Dynamic Schema Validator';
        if (!map.has(stepId)) {
          map.set(stepId, { stepName, failCount: 0, distinctErrors: new Set() });
        }
        const item = map.get(stepId)!;
        item.failCount += 1;
        if (err.errorCode) item.distinctErrors.add(err.errorCode);
      });
    }

    return Array.from(map.entries()).map(([stepId, val]) => ({
      stepId,
      stepName: val.stepName,
      failCount: val.failCount,
      distinctErrors: Array.from(val.distinctErrors)
    }));
  }, [diagnostics, recordsLineage]);

  // Resubmit DLQ record handler
  const handleResubmit = useCallback(async (recordId: string) => {
    await resubmitDlqRecord(recordId);
    setResubmittedIds(prev => new Set(prev).add(recordId));
  }, []);

  // CSV Export handler
  const handleExportCsv = useCallback(() => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }
    if (diagnostics) {
      const csvContent = generateDiagnosticsCsv(diagnostics.errorRecords);
      if (typeof window !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error_audit_${diagnostics.jobId}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  }, [diagnostics, onExportCsv]);

  // JSON Report handler
  const handleDownloadJsonReport = useCallback(() => {
    if (diagnostics) {
      if (typeof window !== 'undefined' && typeof URL.createObjectURL === 'function') {
        const jsonContent = JSON.stringify(diagnostics, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `execution_report_${diagnostics.jobId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  }, [diagnostics]);

  if (!isOpen || !diagnostics) return null;

  // Overall KPI aggregations
  const totalRecordCount = diagnostics.metadata?.rowCount || 0;
  const successfulRecordCount = diagnostics.reportSummary?.successfulRecords ?? 
    Math.max(0, totalRecordCount - (diagnostics.errorRecords?.length || 0));
  const failedRecordCount = diagnostics.reportSummary?.failedRecords ?? (diagnostics.errorRecords?.length || 0);
  const inFlightRecordCount = diagnostics.reportSummary 
    ? Math.max(0, diagnostics.reportSummary.totalRecords - diagnostics.reportSummary.processedRecords)
    : (recordsLineage ? recordsLineage.filter(r => r.stepStatus === 'IN_FLIGHT').length : 0);
  const batchChunksCount = diagnostics.batchChunks?.length || 0;

  return (
    <div
      data-testid="file-diagnostics-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay, rgba(15, 23, 42, 0.72))',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
        transition: 'opacity var(--transition-fast)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Centered Liquid Glass Pop-Up Modal Container */}
      <div
        data-testid="file-diagnostics-modal"
        className="liquid-glass-drawer"
        style={{
          width: '100%',
          maxWidth: '1060px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          borderRadius: '16px',
          background: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-subtle, #cbd5e1)',
          boxShadow: 'var(--shadow-modal, 0 25px 50px -12px rgba(15, 23, 42, 0.45))',
          overflowY: 'auto',
          willChange: 'transform',
          transform: 'translateZ(0)',
          animation: 'modalPopup 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Header with concentric geometry & breadcrumbs */}
        <DiagnosticsHeader
          jobId={resolvedJobId}
          fileName={resolvedFileName}
          processName={resolvedProcessName}
          onClose={onClose}
        />

        {/* 2. File Overall Lineage & Records KPI Strip */}
        <LineageKpiStrip
          totalRecordCount={totalRecordCount}
          successfulRecordCount={successfulRecordCount}
          failedRecordCount={failedRecordCount}
          inFlightRecordCount={inFlightRecordCount}
          batchChunksCount={batchChunksCount}
        />

        {/* 3. File Metadata Panel */}
        <MetadataPanel metadata={diagnostics.metadata} />

        {/* 4. Step Summary Breakdown */}
        <StepSummaryBreakdown
          stageLatencies={diagnostics.stageLatencies}
          rowCount={totalRecordCount}
          errorRecordsCount={failedRecordCount}
          lineageStepFilter={lineageStepFilter}
          onSelectStepFilter={setLineageStepFilter}
          stepFailureBreakdown={stepFailureBreakdown}
          onFilterFailedStep={(stepId) => {
            setLineageStepFilter(stepId);
            setLineageStatusFilter('FAILED_AT_STEP');
          }}
        />

        {/* 5. Stage Latency Waterfall */}
        <StageLatencyWaterfall stageLatencies={diagnostics.stageLatencies} />

        {/* 6. Batch Chunk Distribution Grid */}
        <BatchChunkGrid
          batchChunks={diagnostics.batchChunks}
          selectedBatchIndex={selectedBatchIndex}
          onSelectBatchIndex={setSelectedBatchIndex}
        />

        {/* 7. Record-Level Step Lineage & Tracking Table */}
        <RecordLineageTable
          recordsLineage={recordsLineage}
          stageLatencies={diagnostics.stageLatencies}
          selectedBatchIndex={selectedBatchIndex}
          lineageStepFilter={lineageStepFilter}
          lineageStatusFilter={lineageStatusFilter}
          lineageSearchQuery={lineageSearchQuery}
          onStepFilterChange={setLineageStepFilter}
          onStatusFilterChange={setLineageStatusFilter}
          onSearchQueryChange={setLineageSearchQuery}
          onSelectRecord={setSelectedRecord}
          onResubmitRecord={handleResubmit}
          resubmittedIds={resubmittedIds}
        />

        {/* 8. Error Inspector with Headroom Context Compression */}
        <ErrorInspector
          errors={diagnostics.errorRecords}
          selectedBatchIndex={selectedBatchIndex}
          onSelectRecord={setSelectedRecord}
          onResubmitRecord={handleResubmit}
          resubmittedIds={resubmittedIds}
          onExportCsv={handleExportCsv}
        />

        {/* 9. Execution Report & Summary Download Strip */}
        <ReportSummaryStrip
          onExportCsv={handleExportCsv}
          onDownloadJsonReport={handleDownloadJsonReport}
        />

        {/* Modal Bottom Action Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 4px 4px',
            marginTop: '20px',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            flexShrink: 0,
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Loom Thread Worker: <strong style={{ color: 'var(--primary)' }}>{diagnostics.metadata.loomThread}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              data-testid="modal-footer-export-csv"
              onClick={handleExportCsv}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={13} /> Export CSV
            </button>
            <button
              type="button"
              data-testid="modal-footer-download-json"
              onClick={handleDownloadJsonReport}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-main)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <FileSpreadsheet size={13} /> JSON Report
            </button>
            <button
              type="button"
              data-testid="modal-footer-close-btn"
              onClick={onClose}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--primary)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Dedicated Record Details Inspector Modal (Flyout Modal) */}
      <RecordDetailDrawer
        selectedRecord={selectedRecord}
        diagnostics={diagnostics}
        fileName={resolvedFileName}
        processName={resolvedProcessName}
        onClose={() => setSelectedRecord(null)}
        onResubmit={handleResubmit}
        resubmittedIds={resubmittedIds}
      />
    </div>
  );
};

export default FileDiagnosticsModal;
