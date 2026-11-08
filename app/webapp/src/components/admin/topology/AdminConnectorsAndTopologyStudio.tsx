import React, { useState, useEffect, useRef } from 'react';
import { 
  GitMerge, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Maximize2,
  Minimize2,
  Sparkles,
  Link2,
  FileSpreadsheet,
  Globe,
  Code2,
  Database,
  Cpu,
  ArrowRight,
  Lock,
  GitBranch
} from 'lucide-react';
import { 
  ProcessRoute, 
  TopologyNode, 
  TopologyEdge, 
  RouteTopology, 
  ConnectorDefinition, 
  ComponentInstance,
  StreamRole
} from '../../../types/process';
import { 
  fetchRouteTopology, 
  saveRouteTopology, 
  validateRouteTopology,
  fetchConnectorDefinitions,
  createCustomConnectorDefinition,
  deleteCustomConnectorDefinition,
  fetchComponents
} from '../../../services/apiClient';
import { ConnectorPalette } from './ConnectorPalette';
import { ConnectorConfigDrawer } from './ConnectorConfigDrawer';
import { CustomConnectorWizardModal } from './CustomConnectorWizardModal';
import { ConnectorDryRunModal } from './ConnectorDryRunModal';

interface Props {
  routes: ProcessRoute[];
  selectedRouteId?: string;
  onSelectRoute?: (routeId: string) => void;
  initialMode?: 'EDIT' | 'VIEW';
}

