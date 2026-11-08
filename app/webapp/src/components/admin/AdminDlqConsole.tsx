import React, { useState } from 'react';
import { 
  AlertOctagon, 
  RotateCcw, 
  RefreshCw, 
  Search, 
  Zap, 
  Copy, 
  Check, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { compressWithHeadroom } from '../../utils/headroomCompressor';

export interface DlqErrorItem {
  errorId: number;
  jobId: string;
  batchId?: string;
  sequenceNumber: number;
  stepName: string;
  errorCode: string;
  errorMessage: string;
  rawPayload: string;
}

interface Props {
  errors: DlqErrorItem[];
  onResubmit: (errorId: number) => void;
  onRefresh: () => void;
  onInspectJob?: (jobId: string) => void;
}

export const AdminDlqConsole: React.FC<Props> = ({
  errors,
  onResubmit,
  onRefresh,
  onInspectJob
}) => {
  const [filterJobId, setFilterJobId] = useState<string>('');
  const [useHeadroomCompression, setUseHeadroomCompression] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredErrors = filterJobId
    ? errors.filter((e) => 
        e.jobId.toLowerCase().includes(filterJobId.toLowerCase()) ||
        e.errorCode.toLowerCase().includes(filterJobId.toLowerCase()) ||
        e.stepName.toLowerCase().includes(filterJobId.toLowerCase())
      )
    : errors;

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              Dead Letter Queue (DLQ) Console
            </h2>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              background: errors.length > 0 ? 'var(--danger-bg, #fee2e2)' : 'var(--success-bg, #dcfce7)', 
              color: errors.length > 0 ? 'var(--danger-text, #991b1b)' : 'var(--success-text, #166534)', 
              padding: '2px 8px', 
              borderRadius: '999px',
              border: `1px solid ${errors.length > 0 ? 'var(--danger-border, #fecaca)' : 'var(--success-border, #bbf7d0)'}`
            }}>
              {errors.length} quarantined record(s)
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            Inspect failed records, root-cause validation or processing exceptions, and re-inject into processing
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Headroom Token Compressor Toggle */}
          <button
            type="button"
            onClick={() => setUseHeadroomCompression(!useHeadroomCompression)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: useHeadroomCompression ? 'var(--success-bg, #ecfdf5)' : 'var(--bg-card-subtle, #f1f5f9)',
              color: useHeadroomCompression ? 'var(--success-text, #065f46)' : 'var(--text-muted, #475569)',
              border: `1px solid ${useHeadroomCompression ? 'var(--success-border, #a7f3d0)' : 'var(--border-subtle, #cbd5e1)'}`
            }}
          >
            <Zap size={14} color={useHeadroomCompression ? '#059669' : '#64748b'} />
            Headroom Mode: {useHeadroomCompression ? 'Compressed (-74% Tokens)' : 'Raw JSON'}
          </button>

          <button
            onClick={onRefresh}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #334155)',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
            }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Filter by Job ID, error code, step..."
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              outline: 'none'
            }}
          />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
          Showing <strong>{filteredErrors.length}</strong> failed record(s)
        </span>
      </div>

      {/* Table / Empty State */}
      {filteredErrors.length === 0 ? (
        <div
          className="liquid-glass-card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--glass-card, #ffffff)',
            borderRadius: '14px',
            border: '1px dashed var(--border-subtle, #cbd5e1)'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg, #dcfce7)', color: 'var(--success, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle2 size={24} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-main, #0f172a)' }}>Dead Letter Queue is Empty</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            No failed records found matching current filter criteria.
          </p>
        </div>
      ) : (
        <div 
          className="liquid-glass-card"
          style={{ 
            background: 'var(--glass-card, #ffffff)', 
            border: '1px solid var(--glass-border, #e2e8f0)', 
            borderRadius: '14px', 
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))' 
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card-subtle, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', color: 'var(--text-muted, #475569)', fontWeight: 600 }}>
                <th style={{ padding: '12px 18px' }}>Error ID / Job ID</th>
                <th style={{ padding: '12px 16px' }}>Seq #</th>
                <th style={{ padding: '12px 16px' }}>Failed Step</th>
                <th style={{ padding: '12px 16px' }}>Error Details</th>
                <th style={{ padding: '12px 16px' }}>Payload</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredErrors.map((err, index) => {
                const displayPayload = useHeadroomCompression
                  ? compressWithHeadroom(err.rawPayload).compressedText
                  : err.rawPayload;
                const rowKey = `${err.jobId}-${err.errorId}-${err.sequenceNumber ?? index}`;

                return (
                  <tr key={rowKey} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>#{err.errorId}</div>
                      {onInspectJob ? (
                        <button
                          onClick={() => onInspectJob(err.jobId)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontSize: '12px',
                            color: 'var(--primary, #2563eb)',
                            fontFamily: 'var(--font-mono)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            textDecoration: 'underline'
                          }}
                          title="Open deep file diagnostics drawer for this job"
                        >
                          {err.jobId} <ExternalLink size={10} />
                        </button>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontFamily: 'var(--font-mono)' }}>{err.jobId}</div>
                      )}
                      {err.batchId && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{err.batchId}</div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-main, #0f172a)', fontWeight: 600 }} className="tabular-nums">
                      {err.sequenceNumber}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        background: 'var(--danger-bg, #fee2e2)', 
                        color: 'var(--danger-text, #991b1b)',
                        border: '1px solid var(--danger-border, #fecaca)'
                      }}>
                        {err.stepName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 700, color: 'var(--danger, #dc2626)', fontSize: '12px', marginBottom: '2px' }}>
                        {err.errorCode}
                      </div>
                      <div style={{ color: 'var(--text-muted, #475569)', fontSize: '12px', lineHeight: 1.4 }}>
                        {err.errorMessage}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '260px' }}>
                      <div style={{ position: 'relative' }}>
                        <pre style={{ 
                          margin: 0, 
                          padding: '6px 10px', 
                          background: '#090d16', 
                          color: '#f8fafc', 
                          borderRadius: '6px', 
                          fontSize: '11px', 
                          fontFamily: 'var(--font-mono)',
                          overflowX: 'auto', 
                          maxHeight: '65px',
                          border: '1px solid #1e293b'
                        }}>
                          {displayPayload}
                        </pre>
                        <button
                          onClick={() => handleCopy(err.errorId, displayPayload)}
                          title="Copy payload"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            cursor: 'pointer',
                            fontSize: '10px'
                          }}
                        >
                          {copiedId === err.errorId ? <Check size={10} color="#10b981" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => onResubmit(err.errorId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 14px',
                          background: 'var(--primary, #2563eb)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
                        }}
                      >
                        <RotateCcw size={12} /> Resubmit Record
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
