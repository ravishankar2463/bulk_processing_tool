import React from 'react';
import { ComponentInstanceData } from './AdminComponentWizard';
import { RouteConfigData } from './AdminRouteStudio';

export interface AdminComponentLibraryProps {
  components: ComponentInstanceData[];
  routes: RouteConfigData[];
  onEditComponent: (comp: ComponentInstanceData) => void;
}

export const AdminComponentLibrary: React.FC<AdminComponentLibraryProps> = ({
  components,
  routes,
  onEditComponent
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '18px' }}>
      {components.map((comp) => {
        const referencingRoutes = routes.filter(r => 
          r.splitterInstanceId === comp.instanceId ||
          r.validatorInstanceId === comp.instanceId ||
          r.processorInstanceId === comp.instanceId ||
          r.writerInstanceId === comp.instanceId
        );

        return (
          <div
            key={comp.instanceId}
            className="liquid-glass-card"
            style={{
              background: 'var(--glass-card, #ffffff)',
              border: '1px solid var(--glass-border, #e2e8f0)',
              borderRadius: '14px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 700, 
                  padding: '3px 8px', 
                  borderRadius: '6px', 
                  background: 'var(--primary-light, #eff6ff)', 
                  color: 'var(--primary, #1d4ed8)',
                  border: '1px solid var(--border-subtle, #bfdbfe)'
                }}>
                  {comp.componentType}
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600,
                  color: 'var(--text-muted, #475569)', 
                  background: 'var(--bg-card-subtle, #f1f5f9)', 
                  padding: '2px 7px', 
                  borderRadius: '4px' 
                }}>
                  {comp.language} 21
                </span>
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                {comp.name}
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted, #64748b)', lineHeight: 1.4 }}>
                {comp.description}
              </p>

              {/* Process Linkage Indicator */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  padding: '2px 8px', 
                  borderRadius: '999px',
                  background: referencingRoutes.length > 0 ? 'var(--success-bg, #ecfdf5)' : 'var(--bg-card-subtle, #f1f5f9)',
                  color: referencingRoutes.length > 0 ? 'var(--success-text, #065f46)' : 'var(--text-muted, #64748b)',
                  border: `1px solid ${referencingRoutes.length > 0 ? 'var(--success-border, #a7f3d0)' : 'var(--border-subtle, #e2e8f0)'}`
                }}>
                  Used in {referencingRoutes.length} route(s)
                </span>
                {referencingRoutes.map(r => (
                  <span key={r.routeId} style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {r.routeId}
                  </span>
                ))}
              </div>

              <pre style={{ 
                margin: 0, 
                padding: '10px 12px', 
                background: '#090d16', 
                color: '#94a3b8', 
                borderRadius: '8px', 
                fontSize: '11px', 
                fontFamily: 'var(--font-mono)',
                overflowX: 'auto', 
                maxHeight: '75px',
                border: '1px solid #1e293b'
              }}>
                {comp.sourceCode}
              </pre>
            </div>

            <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => onEditComponent(comp)}
                style={{ 
                  padding: '6px 14px', 
                  border: '1px solid var(--border-subtle, #cbd5e1)', 
                  background: 'var(--bg-card, #ffffff)', 
                  color: 'var(--text-main, #0f172a)',
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: 500,
                  cursor: 'pointer' 
                }}
              >
                Edit Code
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
