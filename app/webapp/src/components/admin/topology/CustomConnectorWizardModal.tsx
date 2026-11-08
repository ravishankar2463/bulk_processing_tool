import React, { useState } from 'react';
import { X, Plus, Trash2, Sparkles, Check, Globe, Database, Cpu, ShieldAlert, ArrowRight, Layers, Code2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ConnectorDefinition, ConnectorCategory, ConnectorProtocol, PropertyFieldManifest, StreamRole } from '../../../types/process';
import { validateScript } from '../../../services/apiClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (definition: Partial<ConnectorDefinition>) => Promise<void>;
}

export const CustomConnectorWizardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [protocol, setProtocol] = useState<ConnectorProtocol>('CUSTOM');
  const [category, setCategory] = useState<ConnectorCategory>('PROCESSOR');
  const [streamRole, setStreamRole] = useState<StreamRole>('MIDDLE');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('sparkles');
  const [composite, setComposite] = useState(false);
  const [manifestProperties, setManifestProperties] = useState<PropertyFieldManifest[]>([
    { key: 'endpoint', label: 'Service Endpoint URI', type: 'string', required: true, placeholder: 'https://...' },
    { key: 'apiKey', label: 'API Key / Secret', type: 'secret', required: false }
  ]);
  const [hasCustomScript, setHasCustomScript] = useState(false);
  const [customScript, setCustomScript] = useState(
    '// Custom Execution Script (Java 21 / Janino)\ninput.put("custom_connector", true);\nreturn input;'
  );
  const [scriptValidation, setScriptValidation] = useState<{ valid?: boolean; error?: string; micros?: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (newCat: ConnectorCategory) => {
    setCategory(newCat);
    if (newCat === 'SOURCE') setStreamRole('START');
    else if (newCat === 'SINK') setStreamRole('END');
    else setStreamRole('MIDDLE');
  };

  const handleAddManifestProp = () => {
    const newProp: PropertyFieldManifest = {
      key: `param_${manifestProperties.length + 1}`,
      label: `Parameter ${manifestProperties.length + 1}`,
      type: 'string',
      required: false
    };
    setManifestProperties([...manifestProperties, newProp]);
  };

  const handleUpdateManifestProp = (index: number, updates: Partial<PropertyFieldManifest>) => {
    const updated = [...manifestProperties];
    updated[index] = { ...updated[index], ...updates };
    setManifestProperties(updated);
  };

  const handleRemoveManifestProp = (index: number) => {
    setManifestProperties(manifestProperties.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    if (!name.trim()) {
      setError('Connector name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const definitionId = `conn-custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const manifestObj: Record<string, unknown> = { properties: manifestProperties };
      if (hasCustomScript && customScript.trim()) {
        manifestObj.defaultScript = customScript.trim();
      }
      const manifestJson = JSON.stringify(manifestObj);

      await onSave({
        definitionId,
        name,
        category,
        streamRole,
        protocol,
        description,
        icon,
        composite,
        propertyManifest: manifestJson,
        builtIn: false,
        version: 1
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save custom connector');
    } finally {
      setSaving(false);
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
          maxWidth: '680px',
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
        <div style={{ height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #10b981)' }} />

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
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Create Custom Connector
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', margin: '2px 0 0' }}>
                Define a dynamic protocol adapter, stream role invariants, and manifest schema
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

        {/* Form Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#b91c1c',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Name and Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                Connector Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                data-testid="custom-connector-name-input"
                placeholder="e.g. Kafka Stream Publisher"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as ConnectorCategory)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="SOURCE">SOURCE (Ingestion Stream)</option>
                <option value="PROCESSOR">PROCESSOR (Enrichment / Service)</option>
                <option value="SINK">SINK (Egress / Writer)</option>
                <option value="TRANSFORM">TRANSFORM (Protocol Mapping)</option>
              </select>
            </div>
          </div>

          {/* Stream Role 3-Way Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
              Stream Role (Topological Invariant)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* START */}
              <button
                type="button"
                onClick={() => setStreamRole('START')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${streamRole === 'START' ? '#10b981' : '#e2e8f0'}`,
                  background: streamRole === 'START' ? '#ecfdf5' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: streamRole === 'START' ? '#065f46' : '#334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <span>START (Source)</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Produces • Out Only</div>
              </button>

              {/* MIDDLE */}
              <button
                type="button"
                onClick={() => setStreamRole('MIDDLE')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${streamRole === 'MIDDLE' ? '#3b82f6' : '#e2e8f0'}`,
                  background: streamRole === 'MIDDLE' ? '#eff6ff' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: streamRole === 'MIDDLE' ? '#1e40af' : '#334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                  <span>MIDDLE (Pipe)</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Pipelined • In & Out</div>
              </button>

              {/* END */}
              <button
                type="button"
                onClick={() => setStreamRole('END')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `2px solid ${streamRole === 'END' ? '#8b5cf6' : '#e2e8f0'}`,
                  background: streamRole === 'END' ? '#faf5ff' : '#ffffff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: streamRole === 'END' ? '#5b21b6' : '#334155' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6' }} />
                  <span>END (Terminal)</span>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>Terminal • In Only</div>
              </button>
            </div>
          </div>

          {/* Row 2: Protocol and Composite Pairing */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                Protocol / Adapter Type
              </label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value as ConnectorProtocol)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  outline: 'none',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="CUSTOM">Custom Engine Adapter</option>
                <option value="KAFKA">Apache Kafka Message Queue</option>
                <option value="DATABASE">JDBC Database Table</option>
                <option value="REST_JSON">HTTP REST JSON Service</option>
                <option value="SOAP_XML">SOAP Web Service (WSDL)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                Composite Pairing
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: composite ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                fontSize: '12px',
                color: '#334155'
              }}>
                <input
                  type="checkbox"
                  checked={composite}
                  onChange={(e) => setComposite(e.target.checked)}
                  style={{ accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 500 }}>Split into Request / Response pair on canvas</span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="Summary of target system and capability"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Dynamic Property Manifest Builder */}
          <div style={{ paddingTop: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Configurable Parameters Manifest
                </label>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0' }}>
                  Fields that users will configure when using this connector
                </p>
              </div>

              <button
                type="button"
                data-testid="add-manifest-param-btn"
                onClick={handleAddManifestProp}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  cursor: 'pointer'
                }}
              >
                <Plus size={13} /> Add Parameter
              </button>
            </div>

            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {manifestProperties.map((prop, idx) => (
                <div 
                  key={idx} 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 1fr 140px 70px 32px',
                    gap: '8px',
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                >
                  <input
                    type="text"
                    placeholder="key_name"
                    value={prop.key}
                    onChange={(e) => handleUpdateManifestProp(idx, { key: e.target.value })}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#f8fafc'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Display Label"
                    value={prop.label}
                    onChange={(e) => handleUpdateManifestProp(idx, { label: e.target.value })}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                  <select
                    value={prop.type}
                    onChange={(e) => handleUpdateManifestProp(idx, { type: e.target.value as any })}
                    style={{
                      padding: '6px 8px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="string">String Input</option>
                    <option value="number">Numeric Input</option>
                    <option value="boolean">Boolean Toggle</option>
                    <option value="select">Dropdown Select</option>
                    <option value="secret">Secret / Password</option>
                    <option value="key_value">Key-Value Map</option>
                  </select>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={prop.required ?? false}
                      onChange={(e) => handleUpdateManifestProp(idx, { required: e.target.checked })}
                      style={{ accentColor: '#2563eb' }}
                    />
                    Req
                  </label>

                  <button
                    type="button"
                    title="Delete Parameter"
                    onClick={() => handleRemoveManifestProp(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Custom Execution Script Hook */}
          <div style={{
            marginTop: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#ffffff'
          }}>
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: hasCustomScript ? '1px solid #e2e8f0' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                <input
                  type="checkbox"
                  data-testid="toggle-custom-script-checkbox"
                  checked={hasCustomScript}
                  onChange={(e) => setHasCustomScript(e.target.checked)}
                  style={{ accentColor: '#4f46e5' }}
                />
                <Code2 size={16} className="text-indigo-600" />
                <span>Author with Custom Janino Java 21 Adapter Script</span>
              </label>
              {hasCustomScript && (
                <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  Embedded Code Engine
                </span>
              )}
            </div>

            {hasCustomScript && (
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                  Write custom adapter logic executed by Janino on Project Loom Virtual Threads. Returns modified <code>Map&lt;String, Object&gt;</code>.
                </p>
                <textarea
                  data-testid="wizard-custom-script-textarea"
                  rows={5}
                  value={customScript}
                  onChange={(e) => {
                    setCustomScript(e.target.value);
                    setScriptValidation(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#0f172a',
                    color: '#f8fafc',
                    lineHeight: 1.4
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    type="button"
                    data-testid="wizard-validate-script-btn"
                    onClick={async () => {
                      const res = await validateScript({ script: customScript });
                      setScriptValidation({ valid: res.valid, error: res.errorMessage, micros: res.compilationTimeMicros });
                    }}
                    style={{
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Validate Code
                  </button>
                  {scriptValidation && (
                    <span style={{ fontSize: '11px', fontWeight: 600, color: scriptValidation.valid ? '#16a34a' : '#dc2626' }}>
                      {scriptValidation.valid ? `✓ Syntax Valid (${scriptValidation.micros}µs)` : `✗ Error: ${scriptValidation.error}`}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'var(--bg-card-subtle, #f8fafc)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="save-custom-connector-submit"
            onClick={handleFinish}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
          >
            <Check size={14} />
            {saving ? 'Creating...' : 'Register Custom Connector'}
          </button>
        </div>
      </div>
    </div>
  );
};
