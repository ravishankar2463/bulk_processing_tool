import React from 'react';
import { FileMetadata } from '../../types/process';

export interface MetadataPanelProps {
  metadata: FileMetadata;
}

export const MetadataPanel: React.FC<MetadataPanelProps> = React.memo(({ metadata }) => {
  return (
    <div 
      data-testid="diagnostics-metadata-panel" 
      className="liquid-glass-card concentric-card-outer"
      style={{ 
        marginBottom: '20px',
        padding: '16px 18px'
      }}
    >
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.04em' }}>
        File Metadata Panel
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>File Size</div>
          <div data-testid="meta-size" className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {(metadata.sizeBytes / (1024 * 1024)).toFixed(2)} MB
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Detected Encoding</div>
          <div data-testid="meta-encoding" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {metadata.encoding}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Delimiter</div>
          <div data-testid="meta-delimiter" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {metadata.delimiter === '\t' ? 'TAB (\\t)' : metadata.delimiter}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Row Count</div>
          <div data-testid="meta-row-count" className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
            {metadata.rowCount.toLocaleString('en-US')}
          </div>
        </div>
        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Loom Virtual Thread</div>
          <div data-testid="meta-loom-thread" style={{ fontSize: '12px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--primary)', fontWeight: 600 }}>
            {metadata.loomThread}
          </div>
        </div>
        <div style={{ gridColumn: 'span 2', background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>SHA-256 Checksum</div>
          <div data-testid="meta-checksum" style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
            {metadata.checksum}
          </div>
        </div>
      </div>
    </div>
  );
});

MetadataPanel.displayName = 'MetadataPanel';
