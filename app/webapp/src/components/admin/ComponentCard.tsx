import React from 'react';
import { Workflow, Maximize2, Edit3 } from 'lucide-react';
import { ComponentInstanceData } from './AdminComponentWizard';
import { RouteConfigData } from './AdminRouteStudio';
import { getComponentTypeMeta } from './componentTypeConfig';
import { CodeSyntaxViewer } from './CodeSyntaxViewer';

interface ComponentCardProps {
  comp: ComponentInstanceData;
  referencingRoutes: RouteConfigData[];
  viewMode: 'GRID' | 'LIST';
  isCodeExpanded: boolean;
  onToggleExpand: () => void;
  onInspect: () => void;
  onEdit: () => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({
  comp,
  referencingRoutes,
  viewMode,
  isCodeExpanded,
  onToggleExpand,
  onInspect,
  onEdit
}) => {
  const meta = getComponentTypeMeta(comp.componentType);
  const TypeIcon = meta.icon;

  if (viewMode === 'LIST') {
    return (
      <div
        className="liquid-glass-card"
        style={{
          background: 'var(--glass-card, #ffffff)',
          border: '1px solid var(--glass-border, #e2e8f0)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))',
          overflow: 'hidden'
        }}
      >
        <div style={{ height: '4px', background: meta.accentGradient }} />
        
        <div style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.4fr)',
          gap: '24px',
          alignItems: 'start'
        }}>
          {/* Left Column: Metadata & Routes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ 
                fontSize: '11px', 
                fontWeight: 700, 
                padding: '3px 8px', 
                borderRadius: '6px', 
                background: meta.lightBadgeBg, 
                color: meta.lightBadgeText,
                border: `1px solid ${meta.lightBadgeBorder}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <TypeIcon size={13} />
                {comp.componentType}
              </span>

              <span style={{
                fontSize: '11px',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-muted, #64748b)',
                background: 'var(--bg-card-muted, #f1f5f9)',
                padding: '2px 7px',
                borderRadius: '4px'
              }}>
                {comp.instanceId}
              </span>
            </div>

            <h4 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
              {comp.name}
            </h4>

            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--text-muted, #64748b)', lineHeight: 1.45 }}>
              {comp.description}
            </p>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Pipeline Binding:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  padding: '2px 8px', 
                  borderRadius: '999px',
                  background: referencingRoutes.length > 0 ? 'var(--success-bg, #ecfdf5)' : 'var(--bg-card-subtle, #f1f5f9)',
                  color: referencingRoutes.length > 0 ? 'var(--success-text, #065f46)' : 'var(--text-muted, #64748b)',
                  border: `1px solid ${referencingRoutes.length > 0 ? 'var(--success-border, #a7f3d0)' : 'var(--border-subtle, #e2e8f0)'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Workflow size={11} />
                  Used in {referencingRoutes.length} route(s)
                </span>

                {referencingRoutes.map(r => (
                  <span 
                    key={r.routeId}
                    style={{ 
                      fontSize: '10.5px', 
                      color: 'var(--text-muted, #475569)', 
                      fontFamily: 'var(--font-mono, monospace)',
                      background: 'var(--bg-card-muted, #f8fafc)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}
                  >
                    {r.routeId}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onInspect}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  background: 'transparent',
                  color: 'var(--text-muted, #475569)',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={13} />
                <span>Inspect Full</span>
              </button>

              <button
                type="button"
                onClick={onEdit}
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 14px', 
                  border: '1px solid var(--border-subtle, #cbd5e1)', 
                  background: 'var(--bg-card, #ffffff)', 
                  color: 'var(--text-main, #0f172a)',
                  borderRadius: '6px', 
                  fontSize: '12px', 
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={13} />
                <span>Edit Code</span>
              </button>
            </div>
          </div>

          {/* Right Column: Code Viewer */}
          <div>
            <CodeSyntaxViewer
              code={comp.sourceCode}
              language="Java 21"
              componentType={comp.componentType}
              isExpanded={isCodeExpanded}
              onToggleExpand={onToggleExpand}
              canExpand={true}
              maxCollapsedLines={8}
              showLineNumbers={true}
              onInspect={onInspect}
              accentColor={meta.color}
              fixedHeight={false}
            />
          </div>
        </div>
      </div>
    );
  }

  // Grid Card View - Perfectly Aligned Geometry
  return (
    <div
      className="liquid-glass-card"
      style={{
        background: 'var(--glass-card, #ffffff)',
        border: '1px solid var(--glass-border, #e2e8f0)',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))',
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Top Accent Stripe */}
      <div style={{
        height: '4px',
        background: meta.accentGradient
      }} />

      <div style={{ padding: '18px 18px 12px 18px', display: 'flex', flexDirection: 'column' }}>
        {/* Header Row: Type Badge on left; ID & Language on right */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '26px',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '3px 8px', 
              borderRadius: '6px', 
              background: meta.lightBadgeBg, 
              color: meta.lightBadgeText,
              border: `1px solid ${meta.lightBadgeBorder}`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              <TypeIcon size={13} />
              {comp.componentType}
            </span>
            <span style={{
              fontSize: '11px',
              color: 'var(--text-muted, #64748b)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              • {meta.shortLabel}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{
              fontSize: '10.5px',
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--text-muted, #64748b)',
              background: 'var(--bg-card-muted, #f1f5f9)',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              whiteSpace: 'nowrap'
            }}>
              {comp.instanceId}
            </span>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600,
              color: 'var(--text-muted, #475569)', 
              background: 'var(--bg-card-subtle, #f1f5f9)', 
              padding: '2px 6px', 
              borderRadius: '4px',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              whiteSpace: 'nowrap'
            }}>
              {comp.language} 21
            </span>
          </div>
        </div>

        {/* Component Title - Uniform 2-Line Baseline Height (42px) */}
        <div style={{ height: '42px', marginBottom: '4px' }}>
          <h4 
            title={comp.name}
            style={{ 
              margin: 0, 
              fontSize: '15.5px', 
              fontWeight: 700, 
              color: 'var(--text-main, #0f172a)',
              lineHeight: '21px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {comp.name}
          </h4>
        </div>

        {/* Component Description - Uniform 2-Line Baseline Height (36px) */}
        <div style={{ height: '36px', marginBottom: '10px' }}>
          <p 
            title={comp.description}
            style={{ 
              margin: 0, 
              fontSize: '12.5px', 
              color: 'var(--text-muted, #64748b)', 
              lineHeight: '18px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {comp.description}
          </p>
        </div>

        {/* Process Linkage Indicator - Uniform Baseline Height (24px) */}
        <div style={{ 
          height: '24px',
          marginBottom: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          overflow: 'hidden'
        }}>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            padding: '2px 8px', 
            borderRadius: '999px',
            background: referencingRoutes.length > 0 ? 'var(--success-bg, #ecfdf5)' : 'var(--bg-card-subtle, #f1f5f9)',
            color: referencingRoutes.length > 0 ? 'var(--success-text, #065f46)' : 'var(--text-muted, #64748b)',
            border: `1px solid ${referencingRoutes.length > 0 ? 'var(--success-border, #a7f3d0)' : 'var(--border-subtle, #e2e8f0)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            <Workflow size={11} />
            Used in {referencingRoutes.length} route(s)
          </span>

          {referencingRoutes.map(r => (
            <span 
              key={r.routeId} 
              title={`Route: ${r.name}`}
              style={{ 
                fontSize: '10px', 
                color: 'var(--text-muted, #475569)', 
                fontFamily: 'var(--font-mono, monospace)',
                background: 'var(--bg-card-muted, #f8fafc)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden'
              }}
            >
              {r.routeId}
            </span>
          ))}
        </div>

        {/* Enhanced Code Syntax Viewer - Uniform 138px Terminal Body in Grid Mode */}
        <CodeSyntaxViewer
          code={comp.sourceCode}
          language="Java 21"
          componentType={comp.componentType}
          isExpanded={isCodeExpanded}
          onToggleExpand={onToggleExpand}
          canExpand={true}
          maxCollapsedLines={5}
          showLineNumbers={true}
          onInspect={onInspect}
          accentColor={meta.color}
          fixedHeight={true}
        />
      </div>

      {/* Card Action Footer */}
      <div style={{ 
        padding: '12px 18px', 
        borderTop: '1px solid var(--border-subtle, #e2e8f0)',
        background: 'var(--bg-card-subtle, #f8fafc)',
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          type="button"
          onClick={onInspect}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle, #cbd5e1)',
            background: 'transparent',
            color: 'var(--text-muted, #475569)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          <Maximize2 size={13} />
          <span>Inspect</span>
        </button>

        <button
          type="button"
          onClick={onEdit}
          style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 14px', 
            border: '1px solid var(--border-subtle, #cbd5e1)', 
            background: 'var(--bg-card, #ffffff)', 
            color: 'var(--text-main, #0f172a)',
            borderRadius: '6px', 
            fontSize: '12px', 
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          <Edit3 size={13} />
          <span>Edit Code</span>
        </button>
      </div>
    </div>
  );
};
