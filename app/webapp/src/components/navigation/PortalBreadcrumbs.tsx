import React from 'react';
import { Home, ChevronRight } from 'lucide-react';

export interface PortalBreadcrumbsProps {
  activeTab: 'USER' | 'ADMIN';
  activeWorkspaceRouteId: string | null;
  activeRouteName?: string;
  adminSubTab: 'ROUTES' | 'COMPONENTS' | 'DLQ';
  onNavigateHome: () => void;
  onNavigateRouteCatalog: () => void;
}

export const PortalBreadcrumbs: React.FC<PortalBreadcrumbsProps> = ({
  activeTab,
  activeWorkspaceRouteId,
  activeRouteName,
  adminSubTab,
  onNavigateHome,
  onNavigateRouteCatalog
}) => {
  return (
    <div style={{ background: 'var(--bg-card-subtle, #f1f5f9)', borderBottom: '1px solid var(--glass-border, #e2e8f0)', padding: '8px 24px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
        <button 
          onClick={onNavigateHome}
          style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Home size={13} /> Home
        </button>
        <ChevronRight size={12} />
        {activeTab === 'USER' ? (
          <>
            <button 
              onClick={onNavigateRouteCatalog}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: activeWorkspaceRouteId ? 'var(--primary, #2563eb)' : 'var(--text-main, #0f172a)', 
                fontWeight: activeWorkspaceRouteId ? 500 : 700, 
                padding: 0, 
                cursor: 'pointer' 
              }}
            >
              Route Catalog
            </button>
            {activeWorkspaceRouteId && (
              <>
                <ChevronRight size={12} />
                <span style={{ color: 'var(--text-main, #0f172a)', fontWeight: 700 }}>
                  {activeRouteName || activeWorkspaceRouteId} (Workspace)
                </span>
              </>
            )}
          </>
        ) : (
          <>
            <span style={{ color: 'var(--text-main, #0f172a)', fontWeight: 700 }}>Admin Studio</span>
            <ChevronRight size={12} />
            <span style={{ color: 'var(--primary, #2563eb)', fontWeight: 600 }}>
              {adminSubTab === 'ROUTES' ? 'Dynamic Route Studio' : adminSubTab === 'COMPONENTS' ? 'Component Library' : 'Dead Letter Queue'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};
