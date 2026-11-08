import React, { useState, useMemo } from 'react';
import { X, HardDrive, AlertOctagon, Copy, Check, RefreshCw, RotateCcw } from 'lucide-react';
import { FileRecordItem, RecordErrorItem, FileDiagnosticsData, RecordStepStatus } from '../../types/process';

export interface RecordDetailDrawerProps {
  selectedRecord: FileRecordItem | RecordErrorItem | null;
  diagnostics: FileDiagnosticsData | null;
  fileName: string;
  processName: string;
  onClose: () => void;
  onResubmit: (recordId: string) => void;
  onRetryMode?: (recordId: string, mode: 'FROM_FAILED_STEP' | 'FROM_START') => void;
  resubmittedIds: Set<string>;
}

export const RecordDetailDrawer: React.FC<RecordDetailDrawerProps> = React.memo(({
  selectedRecord,
  diagnostics,
  fileName,
  processName,
  onClose,
  onResubmit,
  onRetryMode,
  resubmittedIds
}) => {
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Normalize selected record to support both FileRecordItem and RecordErrorItem
  const normalized = useMemo(() => {
    if (!selectedRecord) return null;
    const isLineageItem = 'stepStatus' in selectedRecord;
    const recordId = selectedRecord.recordId;
    const lineNumber = selectedRecord.lineNumber;
    const batchId = selectedRecord.batchId || ('batchIndex' in selectedRecord ? `batch-${(selectedRecord as any).batchIndex}` : 'batch-0');
    const stepName = isLineageItem ? (selectedRecord as FileRecordItem).currentStepName : ((selectedRecord as RecordErrorItem).stepName || 'Dynamic Schema Validator');
    const stepStatus: RecordStepStatus = isLineageItem ? (selectedRecord as FileRecordItem).stepStatus : 'FAILED_AT_STEP';
    const errorCode = selectedRecord.errorCode;
    const errorMessage = selectedRecord.errorMessage;
    const schemaTuple = selectedRecord.schemaTuple || {};
    const rawPayload = selectedRecord.rawPayload || '';
    const processedAt = 'processedAt' in selectedRecord ? (selectedRecord as any).processedAt : undefined;

    const traversalHistory = selectedRecord.traversalHistory || [
      {
        nodeId: 'node-source-csv',
        nodeName: 'CSV Ingestion Connector',
        timestamp: '2026-11-08T23:50:01.120Z',
        status: 'SUCCESS' as const,
        stepDetails: 'Row parsed and validated against header schema'
      },
      {
        nodeId: 'node-rest-composite',
        nodeName: 'Customer Enrichment Capsule',
        timestamp: '2026-11-08T23:50:02.450Z',
        status: 'SUCCESS' as const,
        stepDetails: 'HTTP POST 200 OK • Injected KYC attributes'
      },
      {
        nodeId: 'node-kyc-val',
        nodeName: stepName || 'KYC Validator',
        timestamp: '2026-11-08T23:50:03.010Z',
        status: stepStatus === 'FAILED_AT_STEP' ? ('FAILED' as const) : ('SUCCESS' as const),
        stepDetails: stepStatus === 'FAILED_AT_STEP' ? (errorMessage || 'Validation fault') : 'Step completed successfully'
      }
    ];

    return {
      recordId,
      lineNumber,
      batchId,
      stepName,
      stepStatus,
      errorCode,
      errorMessage,
      schemaTuple,
      rawPayload,
      processedAt,
      traversalHistory
    };
  }, [selectedRecord]);

  if (!normalized) return null;

  return (
    <div
      data-testid="record-details-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        zIndex: 1300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        data-testid="record-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-details-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #cbd5e1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          position: 'relative'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--primary)',
                background: 'var(--primary-light, #eff6ff)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}>
                RECORD DETAILS
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Row #{normalized.lineNumber} in source file
              </span>
            </div>
            <h3
              id="record-details-title"
              data-testid="record-details-title"
              style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}
            >
              Record Details: {normalized.recordId}
            </h3>
          </div>
          <button
            data-testid="btn-close-record-details"
            onClick={onClose}
            style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            aria-label="Close record details"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Metadata Grid */}
        <div
          data-testid="record-details-meta-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            padding: '12px 14px',
            borderRadius: '10px',
            background: 'var(--bg-card-subtle)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Record ID</div>
            <div data-testid="record-details-id" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
              #{normalized.recordId}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Source Line</div>
            <div data-testid="record-details-line" className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
              Line #{normalized.lineNumber}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Batch Chunk</div>
            <div data-testid="record-details-batch" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {normalized.batchId}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Current Status</div>
            <span
              data-testid="record-details-status"
              style={{
                display: 'inline-block',
                marginTop: '2px',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                background: normalized.stepStatus === 'FAILED_AT_STEP' ? 'var(--danger-bg, #fee2e2)' : normalized.stepStatus === 'PASSED_STEP' ? 'var(--success-bg, #dcfce7)' : 'var(--primary-light, #dbeafe)',
                color: normalized.stepStatus === 'FAILED_AT_STEP' ? 'var(--danger, #dc2626)' : normalized.stepStatus === 'PASSED_STEP' ? 'var(--success-text, #166534)' : 'var(--primary, #1e40af)'
              }}
            >
              {normalized.stepStatus}
            </span>
          </div>
        </div>

        {/* Active Step Strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
            Active Pipeline Stage:
          </span>
          <span
            data-testid="record-details-step"
            style={{
              fontWeight: 600,
              color: 'var(--text-main)',
              background: 'var(--bg-card)',
              padding: '3px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {normalized.stepName}
          </span>
        </div>

        {/* Source File Metadata & Ingestion Context */}
        {diagnostics && diagnostics.metadata && (
          <div
            data-testid="record-details-file-meta-panel"
            style={{
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-subtle)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <HardDrive size={13} color="var(--primary)" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Source File Metadata & Ingestion Context
                </span>
              </div>
              <span
                data-testid="record-details-file-name-badge"
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                {fileName}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px'
              }}
            >
              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>File Name</div>
                <div data-testid="record-file-name" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', wordBreak: 'break-all' }}>
                  {fileName}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Job & Process</div>
                <div data-testid="record-file-job" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', wordBreak: 'break-all' }}>
                  {diagnostics.jobId}
                </div>
                <div data-testid="record-file-process" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {processName}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>File Size</div>
                <div data-testid="record-file-size" className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {(diagnostics.metadata.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Encoding & Delimiter</div>
                <div data-testid="record-file-encoding-delimiter" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {diagnostics.metadata.encoding} · {diagnostics.metadata.delimiter === '\t' ? 'TAB' : diagnostics.metadata.delimiter === ',' ? "Comma (',')" : diagnostics.metadata.delimiter}
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total File Rows</div>
                <div data-testid="record-file-row-count" className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {diagnostics.metadata.rowCount.toLocaleString('en-US')} records
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Loom Worker</div>
                <div data-testid="record-file-loom-thread" style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>
                  {diagnostics.metadata.loomThread}
                </div>
              </div>
            </div>

            {/* SHA-256 Checksum */}
            <div style={{ background: 'var(--bg-card)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>File Integrity SHA-256 Checksum</div>
              <div data-testid="record-file-checksum" style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                {diagnostics.metadata.checksum}
              </div>
            </div>
          </div>
        )}

        {/* Fault & Error Banner (when failed) */}
        {normalized.stepStatus === 'FAILED_AT_STEP' && normalized.errorCode && (
          <div
            data-testid="record-details-fault-banner"
            style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'var(--danger-bg, #fef2f2)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertOctagon size={16} color="var(--danger, #dc2626)" />
              <span data-testid="record-details-error-code" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger, #dc2626)' }}>
                Fault Code: {normalized.errorCode}
              </span>
            </div>
            <div data-testid="record-details-error-message" style={{ fontSize: '12px', color: 'var(--text-main)', paddingLeft: '24px' }}>
              {normalized.errorMessage}
            </div>
          </div>
        )}

        {/* Extracted Schema Attributes (Parsed Tuple View) */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Extracted Schema Attributes (Tuple View)
          </div>
          <div
            data-testid="record-details-tuple"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {Object.keys(normalized.schemaTuple).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No structured attributes available</div>
            ) : (
              Object.entries(normalized.schemaTuple).map(([k, v]) => (
                <div
                  key={k}
                  data-testid={`record-tuple-field-${k}`}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {k}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {String(v)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Node Traversal History Timeline */}
        <div data-testid="node-traversal-history" data-test-section="node-traversal-history-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Node Traversal History (Audit Trail)
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {normalized.traversalHistory.length} node{normalized.traversalHistory.length !== 1 ? 's' : ''} traversed
            </span>
          </div>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '12px',
            background: 'var(--bg-card-subtle, #f8fafc)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle, #e2e8f0)'
          }}>
            {normalized.traversalHistory.map((step, idx) => (
              <div 
                key={`${step.nodeId}-${idx}`}
                data-testid={`traversal-step-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: '#ffffff',
                  border: `1px solid ${step.status === 'FAILED' ? '#fecaca' : '#e2e8f0'}`
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: step.status === 'FAILED' ? '#fee2e2' : '#dcfce7',
                  color: step.status === 'FAILED' ? '#dc2626' : '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: '1px'
                }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                      {step.nodeName}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: step.status === 'FAILED' ? '#fee2e2' : '#dcfce7',
                      color: step.status === 'FAILED' ? '#991b1b' : '#166534'
                    }}>
                      {step.status}
                    </span>
                  </div>
                  {step.stepDetails && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {step.stepDetails}
                    </div>
                  )}
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                    {step.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Raw Ingested Payload */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Raw Ingested Payload
            </span>
            <button
              data-testid="btn-copy-payload-details"
              onClick={() => {
                navigator.clipboard.writeText(normalized.rawPayload);
                setCopiedPayload(true);
                setTimeout(() => setCopiedPayload(false), 2000);
              }}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-card-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {copiedPayload ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              {copiedPayload ? 'Copied' : 'Copy Payload'}
            </button>
          </div>
          <pre
            data-testid="record-details-payload"
            style={{
              margin: 0,
              padding: '12px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '11px',
              lineHeight: '1.5',
              overflowX: 'auto',
              fontFamily: 'var(--font-mono, monospace)',
              border: '1px solid #1e293b'
            }}
          >
            {(() => {
              try {
                return JSON.stringify(JSON.parse(normalized.rawPayload), null, 2);
              } catch {
                return normalized.rawPayload;
              }
            })()}
          </pre>
        </div>

        {/* Modal Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button
            data-testid="btn-close-record-details-footer"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card-subtle)',
              color: 'var(--text-main)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          {normalized.stepStatus === 'FAILED_AT_STEP' && (
            <>
              <button
                data-testid="retry-from-failed-step-btn"
                onClick={() => {
                  if (onRetryMode) onRetryMode(normalized.recordId, 'FROM_FAILED_STEP');
                  onResubmit(normalized.recordId);
                }}
                disabled={resubmittedIds.has(normalized.recordId)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #93c5fd',
                  background: resubmittedIds.has(normalized.recordId) ? 'var(--bg-card-subtle)' : '#eff6ff',
                  color: resubmittedIds.has(normalized.recordId) ? 'var(--text-muted)' : '#1d4ed8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: resubmittedIds.has(normalized.recordId) ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RefreshCw size={12} />
                Retry from Failed Step
              </button>

              <button
                data-testid="replay-from-start-btn"
                onClick={() => {
                  if (onRetryMode) onRetryMode(normalized.recordId, 'FROM_START');
                  onResubmit(normalized.recordId);
                }}
                disabled={resubmittedIds.has(normalized.recordId)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: resubmittedIds.has(normalized.recordId) ? 'var(--bg-card-subtle)' : '#f8fafc',
                  color: resubmittedIds.has(normalized.recordId) ? 'var(--text-muted)' : '#334155',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: resubmittedIds.has(normalized.recordId) ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <RotateCcw size={12} />
                Replay from Start
              </button>

              <button
                data-testid="btn-resubmit-record-details"
                onClick={() => onResubmit(normalized.recordId)}
                disabled={resubmittedIds.has(normalized.recordId)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: resubmittedIds.has(normalized.recordId) ? 'var(--bg-card-subtle)' : 'var(--primary)',
                  color: resubmittedIds.has(normalized.recordId) ? 'var(--text-muted)' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: resubmittedIds.has(normalized.recordId) ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RefreshCw size={13} />
                {resubmittedIds.has(normalized.recordId) ? 'Resubmitted' : 'Resubmit Record'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