export const AdminConnectorsAndTopologyStudio: React.FC<Props> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  initialMode
}) => {
  const currentRouteId = selectedRouteId || (routes.length > 0 ? routes[0].id : 'customer-master-onboarding');

  const [activeRouteId, setActiveRouteId] = useState<string>(currentRouteId);
  const [studioMode, setStudioMode] = useState<'EDIT' | 'VIEW'>(initialMode || 'EDIT');
  const [topology, setTopology] = useState<RouteTopology | null>(null);
  const [connectorDefinitions, setConnectorDefinitions] = useState<ConnectorDefinition[]>([]);
  const [components, setComponents] = useState<ComponentInstance[]>([]);

  useEffect(() => {
    if (initialMode) {
      setStudioMode(initialMode);
    }
  }, [initialMode]);
  
  // UI Selection & Modals state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [dryRunTargetNode, setDryRunTargetNode] = useState<TopologyNode | null>(null);
  
  // Interactive Port Wiring State
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portId: string } | null>(null);
  
  // Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Validation & Save status feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Sync external routeId
  useEffect(() => {
    if (selectedRouteId && selectedRouteId !== activeRouteId) {
      setActiveRouteId(selectedRouteId);
    }
  }, [selectedRouteId]);

  // Load Definitions and Components
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [defs, comps] = await Promise.all([
          fetchConnectorDefinitions(),
          fetchComponents()
        ]);
        setConnectorDefinitions(defs);
        setComponents(comps);
      } catch (err) {
        console.error('Failed to load connector/component catalog', err);
      }
    };
    loadCatalog();
  }, []);

  // Load Route Topology
  useEffect(() => {
    const loadTopology = async () => {
      try {
        const top = await fetchRouteTopology(activeRouteId);
        setTopology(top);
        setSelectedNodeId(null);
        setConnectingFrom(null);
      } catch (err) {
        console.error('Failed to load route topology', err);
      }
    };
    loadTopology();
  }, [activeRouteId]);

  const handleRouteChange = (newRouteId: string) => {
    setActiveRouteId(newRouteId);
    if (onSelectRoute) {
      onSelectRoute(newRouteId);
    }
  };

  // Node Dragging Handlers
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (studioMode === 'VIEW') {
      setSelectedNodeId(nodeId);
      return;
    }
    const node = topology?.nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoomLevel;
    const mouseY = (e.clientY - rect.top) / zoomLevel;

    setDraggingNodeId(nodeId);
    setDragOffset({
      x: mouseX - node.x,
      y: mouseY - node.y
    });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (studioMode === 'VIEW' || !draggingNodeId || !topology || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / zoomLevel;
    const mouseY = (e.clientY - rect.top) / zoomLevel;

    const newX = Math.max(20, Math.round((mouseX - dragOffset.x) / 10) * 10);
    const newY = Math.max(20, Math.round((mouseY - dragOffset.y) / 10) * 10);

    setTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === draggingNodeId ? { ...n, x: newX, y: newY } : n)
      };
    });
  };

  const handleMouseUpCanvas = () => {
    setDraggingNodeId(null);
  };

  // Port Wiring Handlers
  const handlePortClick = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
    e.stopPropagation();
    if (studioMode === 'VIEW') {
      setSelectedNodeId(nodeId);
      return;
    }

    if (isOutput) {
      // Stream role check: END nodes cannot output
      const sourceNode = topology?.nodes.find(n => n.id === nodeId);
      const sourceRole = sourceNode?.streamRole || (sourceNode?.category === 'SINK' ? 'END' : (sourceNode?.category === 'SOURCE' ? 'START' : 'MIDDLE'));
      if (sourceRole === 'END') {
        setStatusMessage({ type: 'error', text: 'Stream invariant error: END connectors (terminals) cannot have outgoing connections.' });
        return;
      }

      // Start connecting
      setConnectingFrom({ nodeId, portId });
      setStatusMessage({ type: 'warning', text: `Selected output port (${portId}). Now click an input port on target node.` });
    } else {
      // Finish connecting if we have an output port selected
      if (connectingFrom && connectingFrom.nodeId !== nodeId) {
        // Stream role check: START nodes cannot have incoming connections
        const targetNode = topology?.nodes.find(n => n.id === nodeId);
        const targetRole = targetNode?.streamRole || (targetNode?.category === 'SOURCE' ? 'START' : (targetNode?.category === 'SINK' ? 'END' : 'MIDDLE'));
        if (targetRole === 'START') {
          setStatusMessage({ type: 'error', text: 'Stream invariant error: START connectors (sources) cannot receive incoming connections.' });
          setConnectingFrom(null);
          return;
        }

        const newEdge: TopologyEdge = {
          id: `edge-${Date.now()}`,
          fromNodeId: connectingFrom.nodeId,
          fromPort: connectingFrom.portId,
          toNodeId: nodeId,
          toPort: portId
        };

        setTopology(prev => {
          if (!prev) return prev;
          // Avoid duplicate edges between same ports
          const exists = prev.edges.some(e => 
            e.fromNodeId === newEdge.fromNodeId && 
            e.toNodeId === newEdge.toNodeId &&
            e.fromPort === newEdge.fromPort &&
            e.toPort === newEdge.toPort
          );
          if (exists) return prev;
          return {
            ...prev,
            edges: [...prev.edges, newEdge]
          };
        });

        setConnectingFrom(null);
        setStatusMessage({ type: 'success', text: 'Connected nodes successfully!' });
      } else {
        setConnectingFrom(null);
      }
    }
  };

  // Node Deletion
  const handleDeleteNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (studioMode === 'VIEW' || !topology) return;

    setTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== nodeId),
        edges: prev.edges.filter(e => e.fromNodeId !== nodeId && e.toNodeId !== nodeId)
      };
    });

    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Edge Deletion
  const handleDeleteEdge = (edgeId: string) => {
    if (studioMode === 'VIEW' || !topology) return;
    setTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        edges: prev.edges.filter(e => e.id !== edgeId)
      };
    });
  };

  // Add Connector from Palette
  const handleAddConnectorNode = (def: ConnectorDefinition) => {
    if (!topology) return;

    const baseOffset = (topology.nodes.length % 5) * 40;
    const spawnX = 260 + baseOffset;
    const spawnY = 120 + baseOffset;

    if (def.composite) {
      // Create paired Request and Response nodes
      const reqNodeId = `node-conn-req-${Date.now()}`;
      const resNodeId = `node-conn-res-${Date.now() + 1}`;
      const linkEdgeId = `edge-pair-${Date.now()}`;

      const isRest = def.protocol === 'REST_JSON';
      const reqNode: TopologyNode = {
        id: reqNodeId,
        type: 'CONNECTOR',
        refId: def.definitionId,
        label: isRest ? 'JSON Request Connector' : 'XML Request Connector',
        subLabel: `${def.name} [Inbound Request]`,
        category: def.category,
        streamRole: 'MIDDLE',
        x: spawnX,
        y: spawnY,
        inputPorts: ['in_records'],
        outputPorts: ['out_http_req'],
        config: isRest 
          ? { method: 'POST', endpointUrl: 'https://api.internal.corp/v1/enrich', authType: 'NONE' }
          : { soapVersion: '1.1', envelopeTemplate: '<soapenv:Envelope>...</soapenv:Envelope>' }
      };

      const resNode: TopologyNode = {
        id: resNodeId,
        type: 'CONNECTOR',
        refId: def.definitionId,
        label: isRest ? 'JSON Response Connector' : 'XML Response Connector',
        subLabel: `${def.name} [Outbound Response]`,
        category: def.category,
        streamRole: 'MIDDLE',
        x: spawnX + 260,
        y: spawnY,
        inputPorts: ['in_http_req'],
        outputPorts: ['out_enriched'],
        config: isRest 
          ? { expectedStatus: [200, 201], extractMappings: { tier: '$.data.tier' } }
          : { xpathQuery: '//tns:CustomerResult/tns:Status/text()' }
      };

      const pairEdge: TopologyEdge = {
        id: linkEdgeId,
        fromNodeId: reqNodeId,
        fromPort: 'out_http_req',
        toNodeId: resNodeId,
        toPort: 'in_http_req'
      };

      setTopology(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: [...prev.nodes, reqNode, resNode],
          edges: [...prev.edges, pairEdge]
        };
      });

      setSelectedNodeId(reqNodeId);
      setStatusMessage({ type: 'success', text: `Added composite paired ${def.name} nodes to canvas.` });

    } else {
      // Single Connector Node
      const isCsv = def.protocol === 'CSV';
      const nodeId = `node-conn-${Date.now()}`;
      const connRole = def.streamRole || (def.category === 'SOURCE' ? 'START' : (def.category === 'SINK' ? 'END' : 'MIDDLE'));
      const newNode: TopologyNode = {
        id: nodeId,
        type: 'CONNECTOR',
        refId: def.definitionId,
        label: def.name,
        subLabel: `${def.protocol} Connector`,
        category: def.category,
        streamRole: connRole,
        x: spawnX,
        y: spawnY,
        inputPorts: connRole === 'START' || def.category === 'SOURCE' ? [] : ['in_data'],
        outputPorts: connRole === 'END' || def.category === 'SINK' ? [] : ['out_data'],
        config: isCsv 
          ? {
              sourceType: 'MANUAL_UPLOAD',
              delimiter: ',',
              hasHeader: true,
              fields: [
                { id: 'f-1', name: 'id', type: 'INTEGER', required: true },
                { id: 'f-2', name: 'record_name', type: 'STRING', required: true }
              ]
            }
          : {}
      };

      setTopology(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: [...prev.nodes, newNode]
        };
      });

      setSelectedNodeId(nodeId);
      setStatusMessage({ type: 'success', text: `Added ${def.name} to canvas.` });
    }
  };

  // Add Component from Palette
  const handleAddComponentNode = (comp: ComponentInstance) => {
    if (!topology) return;
    const baseOffset = (topology.nodes.length % 5) * 40;
    const nodeId = `node-comp-${Date.now()}`;
    const compRole = comp.componentType === 'REPORT_WRITER' ? 'END' : (comp.componentType === 'SPLITTER' ? 'START' : 'MIDDLE');

    const newNode: TopologyNode = {
      id: nodeId,
      type: 'COMPONENT',
      refId: comp.instanceId,
      label: comp.name,
      subLabel: `${comp.componentType} Component`,
      category: comp.componentType,
      streamRole: compRole,
      x: 320 + baseOffset,
      y: 160 + baseOffset,
      inputPorts: compRole === 'START' || comp.componentType === 'SPLITTER' ? ['in_stream'] : ['in_records'],
      outputPorts: compRole === 'END' || comp.componentType === 'REPORT_WRITER' ? [] : ['out_records'],
      config: {
        instanceId: comp.instanceId,
        language: comp.language,
        executionMode: comp.executionMode
      }
    };

    setTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: [...prev.nodes, newNode]
      };
    });

    setSelectedNodeId(nodeId);
    setStatusMessage({ type: 'success', text: `Added component ${comp.name} to canvas.` });
  };

  // Save Node Config from Drawer
  const handleSaveNodeConfig = (nodeId: string, updatedConfig: Record<string, unknown>, updatedLabel?: string) => {
    setTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === nodeId ? { 
          ...n, 
          config: updatedConfig, 
          label: updatedLabel || n.label 
        } : n)
      };
    });
    setStatusMessage({ type: 'success', text: 'Connector settings updated.' });
  };

  // Validate Graph
  const handleValidateGraph = async () => {
    if (!topology) return;
    try {
      const res = await validateRouteTopology(activeRouteId, topology);
      if (res.valid) {
        setStatusMessage({ type: 'success', text: 'Topology graph is valid and ready for pipeline execution!' });
      } else {
        setStatusMessage({ type: 'warning', text: `Validation warnings: ${res.errors.join('; ')}` });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to complete graph validation.' });
    }
  };

  // Save Topology to Backend
  const handleSaveTopology = async () => {
    if (!topology) return;
    setSaving(true);
    try {
      await saveRouteTopology(activeRouteId, topology);
      setStatusMessage({ type: 'success', text: `Route topology successfully saved and compiled into Apache Camel!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Error saving topology: ${err?.message || 'Unknown error'}` });
    } finally {
      setSaving(false);
    }
  };

  // Create Custom Connector handler
  const handleSaveCustomConnector = async (newDef: Partial<ConnectorDefinition>) => {
    const created = await createCustomConnectorDefinition(newDef);
    setConnectorDefinitions(prev => [...prev, created]);
    setStatusMessage({ type: 'success', text: `Custom connector "${created.name}" created and added to palette!` });
  };

  // Delete Custom Connector
  const handleDeleteCustomConnector = async (id: string) => {
    await deleteCustomConnectorDefinition(id);
    setConnectorDefinitions(prev => prev.filter(d => d.definitionId !== id));
    setStatusMessage({ type: 'success', text: 'Custom connector deleted from catalog.' });
  };

  const selectedNode = topology?.nodes.find(n => n.id === selectedNodeId) || null;
  const selectedNodeDef = connectorDefinitions.find(d => d.definitionId === selectedNode?.refId);

  // SVG Edge Calculations with Smooth Bezier Curves
  const getNodeCenter = (nodeId: string, isOutput: boolean) => {
    const node = topology?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    // Node dimensions approx 220px width, 90px height
    const nodeWidth = 220;
    const nodeHeight = 85;
    return {
      x: isOutput ? node.x + nodeWidth : node.x,
      y: node.y + nodeHeight / 2
    };
  };

  return (
    <div 
      className="topology-studio-container"
      data-testid="connectors-topology-studio"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 120px)',
        minHeight: '680px',
        background: '#f8fafc',
        borderRadius: '16px',
        border: '1px solid var(--border-subtle, #e2e8f0)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))'
      }}
    >
      {/* Studio Top Control Bar */}
      <header style={{
        padding: '12px 20px',
        background: '#ffffff',
        borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Route Picker & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitMerge size={20} className="text-blue-600" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
              Route Connectors & Topology Designer
            </h2>
          </div>

          <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Route:</span>
            <select
              data-testid="topology-route-select"
              value={activeRouteId}
              onChange={(e) => handleRouteChange(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div style={{ height: '20px', width: '1px', background: '#e2e8f0' }} />

          {/* Mode Switcher: View Mode (Non-Editable DAG) vs Edit Mode (Editable DAG) */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              data-testid="mode-toggle-view"
              onClick={() => setStudioMode('VIEW')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                background: studioMode === 'VIEW' ? '#ffffff' : 'transparent',
                color: studioMode === 'VIEW' ? '#0f172a' : '#64748b',
                boxShadow: studioMode === 'VIEW' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Lock size={12} className={studioMode === 'VIEW' ? 'text-blue-600' : 'text-slate-400'} />
              <span>View Mode</span>
            </button>

            <button
              type="button"
              data-testid="mode-toggle-edit"
              onClick={() => setStudioMode('EDIT')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 700,
                border: 'none',
                borderRadius: '6px',
                background: studioMode === 'EDIT' ? '#ffffff' : 'transparent',
                color: studioMode === 'EDIT' ? '#1d4ed8' : '#64748b',
                boxShadow: studioMode === 'EDIT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              <GitBranch size={12} className={studioMode === 'EDIT' ? 'text-blue-600' : 'text-slate-400'} />
              <span>Edit Mode</span>
            </button>
          </div>

          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            background: studioMode === 'EDIT' ? '#eff6ff' : '#ecfdf5', 
            color: studioMode === 'EDIT' ? '#1d4ed8' : '#047857', 
            padding: '2px 8px', 
            borderRadius: '999px',
            border: `1px solid ${studioMode === 'EDIT' ? '#bfdbfe' : '#a7f3d0'}`
          }}>
            {studioMode === 'EDIT' ? '✏️ Editable DAG Studio' : '👁️ Non-Editable Stream DAG'}
          </span>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '2px' }}>
            <button
              type="button"
              title="Zoom Out"
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.1))}
              style={{ background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: '#475569' }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 600, padding: '0 6px', color: '#475569' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              title="Zoom In"
              onClick={() => setZoomLevel(prev => Math.min(1.4, prev + 0.1))}
              style={{ background: 'transparent', border: 'none', padding: '5px', cursor: 'pointer', color: '#475569' }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {studioMode === 'VIEW' ? (
            <button
              type="button"
              data-testid="switch-to-edit-btn"
              onClick={() => setStudioMode('EDIT')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary, #2563eb)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              <GitBranch size={14} /> Edit This DAG
            </button>
          ) : (
            <>
              <button
                type="button"
                data-testid="validate-topology-btn"
                onClick={handleValidateGraph}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#334155',
                  cursor: 'pointer'
                }}
              >
                <CheckCircle2 size={14} className="text-blue-500" /> Validate Graph
              </button>

              <button
                type="button"
                data-testid="save-topology-btn"
                onClick={handleSaveTopology}
                disabled={saving}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--primary, #2563eb)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                }}
              >
                <Save size={14} /> {saving ? 'Deploying...' : 'Save & Deploy Graph'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Non-Editable View Mode Notice */}
      {studioMode === 'VIEW' && (
        <div style={{
          padding: '8px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={14} className="text-slate-500" />
            <span><strong>Non-Editable DAG Stream View</strong> — Safe preview mode. Nodes and wiring are locked. Click any node to inspect parameters.</span>
          </div>
          <button
            type="button"
            data-testid="switch-to-edit-mode-btn"
            onClick={() => setStudioMode('EDIT')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              background: '#eff6ff',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              cursor: 'pointer'
            }}
          >
            <GitBranch size={12} />
            <span>Switch to Edit Mode</span>
          </button>
        </div>
      )}

      {/* Status Feedback Toast/Banner */}
      {statusMessage && (
        <div style={{
          padding: '8px 20px',
          fontSize: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusMessage.type === 'success' ? '#ecfdf5' : statusMessage.type === 'warning' ? '#fffbeb' : '#fef2f2',
          color: statusMessage.type === 'success' ? '#047857' : statusMessage.type === 'warning' ? '#b45309' : '#b91c1c',
          borderBottom: '1px solid rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Workspace Area (Palette + Interactive Canvas + Config Drawer) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        
        {/* Left Palette */}
        <ConnectorPalette
          connectorDefinitions={connectorDefinitions}
          components={components}
          onAddConnectorNode={handleAddConnectorNode}
          onAddComponentNode={handleAddComponentNode}
          onOpenCreateCustomConnector={() => setIsCustomModalOpen(true)}
          onDeleteCustomConnector={handleDeleteCustomConnector}
        />

        {/* Center Interactive SVG & HTML Canvas */}
        <div
          ref={canvasRef}
          data-testid="topology-canvas-viewport"
          onMouseMove={handleMouseMoveCanvas}
          onMouseUp={handleMouseUpCanvas}
          onClick={() => {
            setSelectedNodeId(null);
            setConnectingFrom(null);
          }}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            background: '#fafafa',
            backgroundImage: 'radial-gradient(#e2e8f0 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
            userSelect: 'none',
            cursor: connectingFrom ? 'crosshair' : 'default'
          }}
        >
          {/* Scalable Container */}
          <div style={{
            position: 'relative',
            minWidth: '2200px',
            minHeight: '1200px',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}>

            {/* SVG Layer for Bezier Curve Edges */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              <defs>
                <marker
                  id="edge-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                </marker>
              </defs>

              {topology?.edges.map((edge) => {
                const start = getNodeCenter(edge.fromNodeId, true);
                const end = getNodeCenter(edge.toNodeId, false);
                const deltaX = Math.abs(end.x - start.x) * 0.5;
                const pathD = `M ${start.x} ${start.y} C ${start.x + deltaX} ${start.y}, ${end.x - deltaX} ${end.y}, ${end.x} ${end.y}`;

                return (
                  <g key={edge.id} className="topology-edge-group">
                    {/* Shadow / Click Area */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                      style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(edge.id);
                      }}
                    />
                    {/* Visual Bezier Wire */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                      markerEnd="url(#edge-arrow)"
                      style={{ pointerEvents: 'none' }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* HTML Nodes Layer */}
            {topology?.nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isConnector = node.type === 'CONNECTOR';

              return (
                <div
                  key={node.id}
                  data-testid={`topology-node-${node.id}`}
                  onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${node.x}px`,
                    top: `${node.y}px`,
                    width: '220px',
                    minHeight: '85px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: `2px solid ${isSelected ? 'var(--primary, #2563eb)' : isConnector ? '#93c5fd' : '#86efac'}`,
                    boxShadow: isSelected ? '0 8px 24px rgba(37,99,235,0.2)' : '0 2px 8px rgba(15,23,42,0.06)',
                    padding: '10px 14px',
                    cursor: 'grab',
                    transition: 'border 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* Left (Input) Ports */}
                  {node.inputPorts.map((port) => (
                    <div
                      key={port}
                      title={`Input: ${port} (click to connect)`}
                      data-testid={`port-in-${node.id}`}
                      onClick={(e) => handlePortClick(e, node.id, port, false)}
                      style={{
                        position: 'absolute',
                        left: '-9px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: connectingFrom ? '#22c55e' : '#ffffff',
                        border: '3px solid #3b82f6',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                  ))}

                  {/* Right (Output) Ports */}
                  {node.outputPorts.map((port) => (
                    <div
                      key={port}
                      title={`Output: ${port} (click and drag to connect)`}
                      data-testid={`port-out-${node.id}`}
                      onClick={(e) => handlePortClick(e, node.id, port, true)}
                      style={{
                        position: 'absolute',
                        right: '-9px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: connectingFrom?.nodeId === node.id ? '#3b82f6' : '#ffffff',
                        border: '3px solid #22c55e',
                        cursor: 'pointer',
                        zIndex: 10
                      }}
                    />
                  ))}

                  {/* Node Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        letterSpacing: '0.04em', 
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isConnector ? '#dbeafe' : '#dcfce7',
                        color: isConnector ? '#1e40af' : '#166534'
                      }}>
                        {node.type}
                      </span>
                      {node.streamRole && (
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: node.streamRole === 'START' ? '#dcfce7' : node.streamRole === 'END' ? '#ffe4e6' : '#ede9fe',
                          color: node.streamRole === 'START' ? '#15803d' : node.streamRole === 'END' ? '#be123c' : '#6d28d9',
                          border: `1px solid ${node.streamRole === 'START' ? '#86efac' : node.streamRole === 'END' ? '#fecdd3' : '#ddd6fe'}`
                        }}>
                          {node.streamRole}
                        </span>
                      )}
                    </div>

                    {studioMode === 'EDIT' && (
                      <button
                        type="button"
                        title="Remove Node"
                        data-testid={`delete-node-${node.id}`}
                        onClick={(e) => handleDeleteNode(e, node.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: '2px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Node Content */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      padding: '5px', 
                      borderRadius: '6px', 
                      background: isConnector ? '#eff6ff' : '#f0fdf4',
                      color: isConnector ? '#2563eb' : '#16a34a'
                    }}>
                      {isConnector ? (
                        node.label.includes('CSV') ? <FileSpreadsheet size={15} /> :
                        node.label.includes('JSON') || node.label.includes('REST') ? <Globe size={15} /> :
                        node.label.includes('XML') || node.label.includes('SOAP') ? <Code2 size={15} /> :
                        <Database size={15} />
                      ) : (
                        <Cpu size={15} />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '12px', 
                        fontWeight: 700, 
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {node.label}
                      </h4>
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#64748b',
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {node.subLabel || node.category}
                      </span>
                    </div>
                  </div>

                  {/* Extra preview if CSV fields are present */}
                  {Array.isArray(node.config?.fields) && (
                    <div style={{ marginTop: '6px', fontSize: '10px', color: '#0369a1', background: '#f0f9ff', padding: '2px 6px', borderRadius: '4px' }}>
                      {node.config.fields.length} schema fields configured
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Configuration Drawer */}
        {selectedNode && (
          <ConnectorConfigDrawer
            node={selectedNode}
            definition={selectedNodeDef}
            onClose={() => setSelectedNodeId(null)}
            onSaveNodeConfig={handleSaveNodeConfig}
            onOpenDryRun={(targetNode) => setDryRunTargetNode(targetNode)}
          />
        )}
      </div>

      {/* Modals */}
      <CustomConnectorWizardModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSave={handleSaveCustomConnector}
      />

      <ConnectorDryRunModal
        node={dryRunTargetNode}
        onClose={() => setDryRunTargetNode(null)}
      />
    </div>
  );
};
