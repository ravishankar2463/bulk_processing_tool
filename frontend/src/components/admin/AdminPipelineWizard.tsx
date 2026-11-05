import React, { useState } from 'react';
import { GitMerge, Layers, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

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

interface Props {
  onSave: (data: PipelineDefinitionData) => void;
  onCancel: () => void;
}

export const AdminPipelineWizard: React.FC<Props> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [processId, setProcessId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [inputFormat, setInputFormat] = useState<string>('CSV');
  const [splitterInstanceId, setSplitterInstanceId] = useState<string>('splitter-csv-univocity');
  const [validatorInstanceIds, setValidatorInstanceIds] = useState<string[]>(['val-kyc-01']);
  const [processorInstanceIds, setProcessorInstanceIds] = useState<string[]>(['proc-enricher-01']);
  const [reportWriterInstanceId, setReportWriterInstanceId] = useState<string>('writer-csv-summary');
  const [batchSize, setBatchSize] = useState<number>(500);

  const handleFinish = () => {
    onSave({
      processId: processId || `pipeline-${Date.now()}`,
      name: name || 'Enterprise Ingestion Pipeline',
      description: 'End-to-end bulk processing pipeline assembled from UI',
      inputFormat,
      splitterInstanceId,
      validatorInstanceIds,
      processorInstanceIds,
      reportWriterInstanceId,
      batchSize
    });
  };

  return (
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>End-to-End Pipeline Assembly Wizard</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Compose routes, splitters, validators, batch processors, and report writers into an execution DAG</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#3b82f6' }}>
          Step {step} of 6
        </div>
      </div>

      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 1: Pipeline Route & Input Format</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Pipeline Name</label>
              <input
                type="text"
                placeholder="e.g. Customer Master Ingestion"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Input File Format</label>
              <select
                value={inputFormat}
                onChange={(e) => setInputFormat(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="CSV">Delimited / CSV (Univocity Streaming)</option>
                <option value="JSON">Streaming JSON Lines (NDJSON)</option>
                <option value="XML">StAX Streaming XML</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => setStep(2)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Choose Splitter</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 2: Record Splitter</h3>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Select Record Splitter Instance</label>
            <select
              value={splitterInstanceId}
              onChange={(e) => setSplitterInstanceId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="splitter-csv-univocity">Univocity High-Throughput CSV Splitter (O(1) memory)</option>
              <option value="splitter-custom-script">Dynamic Janino Custom Delimiter Script</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(3)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Validation Chain</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 3: Validation Chain</h3>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Select Active Validator Component</label>
            <select
              value={validatorInstanceIds[0]}
              onChange={(e) => setValidatorInstanceIds([e.target.value])}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="val-kyc-01">Customer KYC Email Validator (Java 21)</option>
              <option value="val-amount-rules">Transaction Amount & Range Validator</option>
              <option value="none">None (Passthrough)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(4)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Batch Processing</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 4: Batch Processing</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Batch Size (Records per chunk)</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Batch Processor Implementation</label>
              <select
                value={processorInstanceIds[0]}
                onChange={(e) => setProcessorInstanceIds([e.target.value])}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              >
                <option value="proc-enricher-01">Customer Tier Enricher (Loyalty Points)</option>
                <option value="proc-tax-calc">Order Tax Calculator & Currency Converter</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(3)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(5)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Report Writer</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 5: Report Writer</h3>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Report Writer Strategy</label>
            <select
              value={reportWriterInstanceId}
              onChange={(e) => setReportWriterInstanceId(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="writer-csv-summary">Executive Summary & Failed Rows (CSV)</option>
              <option value="writer-json-audit">JSON Structured Audit Logs</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(4)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(6)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Review & Deploy</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 6: Review & Deploy Pipeline</h3>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '16px', marginBottom: '24px', fontSize: '13px' }}>
            <div style={{ marginBottom: '8px' }}>Pipeline Name: <strong>{name || 'Default Pipeline'}</strong></div>
            <div style={{ marginBottom: '8px' }}>Format: <strong>{inputFormat}</strong></div>
            <div style={{ marginBottom: '8px' }}>Splitter: <strong>{splitterInstanceId}</strong></div>
            <div style={{ marginBottom: '8px' }}>Validator: <strong>{validatorInstanceIds[0]}</strong></div>
            <div style={{ marginBottom: '8px' }}>Batch Processor: <strong>{processorInstanceIds[0]}</strong></div>
            <div style={{ marginBottom: '8px' }}>Batch Size: <strong>{batchSize} records</strong></div>
            <div>Report Writer: <strong>{reportWriterInstanceId}</strong></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(5)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={handleFinish} style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Deploy Pipeline</button>
          </div>
        </div>
      )}
    </div>
  );
};
