import React, { useState } from 'react';
import { AlertOctagon, RotateCcw, RefreshCw, Search, Code } from 'lucide-react';

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
}

export const AdminDlqConsole: React.FC<Props> = ({
  errors,
  onResubmit,
  onRefresh
}) => {
  const [filterJobId, setFilterJobId] = useState<string>('');

  const filteredErrors = filterJobId
    ? errors.filter((e) => e.jobId.toLowerCase().includes(filterJobId.toLowerCase()))
    : errors;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
            Dead Letter Queue (DLQ) Console
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Inspect failed records, root-cause validation or processing exceptions, and re-inject into processing
          </p>
        </div>
        <button
          onClick={onRefresh}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            borderRadius: '6px',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
          <input
            type="text"
            placeholder="Filter by Job ID..."
            value={filterJobId}
            onChange={(e) => setFilterJobId(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
        </div>
        <span style={{ fontSize: '13px', color: '#64748b' }}>
          Showing {filteredErrors.length} failed record(s)
        </span>
      </div>

      {filteredErrors.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <AlertOctagon size={36} color="#10b981" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>Dead Letter Queue is Empty</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            No failed records found matching current filter criteria.
          </p>
        </div>
      ) : (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                <th style={{ padding: '12px 16px' }}>Error ID / Job ID</th>
                <th style={{ padding: '12px 16px' }}>Seq #</th>
                <th style={{ padding: '12px 16px' }}>Failed Step</th>
                <th style={{ padding: '12px 16px' }}>Error Details</th>
                <th style={{ padding: '12px 16px' }}>Raw Payload</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredErrors.map((err) => (
                <tr key={err.errorId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>#{err.errorId}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{err.jobId}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>
                    {err.sequenceNumber}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b' }}>
                      {err.stepName}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '12px' }}>{err.errorCode}</div>
                    <div style={{ color: '#475569', fontSize: '12px' }}>{err.errorMessage}</div>
                  </td>
                  <td style={{ padding: '12px 16px', maxWidth: '250px' }}>
                    <pre style={{ margin: 0, padding: '4px 8px', background: '#0f172a', color: '#f8fafc', borderRadius: '4px', fontSize: '11px', overflowX: 'auto' }}>
                      {err.rawPayload}
                    </pre>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => onResubmit(err.errorId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <RotateCcw size={12} /> Resubmit Record
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

