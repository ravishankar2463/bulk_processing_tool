import React, { useState } from 'react';
import { Play, Check, X, ShieldAlert, FileCode, Clock, Cpu, CheckCircle2 } from 'lucide-react';
import { ComponentInstanceData } from './AdminComponentWizard';
import { ComponentDocTemplates } from './ComponentDocTemplates';
import { MethodFramedCodeEditor } from './MethodFramedCodeEditor';
import { ComponentTemplate, getDefaultStarterCode } from '../../utils/componentTemplates';

interface SandboxTestResult {
  compilationSuccessful?: boolean;
  executionDurationMicros?: number;
  result?: unknown;
  errorMessage?: string;
  logs?: string[];
}

interface Props {
  initialData?: ComponentInstanceData;
  onSave: (data: ComponentInstanceData) => void;
  onCancel: () => void;
}

export const AdminComponentEditor: React.FC<Props> = ({
  initialData,
  onSave,
  onCancel
}) => {
  const [componentType, setComponentType] = useState<string>(initialData?.componentType || 'VALIDATOR');
  const [instanceId, setInstanceId] = useState<string>(initialData?.instanceId || '');
  const [name, setName] = useState<string>(initialData?.name || '');
  const [description, setDescription] = useState<string>(initialData?.description || '');
  const [executionMode, setExecutionMode] = useState<string>(initialData?.executionMode || 'CODE_SNIPPET');
  const [sourceCode, setSourceCode] = useState<string>(
    initialData?.sourceCode || getDefaultStarterCode(initialData?.componentType || 'VALIDATOR')
  );
  const [samplePayload, setSamplePayload] = useState<string>(
    initialData?.sampleTestPayload || '{"id": 101, "email": "user@example.com"}'
  );
  const [sandboxResult, setSandboxResult] = useState<SandboxTestResult | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  const handleRunSandbox = async () => {
    setTesting(true);
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
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave({
      instanceId: instanceId || `comp-${Date.now()}`,
      componentType,
      name: name || `${componentType} Custom Component`,
      description,
      executionMode,
      language: 'JAVA',
      sourceCode,
      sampleTestPayload: samplePayload
    });
  };

  return (
    <div style={{
      maxWidth: '980px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden'
    }}>
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
          <div style={{ background: '#0f172a', color: '#60a5fa', padding: '8px', borderRadius: '8px' }}>
            <FileCode size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Direct Component Editor</h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
              Modify component source code and verify compilation before committing changes
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '8px 20px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Identifier and Name Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label htmlFor="editor-instance-id" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Component Identifier
            </label>
            <input
              id="editor-instance-id"
              type="text"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              disabled={!!initialData?.instanceId}
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                background: initialData?.instanceId ? '#f1f5f9' : '#ffffff',
                fontFamily: 'var(--font-mono)',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label htmlFor="editor-display-name" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Display Name
            </label>
            <input
              id="editor-display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          id="editor-source-code"
          label="Source Code (Java 21 / Janino)"
          componentType={componentType}
          value={sourceCode}
          onChange={setSourceCode}
          rows={10}
          modeLabel="Execution Mode: CODE_SNIPPET"
        />

        {/* Pre-flight Dry-Run Sandbox Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '10px' }}>
          <div>
            <label htmlFor="editor-sample-payload" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Sample Test Payload (JSON)
            </label>
            <textarea
              id="editor-sample-payload"
              value={samplePayload}
              onChange={(e) => setSamplePayload(e.target.value)}
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
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Compilation Dry-Run Result
              </label>
              <button
                type="button"
                onClick={handleRunSandbox}
                disabled={testing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  padding: '5px 12px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <Play size={12} /> {testing ? 'Testing...' : 'Test Run'}
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
                <div>
                  <div style={{ 
                    color: sandboxResult.compilationSuccessful ? '#059669' : '#dc2626', 
                    fontWeight: 700, 
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {sandboxResult.compilationSuccessful ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
                    {sandboxResult.compilationSuccessful ? 'Compilation Passed' : 'Compilation Failed'}
                    {sandboxResult.executionDurationMicros && (
                      <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>
                        ({sandboxResult.executionDurationMicros} µs)
                      </span>
                    )}
                  </div>
                  <pre style={{ margin: 0 }}>{JSON.stringify(sandboxResult.result || sandboxResult.errorMessage, null, 2)}</pre>
                </div>
              ) : (
                <span style={{ color: '#94a3b8' }}>
                  Click "Test Run" to dry-compile code with in-memory Janino compiler.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
