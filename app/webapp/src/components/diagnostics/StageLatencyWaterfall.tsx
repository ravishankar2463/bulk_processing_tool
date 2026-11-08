import React from 'react';
import { StageLatency } from '../../types/process';

export interface StageLatencyWaterfallProps {
  stageLatencies: ReadonlyArray<StageLatency>;
}

export const StageLatencyWaterfall: React.FC<StageLatencyWaterfallProps> = React.memo(({ stageLatencies }) => {
  return (
    <div data-testid="diagnostics-latency-waterfall" style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
        Pipeline Latency Waterfall (Microseconds)
      </div>
      <div className="liquid-glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px' }}>
        {stageLatencies.map((latency) => (
          <div key={latency.stepId} data-testid={`waterfall-bar-${latency.stepId}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            <span style={{ width: '140px', fontWeight: 600, color: 'var(--text-main)' }}>{latency.stepName}</span>
            <div style={{ flex: 1, height: '16px', background: 'var(--bg-card-subtle)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
              <div
                data-testid={`waterfall-fill-${latency.stepId}`}
                style={{
                  width: `${Math.max(5, latency.percentOfTotal)}%`,
                  height: '100%',
                  background: latency.status === 'ERROR' ? 'var(--danger)' : latency.status === 'WARNING' ? 'var(--warning)' : 'var(--primary)',
                  borderRadius: '4px',
                  transition: 'width var(--transition-spring)'
                }}
              />
            </div>
            <span data-testid={`waterfall-duration-${latency.stepId}`} className="tabular-nums" style={{ width: '105px', textAlign: 'right', fontWeight: 600, color: 'var(--text-main)' }}>
              {latency.durationMicros.toLocaleString('en-US')} µs
            </span>
            <span data-testid={`waterfall-percent-${latency.stepId}`} className="tabular-nums" style={{ width: '50px', textAlign: 'right', color: 'var(--text-muted)' }}>
              {latency.percentOfTotal.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

StageLatencyWaterfall.displayName = 'StageLatencyWaterfall';
