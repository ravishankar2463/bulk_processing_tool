import React from 'react';
import { Layers, ShieldCheck, Cpu, Split, Workflow } from 'lucide-react';

export interface ComponentKpiMetrics {
  total: number;
  validators: number;
  processors: number;
  splitters: number;
  writers: number;
  bound: number;
  unbound: number;
}

interface ComponentKpiRibbonProps {
  metrics: ComponentKpiMetrics;
  selectedType: string;
  onSelectType: (type: string) => void;
  usageFilter: 'ALL' | 'USED' | 'UNUSED';
  onSelectUsage: (usage: 'ALL' | 'USED' | 'UNUSED') => void;
}

export const ComponentKpiRibbon: React.FC<ComponentKpiRibbonProps> = ({
  metrics,
  selectedType,
  onSelectType,
  usageFilter,
  onSelectUsage
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '14px',
      marginBottom: '20px'
    }}>
      {/* Total Components Card */}
      <div 
        className="liquid-glass-card"
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'var(--primary-light, #eff6ff)',
          color: 'var(--primary, #2563eb)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--primary-border, #bfdbfe)'
        }}>
          <Layers size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Registry
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
            {metrics.total} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted, #64748b)' }}>modules</span>
          </div>
        </div>
      </div>

      {/* Validators KPI */}
      <div 
        role="button"
        tabIndex={0}
        aria-pressed={selectedType === 'VALIDATOR'}
        aria-label="Filter by Validators"
        onClick={() => onSelectType(selectedType === 'VALIDATOR' ? 'ALL' : 'VALIDATOR')}
        onKeyDown={(e) => handleKeyDown(e, () => onSelectType(selectedType === 'VALIDATOR' ? 'ALL' : 'VALIDATOR'))}
        className="liquid-glass-card"
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: selectedType === 'VALIDATOR' ? '2px solid #10b981' : '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: '#ecfdf5',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #a7f3d0'
        }}>
          <ShieldCheck size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Validators
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
            {metrics.validators}
          </div>
        </div>
      </div>

      {/* Processors KPI */}
      <div 
        role="button"
        tabIndex={0}
        aria-pressed={selectedType === 'BATCH_PROCESSOR'}
        aria-label="Filter by Batch Processors"
        onClick={() => onSelectType(selectedType === 'BATCH_PROCESSOR' ? 'ALL' : 'BATCH_PROCESSOR')}
        onKeyDown={(e) => handleKeyDown(e, () => onSelectType(selectedType === 'BATCH_PROCESSOR' ? 'ALL' : 'BATCH_PROCESSOR'))}
        className="liquid-glass-card"
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: selectedType === 'BATCH_PROCESSOR' ? '2px solid #6366f1' : '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: '#eef2ff',
          color: '#4f46e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #c7d2fe'
        }}>
          <Cpu size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Processors
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
            {metrics.processors}
          </div>
        </div>
      </div>

      {/* Splitters KPI */}
      <div 
        role="button"
        tabIndex={0}
        aria-pressed={selectedType === 'SPLITTER'}
        aria-label="Filter by Streaming Splitters"
        onClick={() => onSelectType(selectedType === 'SPLITTER' ? 'ALL' : 'SPLITTER')}
        onKeyDown={(e) => handleKeyDown(e, () => onSelectType(selectedType === 'SPLITTER' ? 'ALL' : 'SPLITTER'))}
        className="liquid-glass-card"
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: selectedType === 'SPLITTER' ? '2px solid #f59e0b' : '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: '#fffbeb',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid #fde68a'
        }}>
          <Split size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Splitters
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
            {metrics.splitters}
          </div>
        </div>
      </div>

      {/* Bound / Linked Routes KPI */}
      <div 
        role="button"
        tabIndex={0}
        aria-pressed={usageFilter === 'USED'}
        aria-label="Filter by Routes in Use"
        onClick={() => onSelectUsage(usageFilter === 'USED' ? 'ALL' : 'USED')}
        onKeyDown={(e) => handleKeyDown(e, () => onSelectUsage(usageFilter === 'USED' ? 'ALL' : 'USED'))}
        className="liquid-glass-card"
        style={{
          padding: '16px',
          borderRadius: '12px',
          border: usageFilter === 'USED' ? '2px solid var(--primary, #2563eb)' : '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '10px',
          background: 'var(--bg-card-muted, #f1f5f9)',
          color: 'var(--text-main, #0f172a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-subtle, #e2e8f0)'
        }}>
          <Workflow size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Route Active
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
            {metrics.bound} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted, #64748b)' }}>/ {metrics.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
