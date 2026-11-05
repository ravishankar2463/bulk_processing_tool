import React from 'react';
import { ArrowLeft, Download, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { DlqErrorItem } from '../admin/AdminDlqConsole';

interface Props {
  jobId: string;
  errors: DlqErrorItem[];
  onExportErrorCsv: () => void;
  onBack: () => void;
}

export const UserErrorInspector: React.FC<Props> = ({
  jobId,
  errors,
  onExportErrorCsv,
  onBack
}) => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Error Inspector: {jobId}
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Detailed breakdown of rejected rows and validation exceptions
            </span>
          </div>
        </div>

        <button
          onClick={onExportErrorCsv}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Download size={14} /> Export Failed Rows (CSV)
        </button>
      </div>

      {errors.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            No errors recorded for this job. All rows processed successfully!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {errors.map((err) => (
            <div
              key={err.errorId}
              style={{
                background: '#ffffff',
                border: '1px solid #fee2e2',
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '14px' }}>
                    Row {err.sequenceNumber}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                    {err.errorCode}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Step: {err.stepName}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px', fontWeight: 500 }}>
                {err.errorMessage}
              </div>

              <div style={{ background: '#0f172a', padding: '8px 12px', borderRadius: '6px', overflowX: 'auto' }}>
                <pre style={{ margin: 0, color: '#f8fafc', fontSize: '12px', fontFamily: 'monospace' }}>
                  {err.rawPayload}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
