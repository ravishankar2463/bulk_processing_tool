import React, { useState } from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  Code, 
  CheckCircle, 
  ArrowRight, 
  Play, 
  ArrowLeft,
  X,
  Sparkles,
  Zap
} from 'lucide-react';
import { ComponentDocTemplates } from './ComponentDocTemplates';
import { MethodFramedCodeEditor } from './MethodFramedCodeEditor';
import { ComponentTemplate, getDefaultStarterCode } from '../../utils/componentTemplates';

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

interface SandboxTestResult {
  compilationSuccessful?: boolean;
  executionDurationMicros?: number;
  result?: unknown;
  errorMessage?: string;
  logs?: string[];
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
  const [sourceCode, setSourceCode] = useState<string>(getDefaultStarterCode('VALIDATOR'));
  const [samplePayload, setSamplePayload] = useState<string>('{"id": 101, "email": "test@example.com"}');
  const [sandboxResult, setSandboxResult] = useState<SandboxTestResult | null>(null);
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
      const data: SandboxTestResult = await response.json();
      setSandboxResult(data);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error executing test';
      setSandboxResult({ compilationSuccessful: false, errorMessage: errMsg });
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
    <div style={{
      maxWidth: '920px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden'
    }}>
      {/* Header with Step Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        background: '#f8fafc'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Component Setup Wizard</h2>
            <span style={{ fontSize: '11px', fontWeight: 600, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px' }}>
              Janino / Groovy In-Memory
            </span>
          </div>
          <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '13px' }}>
            Configure new programmable instances for Splitters, Validators, Processors, or Report Writers
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>
          Step {step} of 4
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Step 1: Component Type */}
        {step === 1 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 1: Select Component Type
            </h3>
            <div 
              role="radiogroup" 
              aria-label="Component Type Options"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}
            >
              {[
                { type: 'SPLITTER', title: 'Record Splitter', desc: 'Streams records iteratively from CSV or custom lines' },
                { type: 'VALIDATOR', title: 'Validator', desc: 'Validates record attributes with schema or business logic' },
                { type: 'BATCH_PROCESSOR', title: 'Batch Processor', desc: 'Performs record transformation, calculations, or API calls' },
                { type: 'REPORT_WRITER', title: 'Report Writer', desc: 'Aggregates metrics and generates custom export formats' }
              ].map(item => {
                const isSelected = componentType === item.type;
                return (
                  <div
                    key={item.type}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setComponentType(item.type)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setComponentType(item.type);
                      }
                    }}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a', marginBottom: '4px', fontSize: '15px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={onCancel} 
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => setStep(2)} 
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Next: Choose Mode
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Implementation Mode */}
        {step === 2 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 2: Implementation Mode
            </h3>
            <div 
              role="radiogroup" 
              aria-label="Implementation Mode Options"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '24px' }}
            >
              {[
                { mode: 'DECLARATIVE_WIZARD', title: 'Declarative Form Builder', desc: 'Configure via visual UI forms without writing any code' },
                { mode: 'CODE_SNIPPET', title: 'Custom Code Snippet (Java)', desc: 'Program custom logic in Java 21 compiled directly in memory' }
              ].map(item => {
                const isSelected = executionMode === item.mode;
                return (
                  <div
                    key={item.mode}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => setExecutionMode(item.mode)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setExecutionMode(item.mode);
                      }
                    }}
                    style={{
                      padding: '16px 18px',
                      borderRadius: '10px',
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: isSelected ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: isSelected ? '#1d4ed8' : '#0f172a', marginBottom: '4px', fontSize: '15px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                      {item.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={() => setStep(1)} 
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Back
              </button>
              <button 
                type="button"
                onClick={() => setStep(3)} 
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Next: Configure Logic
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Editor & Sandbox */}
        {step === 3 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 3: Editor & Sandbox Workspace
            </h3>

            {/* Templates & Documentation Bar */}
            <ComponentDocTemplates
              componentType={componentType}
              onSelectTemplate={(tpl: ComponentTemplate) => {
                setSourceCode(tpl.sourceCode);
                setSamplePayload(tpl.samplePayload);
              }}
              onInsertSnippet={(snippet: string) => {
                setSourceCode((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
              }}
            />

            {/* Method-Framed Code Editor Surface */}
            <MethodFramedCodeEditor
              id="wizard-source-code"
              label="Java Code Implementation"
              componentType={componentType}
              value={sourceCode}
              onChange={setSourceCode}
              rows={8}
              modeLabel="Virtual Thread Safe · No System Calls"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label htmlFor="wizard-sample-payload" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Sample Input Record (JSON)
                </label>
                <textarea
                  id="wizard-sample-payload"
                  value={samplePayload}
                  onChange={e => setSamplePayload(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    padding: '10px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    background: '#ffffff',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Live Sandbox Output</label>
                  <button
                    type="button"
                    onClick={handleRunSandbox}
                    disabled={isRunningTest}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    <Play size={12} /> Run Sandbox Test
                  </button>
                </div>
                <div style={{
                  height: '84px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  overflowY: 'auto',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: '#334155'
                }}>
                  {sandboxResult ? (
                    <pre style={{ margin: 0 }}>{JSON.stringify(sandboxResult, null, 2)}</pre>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Click "Run Sandbox Test" to dry-run code against the sample payload.</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={() => setStep(2)} 
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Back
              </button>
              <button 
                type="button"
                onClick={() => setStep(4)} 
                style={{ padding: '8px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                Next: Metadata & Deploy
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Metadata & Deployment */}
        {step === 4 && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#1e293b' }}>
              Step 4: Metadata & Deployment
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label htmlFor="wizard-instance-id" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Instance Identifier
                </label>
                <input
                  id="wizard-instance-id"
                  type="text"
                  placeholder="e.g. customer-kyc-validator-v1"
                  value={instanceId}
                  onChange={e => setInstanceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label htmlFor="wizard-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Friendly Name
                </label>
                <input
                  id="wizard-name"
                  type="text"
                  placeholder="e.g. Customer KYC Email Validator"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
              <div>
                <label htmlFor="wizard-description" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                  Description
                </label>
                <textarea
                  id="wizard-description"
                  rows={3}
                  placeholder="Briefly describe what this component does"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
              <button 
                type="button"
                onClick={() => setStep(3)} 
                style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
              >
                Back
              </button>
              <button 
                type="button"
                onClick={handleFinish} 
                style={{ padding: '9px 22px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              >
                Deploy Component
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
