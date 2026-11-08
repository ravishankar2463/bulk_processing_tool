import React from 'react';
import { 
  GitBranch, 
  Play, 
  Pause, 
  Edit, 
  PlusCircle, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Activity,
  Code2
} from 'lucide-react';

export interface RouteConfigData {
  routeId: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR' | string;
  sourceEndpoint: string;
  splitterInstanceId: string;
  validatorInstanceId: string;
  processorInstanceId: string;
  writerInstanceId: string;
  batchSize: number;
  parallelConsumers: number;
  cronExpression?: string;
}

interface Props {
  routes: RouteConfigData[];
  onToggleStatus: (routeId: string) => void;
  onEditRoute: (route: RouteConfigData) => void;
  onCreateRoute: () => void;
  onViewWorkspace?: (routeId: string) => void;
  onInspectComponent?: (componentId: string) => void;
}

export const AdminRouteStudio: React.FC<Props> = ({
  routes,
  onToggleStatus,
  onEditRoute,
  onCreateRoute,
  onViewWorkspace,
  onInspectComponent
}) => {
  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              Dynamic Route Studio
            </h2>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              background: 'var(--success-bg, #ecfdf5)', 
              color: 'var(--success-text, #047857)', 
              padding: '2px 8px', 
              borderRadius: '999px',
              border: '1px solid var(--success-border, #a7f3d0)'
            }}>
              Apache Camel 4.x Active
            </span>
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            Manage Apache Camel dynamic ingestion pipelines, component bindings, and Loom concurrency settings
          </p>
        </div>

        <button
          onClick={onCreateRoute}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            background: 'var(--primary, #2563eb)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
          }}
        >
          <PlusCircle size={15} /> New Route Pipeline
        </button>
      </div>

      {/* Routes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {routes.map((route) => {
          const isActive = route.status === 'ACTIVE';

          return (
            <div
              key={route.routeId}
              className="liquid-glass-card"
              style={{
                background: 'var(--glass-card, #ffffff)',
                border: '1px solid var(--glass-border, #e2e8f0)',
                borderRadius: '14px',
                padding: '22px',
                boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))',
                transition: 'all var(--transition-spring, 0.2s ease-in-out)'
              }}
            >
              {/* Route Card Top */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main, #0f172a)' }}>
                      {route.name}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        background: isActive ? 'var(--success-bg, #dcfce7)' : 'var(--danger-bg, #fee2e2)',
                        color: isActive ? 'var(--success-text, #166534)' : 'var(--danger-text, #991b1b)',
                        border: `1px solid ${isActive ? 'var(--success-border, #bbf7d0)' : 'var(--danger-border, #fecaca)'}`
                      }}
                    >
                      {isActive && <span className="pulsing-dot" style={{ background: 'var(--success, #16a34a)' }} />}
                      {route.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                    Route ID: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main, #334155)', background: 'var(--bg-card-subtle, #f1f5f9)', padding: '1px 5px', borderRadius: '4px' }}>{route.routeId}</code> | Endpoint: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main, #334155)', background: 'var(--bg-card-subtle, #f1f5f9)', padding: '1px 5px', borderRadius: '4px' }}>{route.sourceEndpoint}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onToggleStatus(route.routeId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      background: isActive ? 'var(--danger-bg, #fef2f2)' : 'var(--success-bg, #f0fdf4)',
                      color: isActive ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isActive ? <Pause size={13} /> : <Play size={13} />}
                    {isActive ? 'Pause Route' : 'Resume Route'}
                  </button>

                  <button
                    data-testid={`edit-route-btn-${route.routeId}`}
                    onClick={() => onEditRoute(route)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      border: '1px solid var(--border-subtle, #cbd5e1)',
                      background: 'var(--bg-card, #ffffff)',
                      color: 'var(--text-main, #0f172a)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
                    }}
                  >
                    <Edit size={13} /> Edit
                  </button>

                  <button
                    data-testid={`view-workspace-btn-${route.routeId}`}
                    onClick={() => onViewWorkspace ? onViewWorkspace(route.routeId) : onEditRoute(route)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      border: 'none',
                      background: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
                    }}
                  >
                    <GitBranch size={13} /> Process Workspace
                  </button>
                </div>
              </div>

              {/* Pipeline Topology Visualization Graph with Direct Component Linking */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg-card-subtle, #f8fafc)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  gap: '12px',
                  overflowX: 'auto',
                  fontSize: '12px',
                  marginBottom: '14px'
                }}
              >
                <div 
                  onClick={() => onInspectComponent && onInspectComponent(route.splitterInstanceId || 'splitter-csv-univocity')}
                  title="Click to view/edit Splitter component"
                  style={{ 
                    textAlign: 'center', 
                    minWidth: '130px', 
                    background: 'var(--bg-card, #ffffff)', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    cursor: onInspectComponent ? 'pointer' : 'default',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Splitter</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{route.splitterInstanceId || 'Default CSV'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div 
                  onClick={() => onInspectComponent && onInspectComponent(route.validatorInstanceId || 'val-customer-kyc')}
                  title="Click to view/edit Validator component"
                  style={{ 
                    textAlign: 'center', 
                    minWidth: '130px', 
                    background: 'var(--bg-card, #ffffff)', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    cursor: onInspectComponent ? 'pointer' : 'default',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Validator</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{route.validatorInstanceId || 'None'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div 
                  onClick={() => onInspectComponent && onInspectComponent(route.processorInstanceId || 'proc-customer-enricher')}
                  title="Click to view/edit Batch Processor component"
                  style={{ 
                    textAlign: 'center', 
                    minWidth: '140px', 
                    background: 'var(--bg-card, #ffffff)', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    cursor: onInspectComponent ? 'pointer' : 'default',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Batch Processor</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{route.processorInstanceId || 'Passthrough'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div 
                  onClick={() => onInspectComponent && onInspectComponent(route.writerInstanceId || 'writer-audit-csv')}
                  title="Click to view/edit Report Writer component"
                  style={{ 
                    textAlign: 'center', 
                    minWidth: '130px', 
                    background: 'var(--bg-card, #ffffff)', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    cursor: onInspectComponent ? 'pointer' : 'default',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>Report Writer</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>{route.writerInstanceId || 'Summary CSV'}</div>
                </div>
              </div>

              {/* Execution Concurrency Footer */}
              <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: 'var(--text-muted, #64748b)', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={13} color="var(--primary, #2563eb)" />
                  Batch Size: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{route.batchSize} records</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={13} color="#7c3aed" />
                  Virtual Threads / Consumers: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{route.parallelConsumers}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={13} color="var(--success, #059669)" />
                  EIP Mode: <strong style={{ color: 'var(--text-main, #0f172a)' }}>Streaming Split & Aggregate</strong>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
