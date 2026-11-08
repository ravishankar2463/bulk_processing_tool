import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  LayoutGrid, 
  List, 
  Code2, 
  Plus, 
  ShieldCheck, 
  Cpu, 
  Split, 
  Database
} from 'lucide-react';
import { ComponentInstanceData } from './AdminComponentWizard';
import { RouteConfigData } from './AdminRouteStudio';
import { ComponentKpiRibbon, ComponentKpiMetrics } from './ComponentKpiRibbon';
import { ComponentCard } from './ComponentCard';
import { ComponentInspectorModal } from './ComponentInspectorModal';

export interface AdminComponentLibraryProps {
  components: ComponentInstanceData[];
  routes: RouteConfigData[];
  onEditComponent: (comp: ComponentInstanceData) => void;
  onCreateComponent?: () => void;
}

export const AdminComponentLibrary: React.FC<AdminComponentLibraryProps> = ({
  components,
  routes,
  onEditComponent,
  onCreateComponent
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [usageFilter, setUsageFilter] = useState<'ALL' | 'USED' | 'UNUSED'>('ALL');
  const [sortBy, setSortBy] = useState<'ROUTES_DESC' | 'NAME_ASC' | 'TYPE'>('ROUTES_DESC');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  
  // Per-card expanded state for code viewing
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [allExpanded, setAllExpanded] = useState<boolean>(false);
  
  // Active component for modal code inspection
  const [inspectingComponent, setInspectingComponent] = useState<ComponentInstanceData | null>(null);

  // Map referencing routes for every component
  const componentRouteMap = useMemo(() => {
    const map = new Map<string, RouteConfigData[]>();
    components.forEach(comp => {
      const referencing = routes.filter(r => 
        r.splitterInstanceId === comp.instanceId ||
        r.validatorInstanceId === comp.instanceId ||
        r.processorInstanceId === comp.instanceId ||
        r.writerInstanceId === comp.instanceId
      );
      map.set(comp.instanceId, referencing);
    });
    return map;
  }, [components, routes]);

  // Overall metric counts
  const metrics: ComponentKpiMetrics = useMemo(() => {
    let validatorCount = 0;
    let processorCount = 0;
    let splitterCount = 0;
    let writerCount = 0;
    let boundCount = 0;

    components.forEach(comp => {
      const type = (comp.componentType || '').toUpperCase();
      if (type === 'VALIDATOR') validatorCount++;
      else if (type === 'BATCH_PROCESSOR') processorCount++;
      else if (type === 'SPLITTER') splitterCount++;
      else if (type === 'REPORT_WRITER' || type === 'WRITER') writerCount++;

      const refs = componentRouteMap.get(comp.instanceId) || [];
      if (refs.length > 0) boundCount++;
    });

    return {
      total: components.length,
      validators: validatorCount,
      processors: processorCount,
      splitters: splitterCount,
      writers: writerCount,
      bound: boundCount,
      unbound: components.length - boundCount
    };
  }, [components, componentRouteMap]);

  // Toggle individual card code expand
  const toggleCardExpand = (instanceId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [instanceId]: !prev[instanceId]
    }));
  };

  // Toggle expand all
  const handleToggleExpandAll = () => {
    const nextState = !allExpanded;
    setAllExpanded(nextState);
    const updated: Record<string, boolean> = {};
    components.forEach(c => {
      updated[c.instanceId] = nextState;
    });
    setExpandedCards(updated);
  };

  // Filtered & sorted components
  const filteredComponents = useMemo(() => {
    return components.filter(comp => {
      const referencing = componentRouteMap.get(comp.instanceId) || [];
      
      // Type filter
      if (selectedType !== 'ALL') {
        const norm = (comp.componentType || '').toUpperCase();
        if (selectedType === 'REPORT_WRITER') {
          if (norm !== 'REPORT_WRITER' && norm !== 'WRITER') return false;
        } else if (norm !== selectedType) {
          return false;
        }
      }

      // Usage filter
      if (usageFilter === 'USED' && referencing.length === 0) return false;
      if (usageFilter === 'UNUSED' && referencing.length > 0) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = (comp.name || '').toLowerCase().includes(query);
        const matchesId = (comp.instanceId || '').toLowerCase().includes(query);
        const matchesDesc = (comp.description || '').toLowerCase().includes(query);
        const matchesCode = (comp.sourceCode || '').toLowerCase().includes(query);
        const matchesRoutes = referencing.some(r => 
          (r.routeId || '').toLowerCase().includes(query) || 
          (r.name || '').toLowerCase().includes(query)
        );
        
        if (!matchesName && !matchesId && !matchesDesc && !matchesCode && !matchesRoutes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'ROUTES_DESC') {
        const countA = (componentRouteMap.get(a.instanceId) || []).length;
        const countB = (componentRouteMap.get(b.instanceId) || []).length;
        if (countB !== countA) return countB - countA;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'NAME_ASC') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'TYPE') {
        return (a.componentType || '').localeCompare(b.componentType || '');
      }
      return 0;
    });
  }, [components, componentRouteMap, selectedType, usageFilter, searchTerm, sortBy]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      {/* Overview & Metric Summary KPI Ribbon */}
      <ComponentKpiRibbon
        metrics={metrics}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        usageFilter={usageFilter}
        onSelectUsage={setUsageFilter}
      />

      {/* Main Filter, Search, and Toolbar Section */}
      <div 
        className="liquid-glass-card"
        style={{
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--glass-border, #e2e8f0)',
          background: 'var(--glass-card, #ffffff)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Top Search & Actions Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Live Search Input */}
          <div style={{
            position: 'relative',
            flex: '1 1 320px',
            minWidth: '240px'
          }}>
            <Search 
              size={16} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted, #94a3b8)'
              }} 
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search components by name, instance ID, description, or code snippet..."
              style={{
                width: '100%',
                padding: '9px 36px 9px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--glass-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Right Toolbar Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={usageFilter}
              onChange={(e) => setUsageFilter(e.target.value as 'ALL' | 'USED' | 'UNUSED')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--glass-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">All Linkages</option>
              <option value="USED">Used in Routes ({metrics.bound})</option>
              <option value="UNUSED">Unused / Standalone ({metrics.unbound})</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'ROUTES_DESC' | 'NAME_ASC' | 'TYPE')}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--glass-input, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ROUTES_DESC">Most Routes Used</option>
              <option value="NAME_ASC">Name (A-Z)</option>
              <option value="TYPE">Component Type</option>
            </select>

            <button
              type="button"
              onClick={handleToggleExpandAll}
              title={allExpanded ? 'Collapse all code previews' : 'Expand all code previews'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: allExpanded ? 'var(--primary-light, #eff6ff)' : 'var(--bg-card, #ffffff)',
                color: allExpanded ? 'var(--primary, #2563eb)' : 'var(--text-main, #0f172a)',
                fontSize: '12.5px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Code2 size={14} />
              <span>{allExpanded ? 'Collapse Code' : 'Expand Code'}</span>
            </button>

            <div style={{
              display: 'flex',
              background: 'var(--bg-card-muted, #f1f5f9)',
              borderRadius: '8px',
              padding: '2px',
              border: '1px solid var(--border-subtle, #e2e8f0)'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                title="Grid Card View"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'GRID' ? 'var(--bg-card, #ffffff)' : 'transparent',
                  color: viewMode === 'GRID' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                  boxShadow: viewMode === 'GRID' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                title="Detailed Horizontal View"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'LIST' ? 'var(--bg-card, #ffffff)' : 'transparent',
                  color: viewMode === 'LIST' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                  boxShadow: viewMode === 'LIST' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <List size={15} />
              </button>
            </div>

            {onCreateComponent && (
              <button
                type="button"
                onClick={onCreateComponent}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
                }}
              >
                <Plus size={14} />
                <span>New</span>
              </button>
            )}
          </div>
        </div>

        {/* Component Type Filter Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}>
          <button
            type="button"
            onClick={() => setSelectedType('ALL')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: selectedType === 'ALL' ? 700 : 500,
              background: selectedType === 'ALL' ? 'var(--primary, #2563eb)' : 'var(--bg-card-subtle, #f8fafc)',
              color: selectedType === 'ALL' ? '#ffffff' : 'var(--text-main, #0f172a)',
              border: `1px solid ${selectedType === 'ALL' ? 'var(--primary, #2563eb)' : 'var(--border-subtle, #e2e8f0)'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>All Types</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: selectedType === 'ALL' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card-muted, #e2e8f0)',
              color: selectedType === 'ALL' ? '#ffffff' : 'var(--text-muted, #64748b)'
            }}>
              {metrics.total}
            </span>
          </button>

          {/* Validator Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('VALIDATOR')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: selectedType === 'VALIDATOR' ? 700 : 500,
              background: selectedType === 'VALIDATOR' ? '#059669' : '#ecfdf5',
              color: selectedType === 'VALIDATOR' ? '#ffffff' : '#047857',
              border: `1px solid ${selectedType === 'VALIDATOR' ? '#059669' : '#a7f3d0'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <ShieldCheck size={14} />
            <span>Validators</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: selectedType === 'VALIDATOR' ? 'rgba(255, 255, 255, 0.25)' : '#d1fae5',
              color: selectedType === 'VALIDATOR' ? '#ffffff' : '#065f46'
            }}>
              {metrics.validators}
            </span>
          </button>

          {/* Batch Processor Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('BATCH_PROCESSOR')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: selectedType === 'BATCH_PROCESSOR' ? 700 : 500,
              background: selectedType === 'BATCH_PROCESSOR' ? '#4f46e5' : '#eef2ff',
              color: selectedType === 'BATCH_PROCESSOR' ? '#ffffff' : '#4338ca',
              border: `1px solid ${selectedType === 'BATCH_PROCESSOR' ? '#4f46e5' : '#c7d2fe'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Cpu size={14} />
            <span>Batch Processors</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: selectedType === 'BATCH_PROCESSOR' ? 'rgba(255, 255, 255, 0.25)' : '#e0e7ff',
              color: selectedType === 'BATCH_PROCESSOR' ? '#ffffff' : '#3730a3'
            }}>
              {metrics.processors}
            </span>
          </button>

          {/* Splitter Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('SPLITTER')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: selectedType === 'SPLITTER' ? 700 : 500,
              background: selectedType === 'SPLITTER' ? '#d97706' : '#fffbeb',
              color: selectedType === 'SPLITTER' ? '#ffffff' : '#b45309',
              border: `1px solid ${selectedType === 'SPLITTER' ? '#d97706' : '#fde68a'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Split size={14} />
            <span>Streaming Splitters</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: selectedType === 'SPLITTER' ? 'rgba(255, 255, 255, 0.25)' : '#fef3c7',
              color: selectedType === 'SPLITTER' ? '#ffffff' : '#92400e'
            }}>
              {metrics.splitters}
            </span>
          </button>

          {/* Report Writer Tab */}
          <button
            type="button"
            onClick={() => setSelectedType('REPORT_WRITER')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: selectedType === 'REPORT_WRITER' ? 700 : 500,
              background: selectedType === 'REPORT_WRITER' ? '#7c3aed' : '#faf5ff',
              color: selectedType === 'REPORT_WRITER' ? '#ffffff' : '#6d28d9',
              border: `1px solid ${selectedType === 'REPORT_WRITER' ? '#7c3aed' : '#e9d5ff'}`,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <Database size={14} />
            <span>Report Writers & Sinks</span>
            <span style={{
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: '999px',
              background: selectedType === 'REPORT_WRITER' ? 'rgba(255, 255, 255, 0.25)' : '#f3e8ff',
              color: selectedType === 'REPORT_WRITER' ? '#ffffff' : '#581c87'
            }}>
              {metrics.writers}
            </span>
          </button>
        </div>
      </div>

      {/* Empty State when no results match search/filter */}
      {filteredComponents.length === 0 && (
        <div 
          className="liquid-glass-card"
          style={{
            padding: '50px 20px',
            textAlign: 'center',
            borderRadius: '16px',
            border: '1px dashed var(--border-hover, #cbd5e1)',
            background: 'var(--glass-card, #ffffff)'
          }}
        >
          <Code2 size={40} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '14px' }} />
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
            No components match your filter criteria
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
            Try adjusting your search terms, clearing category filters, or add a new component.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('ALL');
              setUsageFilter('ALL');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Component Cards Grid or List */}
      <div style={
        viewMode === 'GRID' ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '20px'
        } : {
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }
      }>
        {filteredComponents.map((comp) => {
          const referencingRoutes = componentRouteMap.get(comp.instanceId) || [];
          const isCodeExpanded = !!expandedCards[comp.instanceId] || allExpanded;

          return (
            <ComponentCard
              key={comp.instanceId}
              comp={comp}
              referencingRoutes={referencingRoutes}
              viewMode={viewMode}
              isCodeExpanded={isCodeExpanded}
              onToggleExpand={() => toggleCardExpand(comp.instanceId)}
              onInspect={() => setInspectingComponent(comp)}
              onEdit={() => onEditComponent(comp)}
            />
          );
        })}
      </div>

      {/* Interactive Full Inspection Modal */}
      <ComponentInspectorModal
        component={inspectingComponent}
        routes={routes}
        isOpen={inspectingComponent !== null}
        onClose={() => setInspectingComponent(null)}
        onEdit={(comp) => {
          setInspectingComponent(null);
          onEditComponent(comp);
        }}
      />
    </div>
  );
};
