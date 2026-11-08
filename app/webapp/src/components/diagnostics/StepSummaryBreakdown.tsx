import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StageLatency } from '../../types/process';

export interface StepFailureItem {
  stepId: string;
  stepName: string;
  failCount: number;
  distinctErrors: string[];
}

export interface StepSummaryBreakdownProps {
  stageLatencies: ReadonlyArray<StageLatency>;
  rowCount: number;
  errorRecordsCount: number;
  lineageStepFilter: string;
  onSelectStepFilter: (stepId: string) => void;
  stepFailureBreakdown: StepFailureItem[];
  onFilterFailedStep: (stepId: string) => void;
}

export const StepSummaryBreakdown: React.FC<StepSummaryBreakdownProps> = React.memo(({
  stageLatencies,
  rowCount,
  errorRecordsCount,
  lineageStepFilter,
  onSelectStepFilter,
  stepFailureBreakdown,
  onFilterFailedStep
}) => {
  return (
    <>
      {/* 2. Step Summary Breakdown: Input, Success, Failures, In-Flight per Pipeline Step */}
      <div data-testid="step-summary-breakdown" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Step Summary Breakdown
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Click any step to filter records
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {stageLatencies.map((latency) => {
            const inputCount = latency.inputRecords ?? rowCount;
            const failCount = latency.failedRecords ?? (latency.status === 'WARNING' || latency.status === 'ERROR' ? errorRecordsCount : 0);
            const successCount = latency.successRecords ?? (inputCount - failCount);
            const inFlightCount = latency.inFlightRecords ?? 0;
            const isSelected = lineageStepFilter === latency.stepId;

            return (
              <div
                key={latency.stepId}
                data-testid={`step-summary-card-${latency.stepId}`}
                onClick={() => onSelectStepFilter(isSelected ? 'ALL' : latency.stepId)}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-spring)',
                  boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    Stage: {latency.stepName}
                  </span>
                  <span
                    data-testid={`step-status-${latency.stepId}`}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: latency.status === 'ERROR' ? 'var(--danger-bg, #fee2e2)' : latency.status === 'WARNING' ? 'var(--warning-bg, #fef3c7)' : 'var(--success-bg, #dcfce7)',
                      color: latency.status === 'ERROR' ? 'var(--danger, #dc2626)' : latency.status === 'WARNING' ? 'var(--warning-text, #92400e)' : 'var(--success-text, #166534)'
                    }}
                  >
                    {latency.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Input:</span>
                    <span data-testid={`step-input-records-${latency.stepId}`} className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {inputCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Success:</span>
                    <span data-testid={`step-success-records-${latency.stepId}`} className="tabular-nums" style={{ fontWeight: 600, color: 'var(--success)' }}>
                      {successCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Failed:</span>
                    <span 
                      data-testid={`step-failed-records-${latency.stepId}`} 
                      className="tabular-nums" 
                      style={{ fontWeight: 700, color: failCount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}
                    >
                      {failCount.toLocaleString('en-US')}
                    </span>
                  </div>
                  {inFlightCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>In-Flight:</span>
                      <span data-testid={`step-inflight-records-${latency.stepId}`} className="tabular-nums" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                        {inFlightCount.toLocaleString('en-US')}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Latency:</span>
                    <span data-testid={`step-latency-${latency.stepId}`} className="tabular-nums" style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                      {latency.durationMicros.toLocaleString('en-US')} µs
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Which Failed on Which Step Diagnostic Alert */}
      <div data-testid="which-failed-on-step-summary" style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
          Which Failed on Which Step
        </div>
        <div className="liquid-glass-card" style={{ padding: '14px 16px' }}>
          {stepFailureBreakdown.some(s => s.failCount > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stepFailureBreakdown.filter(s => s.failCount > 0).map(s => (
                <div 
                  key={s.stepId} 
                  data-testid={`failed-step-item-${s.stepId}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--danger-bg, #fef2f2)',
                    border: '1px solid var(--danger-border, #fecaca)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={15} color="var(--danger, #dc2626)" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--danger-text, #991b1b)' }}>
                        Stage: {s.stepName} ({s.failCount} failed records)
                      </span>
                    </div>
                    {s.distinctErrors.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--danger-text, #991b1b)', marginTop: '3px', marginLeft: '21px' }}>
                        Quarantined Code(s): {s.distinctErrors.join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    data-testid={`btn-filter-failed-step-${s.stepId}`}
                    onClick={() => onFilterFailedStep(s.stepId)}
                    style={{
                      padding: '5px 12px',
                      background: 'var(--danger, #dc2626)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    View Failures on {s.stepName}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div data-testid="no-step-failures-notice" style={{ fontSize: '13px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> All steps executed with zero quarantined failures.
            </div>
          )}
        </div>
      </div>
    </>
  );
});

StepSummaryBreakdown.displayName = 'StepSummaryBreakdown';
