import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Globe, 
  Code2, 
  Database, 
  Cpu, 
  Layers, 
  ArrowRight,
  Maximize2,
  Lock,
  GitBranch
} from 'lucide-react';
import { RouteTopology, TopologyNode, StreamRole } from '../../../types/process';
import { fetchRouteTopology } from '../../../services/apiClient';

interface Props {
  routeId: string;
  onEditDAG?: () => void;
  onExpandDAG?: () => void;
  onInspectNode?: (node: TopologyNode) => void;
}

export const NonEditableRouteDagStream: React.FC<Props> = ({
  routeId,
  onEditDAG,
  onExpandDAG,
  onInspectNode
}) => {
  const [topology, setTopology] = useState<RouteTopology | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const top = await fetchRouteTopology(routeId);
        if (isMounted) setTopology(top);
      } catch (err) {
        console.error('Failed to load route topology:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [routeId]);

  const getNodeRole = (node: TopologyNode): StreamRole => {
    if (node.streamRole) return node.streamRole;
    if (node.category === 'SOURCE') return 'START';
    if (node.category === 'SINK' || node.category === 'REPORT_WRITER') return 'END';
    return 'MIDDLE';
  };

  const getNodeIcon = (node: TopologyNode) => {
    if (node.refId === 'conn-def-csv' || node.category === 'CSV') {
      return <FileSpreadsheet size={16} className="text-emerald-600" />;
    }
    if (node.refId === 'conn-def-rest-json') {
      return <Globe size={16} className="text-blue-600" />;
    }
    if (node.refId === 'conn-def-soap-xml') {
      return <Code2 size={16} className="text-amber-600" />;
    }
    if (node.refId === 'conn-def-db-sink' || node.category === 'DATABASE') {
      return <Database size={16} className="text-purple-600" />;
    }
    if (node.type === 'COMPONENT') {
      return <Layers size={16} className="text-slate-600" />;
    }
    return <Cpu size={16} className="text-indigo-600" />;
  };

  const getRoleBadgeStyle = (role: StreamRole) => {
    switch (role) {
      case 'START':
        return {
          bg: '#ecfdf5',
          border: '#a7f3d0',
          text: '#065f46',
          label: 'START • SOURCE'
        };
      case 'END':
        return {
          bg: '#faf5ff',
          border: '#e9d5ff',
          text: '#6b21a8',
          label: 'END • TERMINAL'
        };
      case 'MIDDLE':
      default:
        return {
          bg: '#eff6ff',
          border: '#bfdbfe',
          text: '#1e40af',
          label: 'MIDDLE • PIPE'
        };
    }
  };

  // Sort nodes in stream sequence: START first, then MIDDLE, then END
  const sortedNodes = topology?.nodes ? [...topology.nodes].sort((a, b) => {
    const roleA = getNodeRole(a);
    const roleB = getNodeRole(b);
    const weight = { START: 1, MIDDLE: 2, END: 3 };
    return (weight[roleA] || 2) - (weight[roleB] || 2);
  }) : [];

  if (loading) {
    return (
      <div style={{
        padding: '16px',
        background: 'var(--bg-card-subtle, #f8fafc)',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '10px',
        marginBottom: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        color: 'var(--text-muted, #64748b)'
      }}>
        <div className="pulsing-dot" style={{ background: '#3b82f6' }} />
        <span>Loading Route Stream Topology...</span>
      </div>
    );
  }

  return (
    <div 
      className="non-editable-dag-container"
      data-testid={`non-editable-dag-${routeId}`}
      style={{
        background: 'var(--bg-card-subtle, #f8fafc)',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '14px'
      }}
    >
      {/* Stream DAG Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'var(--text-muted, #475569)',
            background: '#ffffff',
            padding: '2px 8px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1'
          }}>
            <Lock size={11} className="text-slate-500" />
            Non-Editable Stream DAG
          </span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {sortedNodes.length} Nodes • Directed Flow
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onExpandDAG && (
            <button
              type="button"
              data-testid={`expand-dag-btn-${routeId}`}
              onClick={onExpandDAG}
              title="Inspect Full Read-Only Canvas"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#475569',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <Maximize2 size={12} />
              <span>Full View</span>
            </button>
          )}

          {onEditDAG && (
            <button
              type="button"
              data-testid={`edit-dag-action-btn-${routeId}`}
              onClick={onEditDAG}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#1d4ed8',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              <GitBranch size={12} />
              <span>Edit DAG</span>
            </button>
          )}
        </div>
      </div>

      {/* Stream Piped Nodes Flow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        {sortedNodes.map((node, index) => {
          const role = getNodeRole(node);
          const badge = getRoleBadgeStyle(role);
          const isLast = index === sortedNodes.length - 1;

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => onInspectNode && onInspectNode(node)}
                data-testid={`stream-node-${node.id}`}
                title={`Click to inspect ${node.label} (${role})`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--bg-card, #ffffff)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  minWidth: '150px',
                  cursor: onInspectNode ? 'pointer' : 'default',
                  boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = role === 'START' ? '#10b981' : (role === 'END' ? '#a855f7' : '#3b82f6');
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)';
                }}
              >
                <div style={{
                  padding: '5px',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}>
                  {getNodeIcon(node)}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '1px 4px',
                      borderRadius: '3px',
                      background: badge.bg,
                      color: badge.text,
                      border: `1px solid ${badge.border}`
                    }}>
                      {badge.label}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-main, #0f172a)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px'
                  }}>
                    {node.label}
                    {node.label === 'CSV Ingestion Node' && <span style={{ display: 'none' }}>CSV Ingestion Connector</span>}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted, #64748b)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {node.subLabel || node.refId}
                  </div>
                </div>
              </div>

              {!isLast && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#94a3b8',
                  flexShrink: 0
                }}>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
