import React, { useState, useEffect } from 'react';
import { X, Sliders, ShieldAlert, Cpu, Database, Save, Check } from 'lucide-react';
import { PipelineStepConfig, ErrorPolicy } from '../../types/process';

export interface StepConfigDrawerProps {
  isOpen: boolean;
  step: PipelineStepConfig | null;
  onClose: () => void;
  onSave: (updatedStep: PipelineStepConfig) => void;
}

export const StepConfigDrawer: React.FC<StepConfigDrawerProps> = ({
  isOpen,
  step,
  onClose,
  onSave
}) => {
  const [concurrency, setConcurrency] = useState<number>(step?.concurrency ?? 16);
  const [errorPolicy, setErrorPolicy] = useState<ErrorPolicy>(step?.errorPolicy ?? 'QUARANTINE_RECORD');
  const [paramBatchSize, setParamBatchSize] = useState<number>(
    Number(step?.parameters?.chunkSize ?? step?.parameters?.batchSize ?? 1000)
  );

  useEffect(() => {
    if (step) {
      setConcurrency(step.concurrency);
      setErrorPolicy(step.errorPolicy);
      setParamBatchSize(Number(step.parameters?.chunkSize ?? step.parameters?.batchSize ?? 1000));
    }
  }, [step]);

  // Keyboard accessibility: dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !step) return null;

  const handleSave = () => {
    const updatedParameters: Record<string, unknown> = {
      ...step.parameters,
      batchSize: paramBatchSize
    };
    if (step.parameters && 'chunkSize' in step.parameters) {
      updatedParameters.chunkSize = paramBatchSize;
    }

    const updatedStep: PipelineStepConfig = {
      ...step,
      concurrency,
      errorPolicy,
      parameters: updatedParameters
    };

    onSave(updatedStep);
    onClose();
  };

  return (
    <>
      <div
        data-testid="step-config-drawer-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-overlay, rgba(15, 23, 42, 0.5))',
          backdropFilter: 'blur(2px)',
          zIndex: 1099,
          transition: 'opacity 0.2s ease-in-out'
        }}
      />
      <div
        data-testid="step-config-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="step-config-drawer-title"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '460px',
          maxWidth: '90vw',
          height: '100vh',
          background: 'var(--glass-card, #ffffff)',
          borderLeft: '1px solid var(--glass-border, #cbd5e1)',
          boxShadow: 'var(--shadow-modal, -4px 0 24px rgba(15, 23, 42, 0.15))',
          zIndex: 1100,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflowY: 'auto'
        }}
      >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Stage: {step.id}
            </span>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {step.type}
            </span>
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
            Configure Step: {step.name}
          </h3>
        </div>
        <button
          data-testid="close-drawer-btn"
          onClick={onClose}
          aria-label="Close Drawer"
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '6px',
            padding: '6px',
            cursor: 'pointer',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Configuration Form Controls */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Error Handling Policy */}
        <div style={{ background: 'var(--bg-card-subtle, #f8fafc)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: '6px' }}>
            <ShieldAlert size={14} color="#dc2626" /> Error Handling Policy
          </label>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            Determine whether batch aborts on bad records or routes to the Dead Letter Queue.
          </p>
          <select
            data-testid="drawer-error-policy-select"
            value={errorPolicy}
            onChange={(e) => setErrorPolicy(e.target.value as ErrorPolicy)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--glass-input, #ffffff)',
              fontSize: '13px',
              color: 'var(--text-main, #0f172a)',
              fontWeight: 500
            }}
          >
            <option value="QUARANTINE_RECORD">QUARANTINE_RECORD (Dead Letter Queue)</option>
            <option value="FAIL_FAST">FAIL_FAST (Abort Batch on First Error)</option>
          </select>
        </div>

        {/* Loom Concurrency Allocation */}
        <div style={{ background: 'var(--bg-card-subtle, #f8fafc)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
              <Cpu size={14} color="#2563eb" /> Loom Concurrency Allocation (Virtual Threads)
            </label>
            <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
              {concurrency} threads
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            Java 21 Project Loom virtual thread partition factor (1 - 256 virtual workers).
          </p>
          <input
            data-testid="drawer-concurrency-input"
            type="number"
            min={1}
            max={256}
            value={concurrency}
            onChange={(e) => setConcurrency(Math.max(1, Math.min(256, Number(e.target.value) || 1)))}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--glass-input, #ffffff)',
              fontSize: '13px',
              color: 'var(--text-main, #0f172a)'
            }}
          />
        </div>

        {/* Batch Chunk Size */}
        <div style={{ background: 'var(--bg-card-subtle, #f8fafc)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
              <Database size={14} color="#059669" /> Batch Chunk Size (records)
            </label>
            <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#059669' }}>
              {paramBatchSize.toLocaleString()} rec
            </span>
          </div>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            Number of parsed records processed in each streaming sub-batch chunk.
          </p>
          <input
            data-testid="drawer-batch-size-input"
            type="number"
            min={1}
            value={paramBatchSize}
            onChange={(e) => setParamBatchSize(Math.max(1, Number(e.target.value) || 1))}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--glass-input, #ffffff)',
              fontSize: '13px',
              color: 'var(--text-main, #0f172a)'
            }}
          />
        </div>

        {/* Field Mappings */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)', marginBottom: '8px' }}>
            <Sliders size={14} color="#7c3aed" /> Field Mappings ({step.fieldMappings.length})
          </label>
          <div
            data-testid="drawer-field-mappings-list"
            style={{
              background: 'var(--bg-card-subtle, #f8fafc)',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              fontSize: '12px',
              maxHeight: '180px',
              overflowY: 'auto'
            }}
          >
            {step.fieldMappings.length === 0 ? (
              <span style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
                No explicit field transformations required (passthrough schema).
              </span>
            ) : (
              step.fieldMappings.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: i < step.fieldMappings.length - 1 ? '1px dashed var(--border-subtle, #e2e8f0)' : 'none'
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{m.source}</span>
                  <span style={{ color: 'var(--text-muted, #94a3b8)', padding: '0 8px' }}>➔</span>
                  <span style={{ color: 'var(--primary, #2563eb)', fontWeight: 500 }}>
                    {m.target} {m.transform ? `(${m.transform})` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', borderTop: '1px solid var(--border-subtle, #e2e8f0)', paddingTop: '16px' }}>
        <button
          data-testid="drawer-cancel-btn"
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle, #cbd5e1)',
            background: 'var(--bg-card, #ffffff)',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            color: 'var(--text-main, #475569)'
          }}
        >
          Cancel
        </button>
        <button
          data-testid="drawer-save-btn"
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            background: '#2563eb',
            color: '#ffffff',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 2px 4px rgba(37,99,235,0.25)'
          }}
        >
          <Save size={14} /> Save Configuration
        </button>
      </div>
    </div>
    </>
  );
};

export default StepConfigDrawer;

