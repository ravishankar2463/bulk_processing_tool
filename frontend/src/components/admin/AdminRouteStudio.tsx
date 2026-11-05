import React from 'react';
import { GitBranch, Play, Pause, Edit, PlusCircle, ArrowRight, Settings2 } from 'lucide-react';

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
}

export const AdminRouteStudio: React.FC<Props> = ({
  routes,
  onToggleStatus,
  onEditRoute,
  onCreateRoute
}) => {
  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
            Dynamic Route Studio
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Manage Apache Camel dynamic ingestion pipelines, component bindings, and concurrency settings
          </p>
        </div>
        <button
          onClick={onCreateRoute}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <PlusCircle size={15} /> New Route Pipeline
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {routes.map((route) => {
          const isActive = route.status === 'ACTIVE';

          return (
            <div
              key={route.routeId}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#0f172a' }}>
                      {route.name}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: isActive ? '#dcfce7' : '#fee2e2',
                        color: isActive ? '#166534' : '#991b1b'
                      }}
                    >
                      {route.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Route ID: <code>{route.routeId}</code> | Endpoint: <code>{route.sourceEndpoint}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onToggleStatus(route.routeId)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      border: '1px solid #cbd5e1',
                      background: isActive ? '#fef2f2' : '#f0fdf4',
                      color: isActive ? '#dc2626' : '#16a34a',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    {isActive ? <Pause size={13} /> : <Play size={13} />}
                    {isActive ? 'Pause Route' : 'Resume Route'}
                  </button>

                  <button
                    onClick={() => onEditRoute(route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#0f172a',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <Edit size={13} /> Edit
                  </button>
                </div>
              </div>

              {/* Pipeline Topology Visualization */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  gap: '12px',
                  overflowX: 'auto',
                  fontSize: '12px'
                }}
              >
                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ color: '#64748b', marginBottom: '2px' }}>Splitter</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{route.splitterInstanceId || 'Default CSV'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ color: '#64748b', marginBottom: '2px' }}>Validator</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{route.validatorInstanceId || 'None'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div style={{ textAlign: 'center', minWidth: '130px' }}>
                  <div style={{ color: '#64748b', marginBottom: '2px' }}>Batch Processor</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{route.processorInstanceId || 'Passthrough'}</div>
                </div>
                <ArrowRight size={14} color="#94a3b8" />

                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ color: '#64748b', marginBottom: '2px' }}>Report Writer</div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>{route.writerInstanceId || 'Summary CSV'}</div>
                </div>
              </div>

              {/* Execution Concurrency */}
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                <span>Batch Size: <strong style={{ color: '#0f172a' }}>{route.batchSize} records</strong></span>
                <span>Virtual Threads / Consumers: <strong style={{ color: '#0f172a' }}>{route.parallelConsumers}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

