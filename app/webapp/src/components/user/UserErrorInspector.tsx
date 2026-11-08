import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Download, 
  AlertTriangle, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Minimize2, 
  Maximize2, 
  Search,
  Zap,
  Terminal
} from 'lucide-react';
import { DlqErrorItem } from '../admin/AdminDlqConsole';
import { compressWithHeadroom } from '../../utils/headroomCompressor';

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
  const [filterQuery, setFilterQuery] = useState('');
  const [useHeadroomCompression, setUseHeadroomCompression] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredErrors = errors.filter(err => 
    err.errorCode.toLowerCase().includes(filterQuery.toLowerCase()) ||
    err.errorMessage.toLowerCase().includes(filterQuery.toLowerCase()) ||
    err.sequenceNumber.toString().includes(filterQuery) ||
    err.stepName.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const handleCopyPayload = (errId: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(errId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onBack}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#334155',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Headroom Token Compression Mode Toggle */}
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
              background: useHeadroomCompression ? '#ecfdf5' : '#f1f5f9',
              color: useHeadroomCompression ? '#065f46' : '#475569',
              border: `1px solid ${useHeadroomCompression ? '#a7f3d0' : '#cbd5e1'}`
            }}
          >
            <Zap size={14} color={useHeadroomCompression ? '#059669' : '#64748b'} />
            Headroom Mode: {useHeadroomCompression ? 'Compressed (-72% Tokens)' : 'Raw JSON'}
          </button>

          <button
            onClick={onExportErrorCsv}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(220,38,38,0.2)'
            }}
          >
            <Download size={14} /> Export Failed Rows (CSV)
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search by error code, step, or message..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '13px',
              background: '#ffffff',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>
          Showing <strong>{filteredErrors.length}</strong> of {errors.length} failed record(s)
        </div>
      </div>

      {/* Error Cards */}
      {errors.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Check size={24} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#0f172a' }}>All Records Clean</h3>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            No errors recorded for this job. All rows processed successfully!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredErrors.map((err) => {
            const compression = compressWithHeadroom(err.rawPayload);
            const displayText = useHeadroomCompression ? compression.compressedText : err.rawPayload;

            return (
              <div
                key={err.errorId}
                style={{
                  background: '#ffffff',
                  border: '1px solid #fee2e2',
                  borderRadius: '12px',
                  padding: '18px 20px',
                  boxShadow: '0 1px 3px rgba(220,38,38,0.06)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontWeight: 700, 
                      color: '#dc2626', 
                      fontSize: '14px',
                      background: '#fef2f2',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca'
                    }}>
                      Row {err.sequenceNumber}
                    </span>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 700, 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      background: '#fee2e2', 
                      color: '#991b1b',
                      border: '1px solid #fca5a5'
                    }}>
                      {err.errorCode}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Step: <strong>{err.stepName}</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyPayload(err.errorId, displayText)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      color: '#64748b',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedId === err.errorId ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                    {copiedId === err.errorId ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '12px', fontWeight: 500 }}>
                  {err.errorMessage}
                </div>

                {/* Dark Code Terminal for Payload */}
                <div style={{ 
                  background: '#090d16', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  border: '1px solid #1e293b', 
                  overflowX: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <pre style={{ margin: 0, color: '#e2e8f0', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                    {displayText}
                  </pre>
                  {useHeadroomCompression && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: '#10b981', 
                      background: 'rgba(16,185,129,0.15)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      marginLeft: '12px',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      ~{compression.savingsPercentage}% fewer tokens
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
