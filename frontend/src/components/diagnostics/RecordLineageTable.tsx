import React, { useState, useMemo, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { FileRecordItem, StageLatency, RecordStepStatus } from '../../types/process';

export interface RecordLineageTableProps {
  recordsLineage: ReadonlyArray<FileRecordItem>;
  stageLatencies: ReadonlyArray<StageLatency>;
  selectedBatchIndex: number | null;
  lineageStepFilter: string;
  lineageStatusFilter: 'ALL' | RecordStepStatus;
  lineageSearchQuery: string;
  onStepFilterChange: (step: string) => void;
  onStatusFilterChange: (status: 'ALL' | RecordStepStatus) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectRecord: (record: FileRecordItem) => void;
  onResubmitRecord: (recordId: string) => void;
  resubmittedIds: Set<string>;
}

export const RecordLineageTable: React.FC<RecordLineageTableProps> = React.memo(({
  recordsLineage,
  stageLatencies,
  selectedBatchIndex,
  lineageStepFilter,
  lineageStatusFilter,
  lineageSearchQuery,
  onStepFilterChange,
  onStatusFilterChange,
  onSearchQueryChange,
  onSelectRecord,
  onResubmitRecord,
  resubmittedIds
}) => {
  const [lineagePage, setLineagePage] = useState(1);
  const [lineagePageSize, setLineagePageSize] = useState(25);

  // Reset to first page when filters change
  useEffect(() => {
    setLineagePage(1);
  }, [lineageStepFilter, lineageStatusFilter, lineageSearchQuery, selectedBatchIndex]);

  // Memoized filtered lineage records
  const filteredLineage = useMemo(() => {
    return recordsLineage.filter(rec => {
      if (selectedBatchIndex !== null) {
        const matchBatch = rec.batchIndex === selectedBatchIndex ||
                           (rec.batchId && (rec.batchId.endsWith(`batch-${selectedBatchIndex}`) || rec.batchId.includes(`${selectedBatchIndex}`)));
        if (!matchBatch) return false;
      }
      if (lineageStepFilter !== 'ALL' && rec.currentStepId !== lineageStepFilter) {
        return false;
      }
      if (lineageStatusFilter !== 'ALL' && rec.stepStatus !== lineageStatusFilter) {
        return false;
      }
      if (lineageSearchQuery.trim()) {
        const q = lineageSearchQuery.toLowerCase();
        const matchId = rec.recordId.toLowerCase().includes(q);
        const matchLine = String(rec.lineNumber).includes(q);
        const matchError = rec.errorCode?.toLowerCase().includes(q) || rec.errorMessage?.toLowerCase().includes(q);
        const matchStep = rec.currentStepName?.toLowerCase().includes(q) || rec.currentStepId?.toLowerCase().includes(q);
        if (!matchId && !matchLine && !matchError && !matchStep) return false;
      }
      return true;
    });
  }, [recordsLineage, selectedBatchIndex, lineageStepFilter, lineageStatusFilter, lineageSearchQuery]);

  // Windowed Pagination for Lineage Table
  const paginatedLineage = useMemo(() => {
    const start = (lineagePage - 1) * lineagePageSize;
    return filteredLineage.slice(start, start + lineagePageSize);
  }, [filteredLineage, lineagePage, lineagePageSize]);

  const totalLineagePages = Math.max(1, Math.ceil(filteredLineage.length / lineagePageSize));

  return (
    <div data-testid="record-step-lineage-table" className="liquid-glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
            Record Step Lineage & Tracking
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Inspect which records are on which pipeline step, pass/fail state, and payload values
          </div>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Step Filter */}
          <select
            data-testid="filter-lineage-step"
            value={lineageStepFilter}
            onChange={(e) => onStepFilterChange(e.target.value)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <option value="ALL">All Steps</option>
            {stageLatencies.map(s => (
              <option key={s.stepId} value={s.stepId}>Step: {s.stepName}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            data-testid="filter-lineage-status"
            value={lineageStatusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
            style={{
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="PASSED_STEP">Passed Step</option>
            <option value="FAILED_AT_STEP">Failed at Step</option>
            <option value="IN_FLIGHT">In Flight</option>
          </select>

          {/* Search query */}
          <input
            data-testid="filter-lineage-search"
            type="text"
            placeholder="Search record ID or line..."
            value={lineageSearchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '11px',
              width: '160px'
            }}
          />
        </div>
      </div>

      {/* Lineage Table */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
            <tr>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Row #</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Entity Key</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Batch ID</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Step</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Step Status</th>
              <th style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600 }}>Details & Failures</th>
              <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLineage.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No records match the selected step or status filter{selectedBatchIndex !== null ? ` in Chunk #${selectedBatchIndex}` : ''}.
                </td>
              </tr>
            ) : (
              paginatedLineage.map((rec) => {
                const isFailed = rec.stepStatus === 'FAILED_AT_STEP';
                const isPassed = rec.stepStatus === 'PASSED_STEP';
                const isResubmitted = resubmittedIds.has(rec.recordId);

                return (
                  <tr 
                    key={rec.recordId} 
                    data-testid={`record-row-${rec.recordId}`}
                    onClick={() => onSelectRecord(rec)}
                    className="record-lineage-row"
                    style={{ 
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast, 0.15s ease)'
                    }}
                  >
                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }} className="tabular-nums">
                      #{rec.lineNumber}
                    </td>
                    <td 
                      data-testid={`record-id-${rec.recordId}`} 
                      style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord(rec);
                      }}
                    >
                      Rec #{rec.recordId}
                    </td>
                    <td data-testid={`record-batch-${rec.recordId}`} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {rec.batchId}
                    </td>
                    <td data-testid={`record-step-${rec.recordId}`} style={{ padding: '8px 10px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--bg-card-subtle)',
                        color: 'var(--text-main)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid var(--border-subtle)'
                      }}>
                        Stage: {rec.currentStepName}
                      </span>
                    </td>
                    <td data-testid={`record-status-${rec.recordId}`} style={{ padding: '8px 10px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isFailed ? 'var(--danger-bg, #fee2e2)' : isPassed ? 'var(--success-bg, #dcfce7)' : 'var(--primary-light, #dbeafe)',
                        color: isFailed ? 'var(--danger, #dc2626)' : isPassed ? 'var(--success-text, #166534)' : 'var(--primary, #1e40af)'
                      }}>
                        {rec.stepStatus}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      {isFailed ? (
                        <div>
                          <span data-testid={`record-error-${rec.recordId}`} style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '11px' }}>
                            Fault: {rec.errorCode}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Cause: {rec.errorMessage}
                          </div>
                        </div>
                      ) : isPassed ? (
                        <span style={{ color: 'var(--success)', fontSize: '11px', fontWeight: 500 }}>
                          ✓ Passed step processing cleanly
                        </span>
                      ) : (
                        <span style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 500 }}>
                          ⚡ Virtual thread running transformation
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          data-testid={`btn-view-record-${rec.recordId}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRecord(rec);
                          }}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--bg-card)',
                            color: 'var(--text-main)',
                            cursor: 'pointer',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} /> Details
                        </button>
                        {isFailed && (
                          <button
                            data-testid={`btn-resubmit-record-${rec.recordId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onResubmitRecord(rec.recordId);
                            }}
                            disabled={isResubmitted}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              border: '1px solid var(--border-subtle)',
                              background: isResubmitted ? 'var(--bg-card-subtle)' : 'var(--primary-light)',
                              color: isResubmitted ? 'var(--text-muted)' : 'var(--primary)',
                              cursor: isResubmitted ? 'default' : 'pointer',
                              fontWeight: 600
                            }}
                          >
                            {isResubmitted ? 'Resubmitted' : 'Resubmit'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Performance Pagination for Lineage Table */}
      {filteredLineage.length > 0 && (
        <div 
          data-testid="lineage-pagination-controls"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '10px',
            padding: '4px 2px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div data-testid="lineage-pagination-info">
            Showing <strong style={{ color: 'var(--text-main)' }}>{Math.min(filteredLineage.length, (lineagePage - 1) * lineagePageSize + 1)}</strong> to <strong style={{ color: 'var(--text-main)' }}>{Math.min(filteredLineage.length, lineagePage * lineagePageSize)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{filteredLineage.length}</strong> records
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
              data-testid="lineage-page-size-select"
              value={lineagePageSize}
              onChange={(e) => {
                setLineagePageSize(Number(e.target.value));
                setLineagePage(1);
              }}
              style={{
                padding: '3px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '11px'
              }}
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <button
              type="button"
              data-testid="lineage-prev-page-btn"
              disabled={lineagePage <= 1}
              onClick={() => setLineagePage(p => Math.max(1, p - 1))}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: lineagePage <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: lineagePage <= 1 ? 'not-allowed' : 'pointer',
                opacity: lineagePage <= 1 ? 0.5 : 1
              }}
            >
              Prev
            </button>
            <span data-testid="lineage-current-page-indicator" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {lineagePage} / {totalLineagePages}
            </span>
            <button
              type="button"
              data-testid="lineage-next-page-btn"
              disabled={lineagePage >= totalLineagePages}
              onClick={() => setLineagePage(p => Math.min(totalLineagePages, p + 1))}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card)',
                color: lineagePage >= totalLineagePages ? 'var(--text-muted)' : 'var(--text-main)',
                cursor: lineagePage >= totalLineagePages ? 'not-allowed' : 'pointer',
                opacity: lineagePage >= totalLineagePages ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

RecordLineageTable.displayName = 'RecordLineageTable';
