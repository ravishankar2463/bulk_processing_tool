import React, { useState } from 'react';
import { Play, Check, X, ShieldAlert, FileCode } from 'lucide-react';
import { ComponentInstanceData } from './AdminComponentWizard';

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
    initialData?.sourceCode ||
      '// Java 21 dynamic script\nreturn com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();'
  );
  const [samplePayload, setSamplePayload] = useState<string>(
    initialData?.sampleTestPayload || '{"id": 101, "email": "user@example.com"}'
  );
  const [sandboxResult, setSandboxResult] = useState<any>(null);
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
      const data = await response.json();
      setSandboxResult(data);
    } catch (err: any) {
      setSandboxResult({ compilationSuccessful: false, errorMessage: err.message || 'Error executing test' });
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
    <div style={{ padding: '24px', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#0f172a' }}>Direct Component Editor</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
            Modify component source code and verify compilation before committing changes
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 14px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Save Changes
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Component Identifier</label>
          <input
            type="text"
            value={instanceId}
            onChange={(e) => setInstanceId(e.target.value)}
            disabled={!!initialData?.instanceId}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', background: initialData?.instanceId ? '#f1f5f9' : '#fff' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Display Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Component Type</label>
          <select
            value={componentType}
            onChange={(e) => setComponentType(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
          >
            <option value="SPLITTER">Record Splitter</option>
            <option value="VALIDATOR">Validator</option>
            <option value="BATCH_PROCESSOR">Batch Processor</option>
            <option value="REPORT_WRITER">Report Writer</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '4px' }}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Java 21 In-Memory Source Code</label>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Compiled via Janino in sub-millisecond execution</span>
        </div>
        <textarea
          value={sourceCode}
          onChange={(e) => setSourceCode(e.target.value)}
          rows={10}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#0f172a', color: '#f8fafc' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>Sample Input Record (JSON)</label>
          <textarea
            value={samplePayload}
            onChange={(e) => setSamplePayload(e.target.value)}
            rows={4}
            style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>Pre-Flight Sandbox Runner</label>
            <button
              onClick={handleRunSandbox}
              disabled={testing}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '4px 10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              <Play size={12} /> Test Dry Run
            </button>
          </div>
          <div style={{ height: '88px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '11px' }}>
            {sandboxResult ? (
              <pre style={{ margin: 0 }}>{JSON.stringify(sandboxResult, null, 2)}</pre>
            ) : (
              <span style={{ color: '#94a3b8' }}>Click "Test Dry Run" to compile and execute against the sample payload.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
