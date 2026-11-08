import React, { useState, useMemo, useEffect } from 'react';
import { Download, Zap, Eye } from 'lucide-react';
import { RecordErrorItem } from '../../types/process';
import { compressWithHeadroom } from '../../utils/headroomCompressor';

export interface ErrorInspectorProps {
  errors: ReadonlyArray<RecordErrorItem>;
  selectedBatchIndex: number | null;
  onSelectRecord: (record: RecordErrorItem) => void;
  onResubmitRecord: (recordId: string) => void;
  resubmittedIds: Set<string>;
  onExportCsv: () => void;
}

export const ErrorInspector: React.FC<ErrorInspectorProps> = React.memo(({
  errors,
  selectedBatchIndex,
  onSelectRecord,
  onResubmitRecord,
  resubmittedIds,
  onExportCsv
}) => {
  const [activeInspectorTab, setActiveInspectorTab] = useState<'SCHEMA_TUPLE' | 'RAW_JSON'>('SCHEMA_TUPLE');
  const [useHeadroom, setUseHeadroom] = useState(false);
  const [errorPage, setErrorPage] = useState(1);
  const [errorPageSize, setErrorPageSize] = useState(25);

  // Reset to first page when batch selection changes
  useEffect(() => {
    setErrorPage(1);
  }, [selectedBatchIndex]);

  // Memoized filtered error records by batch chunk
  const filteredErrors = useMemo(() => {
    if (selectedBatchIndex === null) return errors;
    return errors.filter(e => {
      if (e.batchId) {
        return e.batchId.endsWith(`batch-${selectedBatchIndex}`) || e.batchId.includes(`${selectedBatchIndex}`);
      }
      return true;
    });
  }, [errors, selectedBatchIndex]);

  // Windowed pagination for table view
  const paginatedErrors = useMemo(() => {
    const start = (errorPage - 1) * errorPageSize;
    return filteredErrors.slice(start, start + errorPageSize);
  }, [filteredErrors, errorPage, errorPageSize]);

  const totalErrorPages = Math.max(1, Math.ceil(filteredErrors.length / errorPageSize));

  // Lazy JSON formatting - only serialized when RAW_JSON tab is active
  const rawJsonString = useMemo(() => {
    if (activeInspectorTab !== 'RAW_JSON') return '';
    return JSON.stringify(filteredErrors, null, 2);
  }, [filteredErrors, activeInspectorTab]);

  // Lazy Headroom compression - only executed when Headroom toggle is active
  const headroomResult = useMemo(() => {
    if (!useHeadroom) {
      return {
        originalRaw: '',
        compressedText: '',
        originalTokensEstimate: 0,
        compressedTokensEstimate: 0,
        savingsPercentage: 74,
        isCompressed: true
      };
    }
    return compressWithHeadroom(filteredErrors);
  }, [filteredErrors, useHeadroom]);

  return (
    <div data-testid="diagnostics-error-inspector" className="liquid-glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            data-testid="tab-schema-tuple"
            onClick={() => setActiveInspectorTab('SCHEMA_TUPLE')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeInspectorTab === 'SCHEMA_TUPLE' ? 'var(--primary)' : 'var(--bg-card-subtle)',
              color: activeInspectorTab === 'SCHEMA_TUPLE' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Schema Tuple View
          </button>
          <button
            data-testid="tab-raw-json"
            onClick={() => setActiveInspectorTab('RAW_JSON')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeInspectorTab === 'RAW_JSON' ? 'var(--primary)' : 'var(--bg-card-subtle)',
              color: activeInspectorTab === 'RAW_JSON' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Raw JSON Terminal
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Headroom Context Compression Toggle */}
          <label
            data-testid="headroom-toggle-label"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              fontWeight: 600, 
              cursor: 'pointer', 
              background: 'var(--bg-card-subtle)', 
              padding: '5px 12px', 
              borderRadius: '6px',
              color: 'var(--text-main)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <input
              data-testid="headroom-toggle-checkbox"
              type="checkbox"
              checked={useHeadroom}
              onChange={(e) => setUseHeadroom(e.target.checked)}
            />
            <span>Headroom Compression (-74% tokens)</span>
          </label>

          {/* CSV Export Button */}
          <button
            data-testid="btn-export-errors-csv"
            onClick={onExportCsv}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid var(--border-hover)',
              background: 'var(--bg-card)',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Savings Metric when Headroom is Active */}
      {useHeadroom && (
        <div
          data-testid="headroom-savings-banner"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: '#10b981'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="#10b981" />
            Structural Deduplication Active: Raw schema tuples indexed
          </span>
          <span data-testid="headroom-savings-pct" className="tabular-nums" style={{ fontWeight: 700 }}>
            -{headroomResult.savingsPercentage}% Token Reduction ({headroomResult.originalTokensEstimate} ➔ {headroomResult.compressedTokensEstimate} tokens)
          </span>
        </div>
      )}

      {activeInspectorTab === 'SCHEMA_TUPLE' ? (
        <div data-testid="schema-tuple-view-table" style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Record ID</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Line</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Error Code</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Error Message</th>
                <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Schema Values</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredErrors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No errors recorded for this job{selectedBatchIndex !== null ? ` in Chunk #${selectedBatchIndex}` : ''}.
                  </td>
                </tr>
              ) : (
                paginatedErrors.map((err) => {
                  const isResubmitted = resubmittedIds.has(err.recordId);
                  return (
                    <tr 
                      key={err.recordId} 
                      data-testid={`error-row-${err.recordId}`} 
                      onClick={() => onSelectRecord(err)}
                      className="record-lineage-row"
                      style={{ 
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast, 0.15s ease)'
                      }}
                    >
                      <td 
                        data-testid={`error-id-${err.recordId}`} 
                        style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRecord(err);
                        }}
                      >
                        {err.recordId}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }} className="tabular-nums">{err.lineNumber}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--danger)', fontWeight: 600 }}>{err.errorCode}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-main)' }}>{err.errorMessage}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', color: 'var(--text-muted)' }}>
                        {JSON.stringify(err.schemaTuple)}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            data-testid={`btn-view-error-${err.recordId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectRecord(err);
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
                          <button
                            data-testid={`btn-resubmit-error-${err.recordId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onResubmitRecord(err.recordId);
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
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Performance Pagination for Error Inspector */}
          {filteredErrors.length > 0 && (
            <div 
              data-testid="errors-pagination-controls"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--bg-card-subtle)',
                borderTop: '1px solid var(--border-subtle)',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div data-testid="error-pagination-info">
                Showing <strong style={{ color: 'var(--text-main)' }}>{Math.min(filteredErrors.length, (errorPage - 1) * errorPageSize + 1)}</strong> to <strong style={{ color: 'var(--text-main)' }}>{Math.min(filteredErrors.length, errorPage * errorPageSize)}</strong> of <strong style={{ color: 'var(--text-main)' }}>{filteredErrors.length}</strong> errors
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select
                  data-testid="errors-page-size-select"
                  value={errorPageSize}
                  onChange={(e) => {
                    setErrorPageSize(Number(e.target.value));
                    setErrorPage(1);
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
                  data-testid="errors-prev-page-btn"
                  disabled={errorPage <= 1}
                  onClick={() => setErrorPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: errorPage <= 1 ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: errorPage <= 1 ? 'not-allowed' : 'pointer',
                    opacity: errorPage <= 1 ? 0.5 : 1
                  }}
                >
                  Prev
                </button>
                <span data-testid="errors-current-page-indicator" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {errorPage} / {totalErrorPages}
                </span>
                <button
                  type="button"
                  data-testid="errors-next-page-btn"
                  disabled={errorPage >= totalErrorPages}
                  onClick={() => setErrorPage(p => Math.min(totalErrorPages, p + 1))}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-card)',
                    color: errorPage >= totalErrorPages ? 'var(--text-muted)' : 'var(--text-main)',
                    cursor: errorPage >= totalErrorPages ? 'not-allowed' : 'pointer',
                    opacity: errorPage >= totalErrorPages ? 0.5 : 1
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div data-testid="raw-json-terminal">
          <pre
            data-testid="raw-json-content"
            style={{
              margin: 0,
              padding: '12px',
              background: '#060910',
              color: '#94a3b8',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              maxHeight: '260px',
              overflowY: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              lineHeight: 1.5
            }}
          >
            {useHeadroom ? headroomResult.compressedText : rawJsonString}
          </pre>
        </div>
      )}
    </div>
  );
});
