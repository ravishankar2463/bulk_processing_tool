import React, { useState } from 'react';
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
  Code2,
  Clock,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { NonEditableRouteDagStream } from './topology/NonEditableRouteDagStream';
import { runHousekeeping, updateRouteRetention } from '../../services/apiClient';
import { HousekeepingReport } from '../../types/process';

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
  retentionDays?: number;
}

interface Props {
  routes: RouteConfigData[];
  onToggleStatus: (routeId: string) => void;
  onEditRoute: (route: RouteConfigData) => void;
  onCreateRoute: () => void;
  onViewWorkspace?: (routeId: string) => void;
  onInspectComponent?: (componentId: string) => void;
  onDesignTopology?: (routeId: string) => void;
}

export const AdminRouteStudio: React.FC<Props> = ({
  routes,
  onToggleStatus,
  onEditRoute,
  onCreateRoute,
  onViewWorkspace,
  onInspectComponent,
  onDesignTopology
}) => {
  const [retentionMap, setRetentionMap] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    routes.forEach(r => {
      init[r.routeId] = r.retentionDays ?? 30;
    });
    return init;
  });

  const [housekeepingStatus, setHousekeepingStatus] = useState<Record<string, { loading: boolean; report?: HousekeepingReport; error?: string }>>({});
  const [savingRetention, setSavingRetention] = useState<Record<string, boolean>>({});

  const handleRetentionChange = (routeId: string, val: number) => {
    // Clamp to 1..90
    const clamped = Math.max(1, Math.min(90, val));
    setRetentionMap(prev => ({ ...prev, [routeId]: clamped }));
  };

  const handleSaveRetention = async (routeId: string) => {
    const days = retentionMap[routeId] ?? 30;
    setSavingRetention(prev => ({ ...prev, [routeId]: true }));
    try {
      await updateRouteRetention(routeId, days);
    } catch (err: any) {
      console.error('Failed to update retention:', err);
    } finally {
      setSavingRetention(prev => ({ ...prev, [routeId]: false }));
    }
  };

  const handleRunHousekeeping = async (routeId: string) => {
    setHousekeepingStatus(prev => ({ ...prev, [routeId]: { loading: true } }));
    try {
      const report = await runHousekeeping(routeId);
      setHousekeepingStatus(prev => ({ ...prev, [routeId]: { loading: false, report } }));
    } catch (err: any) {
      setHousekeepingStatus(prev => ({ ...prev, [routeId]: { loading: false, error: err?.message || 'Purge failed' } }));
    }
  };
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
                    onClick={() => onDesignTopology ? onDesignTopology(route.routeId) : onEditRoute(route)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 14px',
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
                    }}
                  >
                    <GitBranch size={13} /> Edit DAG
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

              {/* Non-Editable Stream DAG Visualization (Replaces hardcoded 4-box pipeline) */}
              <NonEditableRouteDagStream
                routeId={route.routeId}
                onEditDAG={() => onDesignTopology ? onDesignTopology(route.routeId) : onEditRoute(route)}
                onExpandDAG={() => onDesignTopology ? onDesignTopology(route.routeId) : onEditRoute(route)}
                onInspectNode={(node) => onInspectComponent && onInspectComponent(node.refId)}
              />

              {/* Route Housekeeping & Retention Section */}
              <div 
                data-testid={`housekeeping-panel-${route.routeId}`}
                style={{
                  margin: '14px 0 8px',
                  padding: '12px 14px',
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} color="#64748b" />
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #1e293b)' }}>
                        File Housekeeping & Retention
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>
                        (Max ceiling: 90 days / 3 months)
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label htmlFor={`retention-input-${route.routeId}`} style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                        Retention:
                      </label>
                      <input
                        id={`retention-input-${route.routeId}`}
                        data-testid={`retention-input-${route.routeId}`}
                        type="number"
                        min="1"
                        max="90"
                        value={retentionMap[route.routeId] ?? 30}
                        onChange={(e) => handleRetentionChange(route.routeId, parseInt(e.target.value, 10) || 1)}
                        style={{
                          width: '60px',
                          padding: '4px 6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          textAlign: 'center',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          background: '#ffffff'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>days</span>
                      <button
                        data-testid={`save-retention-btn-${route.routeId}`}
                        onClick={() => handleSaveRetention(route.routeId)}
                        disabled={savingRetention[route.routeId]}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        {savingRetention[route.routeId] ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                    <button
                      data-testid={`run-housekeeping-btn-${route.routeId}`}
                      onClick={() => handleRunHousekeeping(route.routeId)}
                      disabled={housekeepingStatus[route.routeId]?.loading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: '#fff1f2',
                        color: '#be123c',
                        border: '1px solid #fecdd3',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                      {housekeepingStatus[route.routeId]?.loading ? 'Purging...' : 'Run Housekeeping Now'}
                    </button>
                  </div>
                </div>

                {housekeepingStatus[route.routeId]?.report && (
                  <div 
                    data-testid={`housekeeping-report-${route.routeId}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      color: '#065f46',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      padding: '6px 10px',
                      borderRadius: '6px'
                    }}
                  >
                    <CheckCircle2 size={14} color="#059669" />
                    <span>
                      Purged <strong>{housekeepingStatus[route.routeId]?.report?.purgedJobsCount}</strong> jobs,{' '}
                      <strong>{housekeepingStatus[route.routeId]?.report?.purgedBatchChunksCount}</strong> batches,{' '}
                      <strong>{housekeepingStatus[route.routeId]?.report?.purgedErrorsCount}</strong> DLQ errors (
                      {((housekeepingStatus[route.routeId]?.report?.purgedBytes || 0) / 1024).toFixed(1)} KB reclaimed).
                    </span>
                  </div>
                )}
                {housekeepingStatus[route.routeId]?.error && (
                  <div style={{ fontSize: '12px', color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: '6px' }}>
                    {housekeepingStatus[route.routeId]?.error}
                  </div>
                )}
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
