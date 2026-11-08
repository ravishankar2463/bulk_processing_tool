import React from 'react';
import { X } from 'lucide-react';

export interface DiagnosticsHeaderProps {
  jobId: string;
  fileName: string;
  processName: string;
  onClose: () => void;
}

export const DiagnosticsHeader: React.FC<DiagnosticsHeaderProps> = React.memo(({
  jobId,
  fileName,
  processName,
  onClose
}) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '20px', 
        borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        paddingBottom: '16px' 
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className="liquid-glass-pill" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', padding: '2px 10px' }}>
            TIER 3 FULL FILE DRAWER
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Batches · Records · Lineage · DLQ · Reports
          </span>
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          {`Deep File Diagnostics: ${jobId}`}
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{fileName}</span>
          <span>·</span>
          <span>{processName}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          data-testid="close-diagnostics-btn"
          onClick={onClose}
          aria-label="Close Diagnostics Modal"
          style={{
            background: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '6px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all var(--transition-spring)'
          }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
});

DiagnosticsHeader.displayName = 'DiagnosticsHeader';
