import React from 'react';
import { FileSpreadsheet, FileCode } from 'lucide-react';

export interface ReportSummaryStripProps {
  onExportCsv: () => void;
  onDownloadJsonReport: () => void;
}

export const ReportSummaryStrip: React.FC<ReportSummaryStripProps> = React.memo(({
  onExportCsv,
  onDownloadJsonReport
}) => {
  return (
    <div 
      className="liquid-glass-card" 
      style={{ 
        padding: '16px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
          Execution & Audit Report Generator
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Download certified audit logs with cryptographic SHA-256 verification
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onExportCsv}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-hover)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-main)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <FileSpreadsheet size={14} color="var(--primary)" /> Download Audit CSV
        </button>
        <button
          onClick={onDownloadJsonReport}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
          }}
        >
          <FileCode size={14} /> Download Full JSON Report
        </button>
      </div>
    </div>
  );
});
