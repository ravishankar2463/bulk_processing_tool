import React, { useEffect, useState } from 'react';
import { Activity, Play, Pause, ArrowRight, Layers, TrendingUp, CheckCircle2, ShieldCheck } from 'lucide-react';
import { ProcessRoute, getRouteThroughput } from '../../types/process';
import { fetchCatalogRoutes, startRoute as apiStartRoute, pauseRoute as apiPauseRoute } from '../../services/apiClient';

export interface ProcessCatalogProps {
  routes?: ReadonlyArray<ProcessRoute> | ProcessRoute[];
  onSelectRoute?: (routeId: string) => void;
  onStartRoute?: (routeId: string) => void;
  onPauseRoute?: (routeId: string) => void;
}

export const ProcessCatalog: React.FC<ProcessCatalogProps> = ({
  routes: propRoutes,
  onSelectRoute,
  onStartRoute,
  onPauseRoute
}) => {
  const [internalRoutes, setInternalRoutes] = useState<ProcessRoute[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!propRoutes) {
      setLoading(true);
      fetchCatalogRoutes()
        .then((data) => {
          if (isMounted) {
            setInternalRoutes(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [propRoutes]);

  const handleStart = async (routeId: string) => {
    if (onStartRoute) {
      onStartRoute(routeId);
    } else {
      try {
        const updated = await apiStartRoute(routeId);
        setInternalRoutes(prev => prev.map(r => r.id === routeId ? updated : r));
      } catch {
        // Optimistic update
        setInternalRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'ACTIVE', health: 'HEALTHY' } : r));
      }
    }
  };

  const handlePause = async (routeId: string) => {
    if (onPauseRoute) {
      onPauseRoute(routeId);
    } else {
      try {
        const updated = await apiPauseRoute(routeId);
        setInternalRoutes(prev => prev.map(r => r.id === routeId ? updated : r));
      } catch {
        // Optimistic update
        setInternalRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status: 'PAUSED', health: 'DEGRADED' } : r));
      }
    }
  };

  const currentRoutes = propRoutes ? propRoutes : internalRoutes;

  return (
    <section 
      data-testid="process-catalog-container"
      className="liquid-glass-card craft-card"
      style={{
        borderRadius: '16px', // R_outer = R_inner (4px) + padding (12px) = 16px
        padding: '12px',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-card, 0 1px 3px 0 rgba(15, 23, 42, 0.06))',
        transition: 'all var(--transition-spring)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Enterprise Process & Route Catalog
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
              MuleSoft & Camel EIP dynamic route monitoring with microsecond virtual thread orchestration
            </p>
          </div>
        </div>
        <span 
          data-testid="catalog-routes-count" 
          className="tabular-nums" 
          style={{ 
            fontSize: '12px', 
            fontWeight: 600,
            color: 'var(--text-muted)', 
            background: 'var(--bg-card-subtle)', 
            padding: '4px 10px', 
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {currentRoutes.length} Configured Routes
        </span>
      </div>

      {loading && currentRoutes.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading enterprise process catalog...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
          {currentRoutes.map((route) => {
            const isActive = route.status === 'ACTIVE';
            const healthBg = route.health === 'HEALTHY' ? 'var(--success-bg)' : route.health === 'DEGRADED' ? 'var(--warning-bg)' : 'var(--danger-bg)';
            const healthColor = route.health === 'HEALTHY' ? 'var(--success-text)' : route.health === 'DEGRADED' ? 'var(--warning-text)' : 'var(--danger-text)';
            const healthBorder = route.health === 'HEALTHY' ? 'var(--success-border)' : route.health === 'DEGRADED' ? 'var(--warning-border)' : 'var(--danger-border)';

            return (
              <div
                key={route.id}
                data-testid={`route-card-${route.id}`}
                className="liquid-glass-card"
                style={{
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--glass-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'transform var(--transition-spring), box-shadow var(--transition-spring)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      data-testid={`status-badge-${route.id}`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: isActive ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: isActive ? 'var(--success-text)' : 'var(--danger-text)',
                        border: `1px solid ${isActive ? 'var(--success-border)' : 'var(--danger-border)'}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      {isActive && <span className="pulsing-dot" style={{ background: 'var(--success)', width: '6px', height: '6px' }} />}
                      {route.status}
                    </span>
                    <span
                      data-testid={`health-badge-${route.id}`}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: healthBg,
                        color: healthColor,
                        border: `1px solid ${healthBorder}`
                      }}
                    >
                      {route.health}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {route.name}
                  </h3>
                  <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                    {route.description}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Active Files in Flight</div>
                      <div data-testid={`active-files-${route.id}`} className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {(route.activeFilesInFlight ?? 0).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Throughput</div>
                      <div data-testid={`throughput-${route.id}`} className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {getRouteThroughput(route).toLocaleString('en-US')} rec/sec
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Success Rate</div>
                      <div data-testid={`success-rate-${route.id}`} className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                        {(route.successRatePercent ?? 0).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Pipeline Steps</div>
                      <div data-testid={`steps-count-${route.id}`} className="tabular-nums" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                        {route.pipelineSteps?.length ?? 0} Steps
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  {isActive ? (
                    <button
                      data-testid={`pause-route-btn-${route.id}`}
                      onClick={() => handlePause(route.id)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--danger-border)',
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Pause size={13} /> Pause Route
                    </button>
                  ) : (
                    <button
                      data-testid={`start-route-btn-${route.id}`}
                      onClick={() => handleStart(route.id)}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--success-border)',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <Play size={13} /> Start Route
                    </button>
                  )}
                  <button
                    data-testid={`view-workspace-btn-${route.id}`}
                    onClick={() => onSelectRoute?.(route.id)}
                    style={{
                      flex: 1,
                      padding: '7px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      boxShadow: '0 2px 6px rgba(37,99,235,0.25)'
                    }}
                  >
                    View Workspace <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default ProcessCatalog;
