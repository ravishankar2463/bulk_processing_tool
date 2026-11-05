import React, { useState } from 'react';
import { Layers, ShieldCheck, Cpu, FileText, Code, CheckCircle, ArrowRight, Play, ArrowLeft } from 'lucide-react';

export interface ComponentInstanceData {
  instanceId: string;
  componentType: string;
  name: string;
  description: string;
  executionMode: string;
  language: string;
  sourceCode: string;
  sampleTestPayload: string;
}

interface Props {
  onSave: (data: ComponentInstanceData) => void;
  onCancel: () => void;
}

export const AdminComponentWizard: React.FC<Props> = ({ onSave, onCancel }) => {
  const [step, setStep] = useState<number>(1);
  const [componentType, setComponentType] = useState<string>('VALIDATOR');
  const [executionMode, setExecutionMode] = useState<string>('CODE_SNIPPET');
  const [name, setName] = useState<string>('');
  const [instanceId, setInstanceId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sourceCode, setSourceCode] = useState<string>(
    '// Write validation logic here\nif (!record.containsKey("email")) {\n    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("MISSING_EMAIL", "Email is required");\n}\nreturn com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();'
  );
  const [samplePayload, setSamplePayload] = useState<string>('{"id": 101, "email": "test@example.com"}');
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);

  const handleRunSandbox = async () => {
    setIsRunningTest(true);
    try {
      const response = await fetch('/api/v1/admin/components/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentType,
          language: 'JAVA',
          sourceCode,
          samplePayload
        })
      });
      const data = await response.json();
      setSandboxResult(data);
    } catch (err: any) {
      setSandboxResult({ compilationSuccessful: false, errorMessage: err.message || 'Error executing test' });
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleFinish = () => {
    onSave({
      instanceId: instanceId || `comp-${Date.now()}`,
      componentType,
      name: name || `${componentType} Instance`,
      description,
      executionMode,
      language: 'JAVA',
      sourceCode,
      sampleTestPayload: samplePayload
    });
  };

  return (
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Component Setup Wizard</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Configure new programmable instances for Splitters, Validators, Processors, or Report Writers</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 500, color: '#3b82f6' }}>
          Step {step} of 4
        </div>
      </div>

      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 1: Select Component Type</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { type: 'SPLITTER', title: 'Record Splitter', desc: 'Streams records iteratively from CSV or custom lines' },
              { type: 'VALIDATOR', title: 'Validator', desc: 'Validates record attributes with schema or business logic' },
              { type: 'BATCH_PROCESSOR', title: 'Batch Processor', desc: 'Performs record transformation, calculations, or API calls' },
              { type: 'REPORT_WRITER', title: 'Report Writer', desc: 'Aggregates metrics and generates custom export formats' }
            ].map(item => (
              <div
                key={item.type}
                onClick={() => setComponentType(item.type)}
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: componentType === item.type ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  background: componentType === item.type ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => setStep(2)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Choose Mode</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 2: Implementation Mode</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { mode: 'DECLARATIVE_WIZARD', title: 'Declarative Form Builder', desc: 'Configure via visual UI forms without writing any code' },
              { mode: 'CODE_SNIPPET', title: 'Custom Code Snippet (Java)', desc: 'Program custom logic in Java 21 compiled directly in memory' }
            ].map(item => (
              <div
                key={item.mode}
                onClick={() => setExecutionMode(item.mode)}
                style={{
                  padding: '16px',
                  borderRadius: '6px',
                  border: executionMode === item.mode ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                  background: executionMode === item.mode ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>{item.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(1)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(3)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Configure Logic</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 3: Editor & Sandbox Workspace</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Java Code Implementation</label>
            <textarea
              value={sourceCode}
              onChange={e => setSourceCode(e.target.value)}
              rows={8}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#0f172a', color: '#f8fafc' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Sample Input Record (JSON)</label>
              <textarea
                value={samplePayload}
                onChange={e => setSamplePayload(e.target.value)}
                rows={4}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Live Sandbox Output</label>
                <button
                  onClick={handleRunSandbox}
                  disabled={isRunningTest}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  <Play size={12} /> Run Sandbox Test
                </button>
              </div>
              <div style={{ height: '88px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
                {sandboxResult ? (
                  <pre style={{ margin: 0 }}>{JSON.stringify(sandboxResult, null, 2)}</pre>
                ) : (
                  <span style={{ color: '#94a3b8' }}>Click "Run Sandbox Test" to dry-run code against the sample payload.</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(2)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={() => setStep(4)} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Next: Metadata & Deploy</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1e293b' }}>Step 4: Metadata & Deployment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Instance Identifier</label>
              <input
                type="text"
                placeholder="e.g. customer-kyc-validator-v1"
                value={instanceId}
                onChange={e => setInstanceId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Friendly Name</label>
              <input
                type="text"
                placeholder="e.g. Customer KYC Email Validator"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Description</label>
              <textarea
                rows={3}
                placeholder="Briefly describe what this component does"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(3)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button onClick={handleFinish} style={{ padding: '8px 20px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 500, cursor: 'pointer' }}>Deploy Component</button>
          </div>
        </div>
      )}
    </div>
  );
};

