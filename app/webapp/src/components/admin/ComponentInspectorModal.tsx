import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  FileCode, 
  Code2, 
  Layers, 
  Terminal, 
  Workflow, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Edit3
} from 'lucide-react';
import { ComponentInstanceData } from './AdminComponentWizard';
import { RouteConfigData } from './AdminRouteStudio';
import { getComponentTypeMeta } from './componentTypeConfig';
import { CodeSyntaxViewer } from './CodeSyntaxViewer';
import { 
  getMethodSignatureForType, 
  generateFullClassPreview 
} from '../../utils/componentTemplates';

interface ComponentInspectorModalProps {
  component: ComponentInstanceData | null;
  routes: RouteConfigData[];
  isOpen: boolean;
  onClose: () => void;
  onEdit: (comp: ComponentInstanceData) => void;
}

export const ComponentInspectorModal: React.FC<ComponentInspectorModalProps> = ({
  component,
  routes,
  isOpen,
  onClose,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'SOURCE' | 'CLASS' | 'PAYLOAD' | 'ROUTES'>('SOURCE');
  const [copiedId, setCopiedId] = useState<boolean>(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !component) {
    return null;
  }

  const meta = getComponentTypeMeta(component.componentType);
  const TypeIcon = meta.icon;
  const sig = getMethodSignatureForType(component.componentType);

  const referencingRoutes = routes.filter(r => 
    r.splitterInstanceId === component.instanceId ||
    r.validatorInstanceId === component.instanceId ||
    r.processorInstanceId === component.instanceId ||
    r.writerInstanceId === component.instanceId
  );

  const fullClassCode = generateFullClassPreview(
    component.componentType,
    component.sourceCode,
    component.instanceId.replace(/[^a-zA-Z0-9]/g, '_') + 'Impl'
  );

  const handleCopyId = () => {
    navigator.clipboard.writeText(component.instanceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspector-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '960px',
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
        <div style={{ height: '4px', background: meta.accentGradient }} />

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          background: 'var(--bg-card-subtle, #f8fafc)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: meta.lightBadgeBg,
              color: meta.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${meta.lightBadgeBorder}`,
              flexShrink: 0
            }}>
              <TypeIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: meta.lightBadgeBg,
                  color: meta.color,
                  border: `1px solid ${meta.lightBadgeBorder}`
                }}>
                  {meta.label}
                </span>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-muted, #64748b)',
                  background: 'var(--bg-card-muted, #f1f5f9)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  {component.language} 21 • Janino Sandbox
                </span>

                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Copy Instance ID"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-muted, #64748b)',
                    background: 'transparent',
                    border: '1px dashed var(--border-hover, #cbd5e1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <span>{component.instanceId}</span>
                  {copiedId ? <Check size={11} color="#059669" /> : <Copy size={11} />}
                </button>
              </div>

              <h3 id="inspector-modal-title" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                {component.name}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)', lineHeight: 1.4 }}>
                {component.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              borderRadius: '8px',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Method Signature & Variable Contract Strip */}
        <div style={{
          padding: '12px 24px',
          background: '#090d16',
          borderBottom: '1px solid #1e293b',
          color: '#e2e8f0',
          fontSize: '12px',
          fontFamily: 'var(--font-mono, monospace)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dynamic Method Contract Framing:
            </span>
            <span style={{ fontSize: '11px', color: '#38bdf8' }}>
              Virtual Thread Execution: Safe
            </span>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#7dd3fc',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ color: '#38bdf8' }}>public </span>
            <span style={{ color: '#f472b6' }}>{sig.shortReturnType} </span>
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>{sig.methodName}</span>
            <span style={{ color: '#e2e8f0' }}>(</span>
            {sig.parameters.map((p, i) => (
              <span key={p.name}>
                <span style={{ color: '#f472b6' }}>{p.type.split('.').pop()} </span>
                <span style={{ color: '#c084fc' }}>{p.name}</span>
                {i < sig.parameters.length - 1 ? <span style={{ color: '#e2e8f0' }}>, </span> : null}
              </span>
            ))}
            <span style={{ color: '#e2e8f0' }}>) </span>
            <span style={{ color: '#38bdf8' }}>throws </span>
            <span style={{ color: '#f472b6' }}>Exception</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
            {sig.parameters.map(p => (
              <div 
                key={p.name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  padding: '2px 8px',
                  fontSize: '11px'
                }}
              >
                <span style={{ color: '#c084fc', fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: '#64748b' }}>({p.type})</span>
                <span style={{ color: '#94a3b8' }}>— {p.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '2px',
          padding: '0 24px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          background: 'var(--bg-card, #ffffff)'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('SOURCE')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'SOURCE' ? 700 : 500,
              color: activeTab === 'SOURCE' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              borderBottom: activeTab === 'SOURCE' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Code2 size={15} /> Source Script
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CLASS')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'CLASS' ? 700 : 500,
              color: activeTab === 'CLASS' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              borderBottom: activeTab === 'CLASS' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Terminal size={15} /> Complete Java 21 Class
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAYLOAD')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'PAYLOAD' ? 700 : 500,
              color: activeTab === 'PAYLOAD' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              borderBottom: activeTab === 'PAYLOAD' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileCode size={15} /> Sample Test Payload
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ROUTES')}
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: activeTab === 'ROUTES' ? 700 : 500,
              color: activeTab === 'ROUTES' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
              borderBottom: activeTab === 'ROUTES' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
              background: 'transparent',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Workflow size={15} /> Referenced Routes ({referencingRoutes.length})
          </button>
        </div>

        {/* Modal Tab Content Area */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          background: 'var(--bg-card-subtle, #f8fafc)'
        }}>
          {activeTab === 'SOURCE' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                  Inner Method Body Executed by Janino Compiler:
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-subtle, #94a3b8)' }}>
                  Enclosing Method: {sig.interfaceShortName}.{sig.methodName}()
                </span>
              </div>
              <CodeSyntaxViewer
                code={component.sourceCode}
                language="Java 21"
                isExpanded={true}
                canExpand={false}
                showLineNumbers={true}
                accentColor={meta.color}
              />
            </div>
          )}

          {activeTab === 'CLASS' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                  Synthesized Janino Dynamic Compilation Class (Java 21 Loom Runtime):
                </span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                  implements {sig.interfaceShortName}
                </span>
              </div>
              <CodeSyntaxViewer
                code={fullClassCode}
                language="Java 21 Compiled"
                isExpanded={true}
                canExpand={false}
                showLineNumbers={true}
                accentColor={meta.color}
              />
            </div>
          )}

          {activeTab === 'PAYLOAD' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                  JSON Sample Payload Used for Pre-Flight Sandbox Testing:
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                  Format: JSON Map Attributes
                </span>
              </div>
              <CodeSyntaxViewer
                code={component.sampleTestPayload || '{\n  "id": 101,\n  "email": "user@example.com"\n}'}
                language="JSON"
                isExpanded={true}
                canExpand={false}
                showLineNumbers={true}
                accentColor="#38bdf8"
              />
            </div>
          )}

          {activeTab === 'ROUTES' && (
            <div>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                This component is bound to the following pipeline routes:
              </p>
              {referencingRoutes.length === 0 ? (
                <div style={{
                  padding: '30px',
                  textAlign: 'center',
                  background: 'var(--bg-card, #ffffff)',
                  borderRadius: '12px',
                  border: '1px dashed var(--border-hover, #cbd5e1)'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                    No routes are currently referencing this component. It is safely isolated in library storage.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {referencingRoutes.map(r => (
                    <div 
                      key={r.routeId}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-card, #ffffff)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-subtle, #e2e8f0)',
                        boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: r.status === 'ACTIVE' ? 'var(--success-bg, #ecfdf5)' : 'var(--bg-card-subtle, #f1f5f9)',
                          color: r.status === 'ACTIVE' ? 'var(--success-text, #065f46)' : 'var(--text-muted, #64748b)'
                        }}>
                          {r.status}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-subtle, #94a3b8)' }}>
                          Batch: {r.batchSize || 500}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                        {r.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: '11.5px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #64748b)' }}>
                        ID: {r.routeId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-card, #ffffff)'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'transparent',
              color: 'var(--text-main, #0f172a)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(component);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Edit3 size={14} />
            <span>Edit Code in Studio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
