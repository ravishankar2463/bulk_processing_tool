import React, { useState, useEffect } from 'react';
import { 
  GitMerge, 
  Layers, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  X,
  FileSpreadsheet,
  ShieldCheck,
  Cpu,
  FileText,
  Save
} from 'lucide-react';
import { RouteConfigData } from './AdminRouteStudio';

export interface PipelineDefinitionData {
  processId: string;
  name: string;
  description: string;
  inputFormat: string;
  splitterInstanceId: string;
  validatorInstanceIds: string[];
  processorInstanceIds: string[];
  reportWriterInstanceId: string;
  batchSize: number;
}

export interface AdminPipelineWizardProps {
  initialData?: PipelineDefinitionData | RouteConfigData | null;
  onSave: (data: PipelineDefinitionData) => void;
  onCancel: () => void;
}

export const AdminPipelineWizard: React.FC<AdminPipelineWizardProps> = ({ 
  initialData, 
  onSave, 
  onCancel 
}) => {
  const isEditing = Boolean(initialData);

  const initialProcessId = (initialData as any)?.processId || (initialData as any)?.routeId || '';
  const initialName = initialData?.name || '';
  const initialInputFormat = (initialData as any)?.inputFormat || 'CSV';
  const initialSplitter = (initialData as any)?.splitterInstanceId || 'splitter-csv-univocity';
  const initialValidators = (initialData as any)?.validatorInstanceIds || 
    ((initialData as any)?.validatorInstanceId ? [(initialData as any).validatorInstanceId] : ['val-kyc-01']);
  const initialProcessors = (initialData as any)?.processorInstanceIds || 
    ((initialData as any)?.processorInstanceId ? [(initialData as any).processorInstanceId] : ['proc-enricher-01']);
  const initialWriter = (initialData as any)?.reportWriterInstanceId || 
    (initialData as any)?.writerInstanceId || 'writer-csv-summary';
  const initialBatchSize = initialData?.batchSize || 500;

  const [step, setStep] = useState<number>(1);
  const [processId, setProcessId] = useState<string>(initialProcessId);
  const [name, setName] = useState<string>(initialName);
  const [inputFormat, setInputFormat] = useState<string>(initialInputFormat);
  const [splitterInstanceId, setSplitterInstanceId] = useState<string>(initialSplitter);
  const [validatorInstanceIds, setValidatorInstanceIds] = useState<string[]>(initialValidators);
  const [processorInstanceIds, setProcessorInstanceIds] = useState<string[]>(initialProcessors);
  const [reportWriterInstanceId, setReportWriterInstanceId] = useState<string>(initialWriter);
  const [batchSize, setBatchSize] = useState<number>(initialBatchSize);

  useEffect(() => {
    if (initialData) {
      setProcessId((initialData as any).processId || (initialData as any).routeId || '');
      setName(initialData.name || '');
      if ((initialData as any).inputFormat) setInputFormat((initialData as any).inputFormat);
      if ((initialData as any).splitterInstanceId) setSplitterInstanceId((initialData as any).splitterInstanceId);
      if ((initialData as any).validatorInstanceIds) {
        setValidatorInstanceIds((initialData as any).validatorInstanceIds);
      } else if ((initialData as any).validatorInstanceId) {
        setValidatorInstanceIds([(initialData as any).validatorInstanceId]);
      }
      if ((initialData as any).processorInstanceIds) {
        setProcessorInstanceIds((initialData as any).processorInstanceIds);
      } else if ((initialData as any).processorInstanceId) {
        setProcessorInstanceIds([(initialData as any).processorInstanceId]);
      }
      if ((initialData as any).reportWriterInstanceId) {
        setReportWriterInstanceId((initialData as any).reportWriterInstanceId);
      } else if ((initialData as any).writerInstanceId) {
        setReportWriterInstanceId((initialData as any).writerInstanceId);
      }
      if (initialData.batchSize) setBatchSize(initialData.batchSize);
    }
  }, [initialData]);

  const handleFinish = () => {
    onSave({
      processId: processId || initialProcessId || `pipeline-${Date.now()}`,
      name: name || (isEditing ? 'Updated Pipeline' : 'Enterprise Ingestion Pipeline'),
      description: (initialData as any)?.description || 'End-to-end bulk processing pipeline assembled from UI',
      inputFormat,
      splitterInstanceId,
      validatorInstanceIds,
      processorInstanceIds,
      reportWriterInstanceId,
      batchSize
    });
  };

  const stepLabels = [
    'Route & Format',
    'Splitter',
    'Validator',
    'Batch Processor',
    'Report Writer',
    'Review & Deploy'
  ];

  return (
    <div 
      data-testid="pipeline-wizard-container"
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#2563eb', color: '#ffffff', padding: '8px', borderRadius: '8px' }}>
            <GitMerge size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
              {isEditing ? `Edit Pipeline Route: ${name || processId}` : 'End-to-End Pipeline Assembly Wizard'}
            </h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
              {isEditing 
                ? `Modifying route ${processId || 'pipeline'} DAG configuration and component assignments`
                : 'Compose routes, splitters, validators, batch processors, and report writers into an execution DAG'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
            Step {step} of 6
          </span>
          <button
            data-testid="cancel-pipeline-header-btn"
            onClick={onCancel}
            aria-label="Close Wizard"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Interactive Step Navigator Bar */}
      <div style={{
        display: 'flex',
        background: '#f1f5f9',
        padding: '6px 16px',
        gap: '6px',
        overflowX: 'auto',
        borderBottom: '1px solid #e2e8f0'
      }}>
        {stepLabels.map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step === stepNum;
          const isPassed = step > stepNum;
          return (
            <button
              key={stepNum}
              data-testid={`wizard-step-nav-${stepNum}`}
              onClick={() => setStep(stepNum)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#2563eb' : isPassed ? '#e2e8f0' : 'transparent',
                color: isActive ? '#ffffff' : isPassed ? '#1e293b' : '#64748b',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease-in-out'
              }}
            >
              <span>{stepNum}.</span> {label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '24px' }}>
        {/* Step 1: Route & Input Format */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 1: Pipeline Route & Input Format
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {isEditing && (
                <div>
                  <label htmlFor="pipeline-id-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                    Route ID / Process ID
                  </label>
                  <input
                    id="pipeline-id-input"
                    data-testid="pipeline-id-input"
                    type="text"
                    value={processId}
                    disabled
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#f8fafc', color: '#64748b' }}
                  />
                </div>
              )}
              <div>
                <label htmlFor="pipeline-name-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Pipeline Name
                </label>
                <input
                  id="pipeline-name-input"
                  data-testid="pipeline-name-input"
                  type="text"
                  placeholder="e.g. Customer Master Ingestion"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div>
                <label htmlFor="pipeline-format-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Input File Format
                </label>
                <select
                  id="pipeline-format-select"
                  data-testid="pipeline-format-select"
                  value={inputFormat}
                  onChange={(e) => setInputFormat(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="CSV">Delimited / CSV (Univocity Streaming)</option>
                  <option value="JSON">Streaming JSON Lines (NDJSON)</option>
                  <option value="XML">StAX Streaming XML</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button 
                data-testid="cancel-pipeline-btn"
                onClick={onCancel} 
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing && (
                  <button
                    data-testid="quick-save-pipeline-btn"
                    onClick={handleFinish}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button 
                  data-testid="next-step-btn"
                  onClick={() => setStep(2)} 
                  style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                >
                  Next: Choose Splitter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Record Splitter */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 2: Record Splitter
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="pipeline-splitter-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Select Record Splitter Instance
              </label>
              <select
                id="pipeline-splitter-select"
                data-testid="pipeline-splitter-select"
                value={splitterInstanceId}
                onChange={(e) => setSplitterInstanceId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="splitter-csv-univocity">Univocity High-Throughput CSV Splitter (O(1) memory)</option>
                <option value="splitter-custom-script">Dynamic Janino Custom Delimiter Script</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Back</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing && (
                  <button
                    onClick={handleFinish}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button onClick={() => setStep(3)} style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Next: Validation Chain</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Validation Chain */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 3: Validation Chain
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="pipeline-validator-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Select Active Validator Component
              </label>
              <select
                id="pipeline-validator-select"
                data-testid="pipeline-validator-select"
                value={validatorInstanceIds[0]}
                onChange={(e) => setValidatorInstanceIds([e.target.value])}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="val-kyc-01">Customer KYC Email Validator (Java 21)</option>
                <option value="val-amount-rules">Transaction Amount & Range Validator</option>
                <option value="none">None (Passthrough)</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button onClick={() => setStep(2)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Back</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing && (
                  <button
                    onClick={handleFinish}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button onClick={() => setStep(4)} style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Next: Batch Processing</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Batch Processing */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 4: Batch Processing
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label htmlFor="pipeline-batch-size-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Batch Size (Records per chunk)
                </label>
                <input
                  id="pipeline-batch-size-input"
                  data-testid="pipeline-batch-size-input"
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div>
                <label htmlFor="pipeline-processor-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Batch Processor Implementation
                </label>
                <select
                  id="pipeline-processor-select"
                  data-testid="pipeline-processor-select"
                  value={processorInstanceIds[0]}
                  onChange={(e) => setProcessorInstanceIds([e.target.value])}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
                >
                  <option value="proc-enricher-01">Customer Tier Enricher (Loyalty Points)</option>
                  <option value="proc-tax-calc">Order Tax Calculator & Currency Converter</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button onClick={() => setStep(3)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Back</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing && (
                  <button
                    onClick={handleFinish}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button onClick={() => setStep(5)} style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Next: Report Writer</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Report Writer */}
        {step === 5 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 5: Report Writer
            </h3>
            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="pipeline-report-writer-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Report Writer Strategy
              </label>
              <select
                id="pipeline-report-writer-select"
                data-testid="pipeline-report-writer-select"
                value={reportWriterInstanceId}
                onChange={(e) => setReportWriterInstanceId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none' }}
              >
                <option value="writer-csv-summary">Executive Summary & Failed Rows (CSV)</option>
                <option value="writer-json-audit">JSON Structured Audit Logs</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button onClick={() => setStep(4)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Back</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isEditing && (
                  <button
                    onClick={handleFinish}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '8px 16px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
                  >
                    <Save size={14} /> Save Changes
                  </button>
                )}
                <button onClick={() => setStep(6)} style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Next: Review & Deploy</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Deploy */}
        {step === 6 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 6: Review & Deploy Pipeline
            </h3>
            <div style={{ 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              borderRadius: '10px', 
              padding: '18px 20px', 
              marginBottom: '24px', 
              fontSize: '13px',
              lineHeight: 1.6
            }}>
              <div style={{ marginBottom: '8px' }}>Pipeline Name: <strong>{name || (isEditing ? 'Updated Pipeline' : 'Default Pipeline')}</strong></div>
              {isEditing && (
                <div style={{ marginBottom: '8px' }}>Route ID: <strong>{processId}</strong></div>
              )}
              <div style={{ marginBottom: '8px' }}>Format: <strong>{inputFormat}</strong></div>
              <div style={{ marginBottom: '8px' }}>Splitter: <strong>{splitterInstanceId}</strong></div>
              <div style={{ marginBottom: '8px' }}>Validator: <strong>{validatorInstanceIds[0]}</strong></div>
              <div style={{ marginBottom: '8px' }}>Batch Processor: <strong>{processorInstanceIds[0]}</strong></div>
              <div style={{ marginBottom: '8px' }}>Batch Size: <strong>{batchSize} records</strong></div>
              <div>Report Writer: <strong>{reportWriterInstanceId}</strong></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button onClick={() => setStep(5)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Back</button>
              <button 
                data-testid="deploy-pipeline-btn"
                onClick={handleFinish} 
                style={{ padding: '9px 24px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                {isEditing ? 'Update & Deploy Pipeline' : 'Deploy Pipeline'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPipelineWizard;
