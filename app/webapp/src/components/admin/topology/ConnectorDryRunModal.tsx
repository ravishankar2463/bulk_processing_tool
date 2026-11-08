import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  FileSpreadsheet, 
  Table, 
  Copy, 
  Check,
  Sparkles,
  Layers,
  Database,
  Globe,
  Code2
} from 'lucide-react';
import { TopologyNode, ConnectorDryRunResult } from '../../../types/process';
import { dryRunConnector } from '../../../services/apiClient';

interface Props {
  node: TopologyNode | null;
  onClose: () => void;
}

export const ConnectorDryRunModal: React.FC<Props> = ({ node, onClose }) => {
  if (!node) return null;

  const protocol = node.refId === 'conn-def-csv' 
    ? 'CSV' 
    : node.refId === 'conn-def-rest-json' 
      ? 'REST_JSON' 
      : node.refId === 'conn-def-soap-xml' 
        ? 'SOAP_XML' 
        : 'CUSTOM';

  const defaultSampleInput = protocol === 'CSV'
    ? 'customer_id,name,email,balance,status\n1001,Acme Industrial,ops@acme.com,125000.50,ACTIVE\n1002,Global Freight,info@gf.org,45200.00,PENDING\n1003,Starlight Bio,admin@starlight.io,9800.75,ACTIVE'
    : protocol === 'REST_JSON'
      ? '{\n  "accountId": "ACC-9921",\n  "tier": "GOLD",\n  "kycStatus": "VERIFIED"\n}'
      : protocol === 'SOAP_XML'
        ? '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">\n  <soapenv:Body>\n    <CustomerQuery id="1001"/>\n  </soapenv:Body>\n</soapenv:Envelope>'
        : '{"test": "payload"}';

  const [sampleInput, setSampleInput] = useState(defaultSampleInput);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ConnectorDryRunResult | null>(null);
  const [activeView, setActiveView] = useState<'TABLE' | 'RAW' | 'LOGS'>('TABLE');
  const [copied, setCopied] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await dryRunConnector({
        protocol,
        configuration: JSON.stringify(node.config || {}),
        sampleInput,
        parameters: node.config || {},
        customCode: typeof node.config?.customCode === 'string' ? node.config.customCode : undefined,
        codeHookType: typeof node.config?.codeHookType === 'string' ? node.config.codeHookType : undefined
      });
      setResult(res);
    } catch (err: any) {
      setResult({
        success: false,
        durationMicros: 0,
        recordsExtracted: 0,
        previewRecords: [],
        rawOutput: '',
        logs: [`Error executing dry run: ${err?.message || 'Unknown failure'}`]
      });
    } finally {
      setRunning(false);
    }
  };

  const handleCopyRaw = () => {
    if (result?.rawOutput) {
      navigator.clipboard.writeText(result.rawOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: 'var(--bg-card, #ffffff)',
          color: 'var(--text-main, #0f172a)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #10b981, #06b6d4, #3b82f6)' }} />

        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Play size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                  Interactive Connector Dry-Run
                </h2>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#e2e8f0',
                  color: '#334155'
                }}>
                  {protocol}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
                Target: <strong>{node.label}</strong>
              </p>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
          {/* Sample Stream Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Sample Stream / Input Payload
              </label>
              <button
                type="button"
                onClick={() => setSampleInput(defaultSampleInput)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Reset Default Sample
              </button>
            </div>

            <textarea
              data-testid="dry-run-sample-input"
              rows={6}
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                background: '#0f172a',
                color: '#34d399',
                borderRadius: '10px',
                border: '1px solid #334155',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              data-testid="execute-dry-run-btn"
              onClick={handleRun}
              disabled={running}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                background: '#059669',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(5,150,105,0.25)',
                opacity: running ? 0.7 : 1
              }}
            >
              <Play size={14} />
              {running ? 'Simulating...' : 'Run Dry-Run Simulation'}
            </button>
          </div>

          {/* Result Section */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
              {/* Metrics Ribbon */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: result.success ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${result.success ? '#a7f3d0' : '#fecaca'}`,
                borderRadius: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
                    {result.success ? (
                      <>
                        <CheckCircle2 size={17} style={{ color: '#059669' }} />
                        <span style={{ color: '#065f46' }}>Simulation Succeeded</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={17} style={{ color: '#dc2626' }} />
                        <span style={{ color: '#991b1b' }}>Simulation Failed</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                    <Clock size={14} style={{ color: '#64748b' }} />
                    <span>Duration:</span>
                    <strong style={{ color: '#0f172a' }}>{result.durationMicros} µs</strong>
                  </div>

                  <div style={{ fontSize: '12px', color: '#475569', fontFamily: 'monospace' }}>
                    <span>Records Extracted:</span>
                    <strong style={{ color: '#0f172a', marginLeft: '4px' }}>{result.recordsExtracted}</strong>
                  </div>
                </div>

                {/* View Switcher Pills */}
                <div style={{ display: 'flex', gap: '4px', background: '#ffffff', padding: '3px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                  {(['TABLE', 'RAW', 'LOGS'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveView(tab)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: 'none',
                        background: activeView === tab ? '#eff6ff' : 'transparent',
                        color: activeView === tab ? '#1d4ed8' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {tab === 'TABLE' ? 'Table' : tab === 'RAW' ? 'JSON' : `Logs (${result.logs?.length || 0})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* View 1: Table */}
              {activeView === 'TABLE' && (
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {result.previewRecords.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                      No tabular records extracted from this sample.
                    </div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                        <tr>
                          {Object.keys(result.previewRecords[0]).map(h => (
                            <th key={h} style={{ padding: '8px 12px', fontWeight: 700, color: '#334155' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody style={{ fontFamily: 'monospace' }}>
                        {result.previewRecords.map((rec, rIdx) => (
                          <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9', background: rIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                            {Object.values(rec).map((val, cIdx) => (
                              <td key={cIdx} style={{ padding: '8px 12px', color: '#0f172a' }}>
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* View 2: Raw Output */}
              {activeView === 'RAW' && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      background: '#1e293b',
                      color: '#e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {copied ? <Check size={12} style={{ color: '#34d399' }} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <pre style={{
                    padding: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    background: '#020617',
                    color: '#e2e8f0',
                    borderRadius: '10px',
                    border: '1px solid #1e293b',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    margin: 0
                  }}>
                    {result.rawOutput || '// No raw output'}
                  </pre>
                </div>
              )}

              {/* View 3: Logs */}
              {activeView === 'LOGS' && (
                <div style={{
                  padding: '12px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  background: '#0f172a',
                  color: '#cbd5e1',
                  borderRadius: '10px',
                  border: '1px solid #1e293b',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {(result.logs || []).map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ color: '#64748b' }}>[{i + 1}]</span>
                      <span style={{ color: l.includes('Error') ? '#f87171' : '#cbd5e1' }}>{l}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'var(--bg-card-subtle, #f8fafc)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Close Sandbox
          </button>
        </div>
      </div>
    </div>
  );
};
