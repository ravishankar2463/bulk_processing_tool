import React from 'react';

export interface LineageKpiStripProps {
  totalRecordCount: number;
  successfulRecordCount: number;
  failedRecordCount: number;
  inFlightRecordCount: number;
  batchChunksCount: number;
}

export const LineageKpiStrip: React.FC<LineageKpiStripProps> = React.memo(({
  totalRecordCount,
  successfulRecordCount,
  failedRecordCount,
  inFlightRecordCount,
  batchChunksCount
}) => {
  return (
    <div 
      data-testid="file-lineage-kpi-strip"
      className="liquid-glass-card"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: '12px'
      }}
    >
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Records</div>
        <div data-testid="kpi-total-records" className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
          {totalRecordCount.toLocaleString('en-US')}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Success</div>
        <div data-testid="kpi-success-records" className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
          {successfulRecordCount.toLocaleString('en-US')}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Failures</div>
        <div data-testid="kpi-failed-records" className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: failedRecordCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
          {failedRecordCount.toLocaleString('en-US')}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>In-Flight</div>
        <div data-testid="kpi-inflight-records" className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
          {inFlightRecordCount.toLocaleString('en-US')}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Batches</div>
        <div data-testid="kpi-batches-count" className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
          {batchChunksCount} chunks
        </div>
      </div>
    </div>
  );
});

LineageKpiStrip.displayName = 'LineageKpiStrip';
