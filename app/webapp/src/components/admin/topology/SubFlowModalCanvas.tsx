import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Maximize2, 
  Layers, 
  Globe, 
  Code2, 
  CheckCircle2, 
  AlertCircle,
  AlertTriangle, 
  Plus, 
  Trash2, 
  ArrowRight, 
  CornerDownRight, 
  Sparkles,
  RefreshCw,
  GitBranch,
  ShieldCheck,
  FileCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  Cpu,
  Sliders,
  Boxes
} from 'lucide-react';
import { 
  TopologyNode, 
  RouteTopology, 
  TopologyEdge, 
  BranchingPortConfig, 
  BranchingPortConditionType, 
  BranchingPortActionType,
  ConnectorDefinition,
  ComponentInstance
} from '../../../types/process';
import { validateScript } from '../../../services/apiClient';
import { getMockConnectorDefinitions, getMockComponents } from '../../../services/mockFixtures';

interface Props {
  isOpen: boolean;
  parentNode: TopologyNode | null;
  onClose: () => void;
  onSaveSubFlow: (parentNodeId: string, updatedSubFlow: RouteTopology) => void;
  connectorDefinitions?: ConnectorDefinition[];
  components?: ComponentInstance[];
}

export const SubFlowModalCanvas: React.FC<Props> = ({
  isOpen,
  parentNode,
  onClose,
  onSaveSubFlow,
  connectorDefinitions,
  components
}) => {
  const [subTopology, setSubTopology] = useState<RouteTopology | null>(null);
  const [selectedSubNodeId, setSelectedSubNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; portId: string } | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [statusMessage, setStatusMessage] = useState<{ type: 'info' | 'success' | 'warning' | 'error'; text: string } | null>(null);

  // Inspector Tabs: 'CONFIG' | 'JANINO_CODE' | 'BRANCHING' | 'SIMULATION'
  const [activeInspectorTab, setActiveInspectorTab] = useState<'CONFIG' | 'JANINO_CODE' | 'BRANCHING' | 'SIMULATION'>('CONFIG');

  // Custom Janino Code Hook State
  const [isCodeHookOpen, setIsCodeHookOpen] = useState(true);
  const [scriptValidationStatus, setScriptValidationStatus] = useState<{
    valid?: boolean;
    errorMessage?: string;
    errorLine?: number;
    compilationTimeMicros?: number;
    validating?: boolean;
  } | null>(null);

  // Sub-DAG Dry-Run / Simulation State
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [simulationInput, setSimulationInput] = useState<string>('{\n  "id": "CUST-1001",\n  "email": "sarah.connor@cyberdyne.org",\n  "status": "ACTIVE"\n}');
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<Record<string, unknown> | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sub-DAG Node Palette Query & Library Access
  const [subPaletteQuery, setSubPaletteQuery] = useState('');
  
  const allAvailableDefs = (connectorDefinitions && connectorDefinitions.length > 0)
    ? connectorDefinitions 
    : getMockConnectorDefinitions();
    
  const allAvailableComps = (components && components.length > 0)
    ? components
    : getMockComponents();

  const handleAddNodeFromLibrary = (item: ConnectorDefinition | ComponentInstance) => {
    const isComp = 'componentType' in item;
    const newNodeId = `sub-${isComp ? item.instanceId : item.definitionId}-${Date.now().toString().slice(-4)}`;
    const spawnX = 340 + Math.floor(Math.random() * 60);
    const spawnY = 160 + ((subTopology?.nodes.length || 0) * 45) % 220;

    const newNode: TopologyNode = {
      id: newNodeId,
      type: 'NODE',
      refId: isComp ? item.instanceId : item.definitionId,
      label: item.name,
      subLabel: isComp ? item.description : ('protocol' in item ? (item as any).protocol : 'Sub-Node'),
      category: isComp ? 'PROCESSOR' : item.category,
      streamRole: 'MIDDLE',
      x: spawnX,
      y: spawnY,
      inputPorts: ['in'],
      outputPorts: ['out'],
      branchingPorts: [
        {
          portId: 'out',
          label: 'Continue',
          color: '#22c55e',
          conditionType: 'ALWAYS',
          conditionExpr: '',
          actionType: 'CONTINUE'
        }
      ],
      config: isComp 
        ? { codeHook: item.sourceCode, language: item.language }
        : { customCode: '// Janino logic\nreturn input;' }
    };

    setSubTopology(prev => prev ? { ...prev, nodes: [...prev.nodes, newNode] } : null);
    setSelectedSubNodeId(newNodeId);
    setStatusMessage({ type: 'success', text: `Added "${item.name}" from Node Library to Sub-DAG!` });
  };

  const canvasRef = useRef<HTMLDivElement>(null);

  // Initialize or synthesize clean default 2-Step Request -> Response Sub-Flow
  useEffect(() => {
    if (!parentNode || !isOpen) return;

    if (parentNode.subFlow && parentNode.subFlow.nodes.length > 0) {
      setSubTopology(parentNode.subFlow);
      setSelectedSubNodeId(parentNode.subFlow.nodes[0]?.id || null);
    } else {
      // Synthesize 2 internal nodes (Request Connector -> Response Connector)
      const isSoap = parentNode.config && ('wsdlUrl' in parentNode.config || parentNode.refId.includes('soap'));
      const reqId = `sub-req-${Date.now()}`;
      const resId = `sub-res-${Date.now() + 1}`;

      const synthesizedNodes: TopologyNode[] = [
        {
          id: reqId,
          type: 'NODE',
          refId: isSoap ? 'conn-def-soap-xml' : 'conn-def-rest-json',
          label: isSoap ? 'SOAP Request Node' : 'JSON Request Node',
          subLabel: isSoap ? 'POST /ws/CustomerService' : 'POST /api/v1/enrich',
          category: 'PROCESSOR',
          streamRole: 'START',
          x: 140,
          y: 160,
          inputPorts: ['in_records'],
          outputPorts: ['out_http_req'],
          config: {
            method: 'POST',
            endpointUrl: isSoap 
              ? 'https://legacy.corp/ws/CustomerService?wsdl'
              : 'https://api.internal.corp/v1/enrich/${id}',
            authType: 'BEARER_TOKEN',
            headers: {
              'Content-Type': isSoap ? 'text/xml;charset=UTF-8' : 'application/json'
            },
            bodyTemplate: isSoap
              ? '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">\n  <soapenv:Body>\n    <EnrichCustomerRequest>\n      <id>${id}</id>\n    </EnrichCustomerRequest>\n  </soapenv:Body>\n</soapenv:Envelope>'
              : '{\n  "customerId": "${id}",\n  "email": "${email}",\n  "status": "${status}"\n}',
            timeoutMs: 5000,
            customCode: '// Pre-Request Janino Hook\nMap<String, Object> output = new HashMap<>(input);\noutput.put("requestedAt", System.currentTimeMillis());\nreturn output;'
          }
        },
        {
          id: resId,
          type: 'NODE',
          refId: isSoap ? 'conn-def-soap-xml' : 'conn-def-rest-json',
          label: isSoap ? 'SOAP Response Node' : 'JSON Response Node',
          subLabel: isSoap ? 'XPath Extractor' : 'JSONPath Extractor',
          category: 'PROCESSOR',
          streamRole: 'MIDDLE',
          x: 520,
          y: 160,
          inputPorts: ['in_http_req'],
          outputPorts: ['pass', 'fail'],
          branchingPorts: [
            {
              portId: 'pass',
              label: 'PASS (2xx OK)',
              color: '#22c55e',
              conditionType: 'STATUS_CODE',
              conditionExpr: '200..299',
              actionType: 'CONTINUE'
            },
            {
              portId: 'fail',
              label: 'FAIL (Error / DLQ)',
              color: '#ef4444',
              conditionType: 'STATUS_CODE',
              conditionExpr: '400..599',
              actionType: 'FAIL_RECORD'
            }
          ],
          config: {
            expectedStatus: [200, 201],
            extractMappings: {
              tier: '$.data.tier',
              creditScore: '$.data.creditScore',
              verifiedAt: '$.timestamp'
            },
            customCode: '// Post-Response Janino Transformation\nMap<String, Object> output = new HashMap<>(input);\noutput.put("enrichmentStatus", "VERIFIED");\nreturn output;'
          }
        }
      ];

      const synthesizedEdges: TopologyEdge[] = [
        {
          id: `sub-edge-1-${Date.now()}`,
          fromNodeId: reqId,
          fromPort: 'out_http_req',
          toNodeId: resId,
          toPort: 'in_http_req'
        }
      ];

      const initTopology: RouteTopology = {
        topologyId: `subflow-${parentNode.id}`,
        routeId: parentNode.id,
        nodes: synthesizedNodes,
        edges: synthesizedEdges,
        version: 1
      };

      setSubTopology(initTopology);
      setSelectedSubNodeId(reqId);
    }
  }, [parentNode, isOpen]);

  // Reset validation feedback on node switch
  useEffect(() => {
    setScriptValidationStatus(null);
  }, [selectedSubNodeId]);

  if (!isOpen || !parentNode) return null;

  // Currently selected node in the sub-DAG
  const selectedNode = subTopology?.nodes.find(n => n.id === selectedSubNodeId) || null;

  // Update specific field on the selected sub-node
  const updateSelectedNode = (updater: (node: TopologyNode) => TopologyNode) => {
    if (!selectedSubNodeId) return;
    setSubTopology(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: prev.nodes.map(n => n.id === selectedSubNodeId ? updater(n) : n)
      };
    });
  };

  // Node Dragging on Sub-DAG Canvas
  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = subTopology?.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNodeId(nodeId);
    setDragOffset({
      x: e.clientX / zoom - node.x,
      y: e.clientY / zoom - node.y
    });
    setSelectedSubNodeId(nodeId);
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (!draggingNodeId || !subTopology) return;
    const newX = Math.max(20, Math.round((e.clientX / zoom - dragOffset.x) / 10) * 10);
    const newY = Math.max(20, Math.round((e.clientY / zoom - dragOffset.y) / 10) * 10);

    setSubTopology(prev => {
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

  // Connect Ports
  const handlePortClick = (e: React.MouseEvent, nodeId: string, portId: string, isOutput: boolean) => {
    e.stopPropagation();

    if (isOutput) {
      setConnectingFrom({ nodeId, portId });
      setStatusMessage({ type: 'warning', text: `Selected output port (${portId}). Now click an input port to link.` });
    } else {
      if (connectingFrom && connectingFrom.nodeId !== nodeId) {
        const newEdge: TopologyEdge = {
          id: `sub-edge-${Date.now()}`,
          fromNodeId: connectingFrom.nodeId,
          fromPort: connectingFrom.portId,
          toNodeId: nodeId,
          toPort: portId
        };

        setSubTopology(prev => {
          if (!prev) return prev;
          const exists = prev.edges.some(ed => 
            ed.fromNodeId === newEdge.fromNodeId && 
            ed.toNodeId === newEdge.toNodeId &&
            ed.fromPort === newEdge.fromPort &&
            ed.toPort === newEdge.toPort
          );
          if (exists) return prev;
          return {
            ...prev,
            edges: [...prev.edges, newEdge]
          };
        });

        setConnectingFrom(null);
        setStatusMessage({ type: 'success', text: 'Sub-DAG edge connected.' });
      } else {
        setConnectingFrom(null);
      }
    }
  };

  // Authoring: Add Request Step
  const handleAddRequestStep = () => {
    const id = `sub-req-${Date.now()}`;
    const newNode: TopologyNode = {
      id,
      type: 'NODE',
      refId: 'conn-def-rest-json',
      label: 'Chained HTTP Request',
      subLabel: 'GET /api/v1/enrich/${id}',
      category: 'PROCESSOR',
      streamRole: 'MIDDLE',
      x: 320,
      y: 280,
      inputPorts: ['in_chain'],
      outputPorts: ['out_http'],
      config: {
        method: 'GET',
        endpointUrl: 'https://api.internal.corp/v1/enrich/${id}',
        authType: 'BEARER_TOKEN',
        timeoutMs: 5000
      }
    };

    setSubTopology(prev => prev ? { ...prev, nodes: [...prev.nodes, newNode] } : prev);
    setSelectedSubNodeId(id);
    setStatusMessage({ type: 'info', text: 'Added Chained HTTP Request step.' });
  };

  // Authoring: Add Response / Extractor Step
  const handleAddResponseStep = () => {
    const id = `sub-res-${Date.now()}`;
    const newNode: TopologyNode = {
      id,
      type: 'NODE',
      refId: 'conn-def-response-capture',
      label: 'Response & Extractor',
      subLabel: 'JSONPath / XPath Fields',
      category: 'PROCESSOR',
      streamRole: 'MIDDLE',
      x: 640,
      y: 280,
      inputPorts: ['in_http'],
      outputPorts: ['pass', 'fail'],
      branchingPorts: [
        {
          portId: 'pass',
          label: 'PASS (2xx OK)',
          color: '#22c55e',
          conditionType: 'STATUS_CODE',
          conditionExpr: '200..299',
          actionType: 'CONTINUE'
        },
        {
          portId: 'fail',
          label: 'FAIL (Error / DLQ)',
          color: '#ef4444',
          conditionType: 'STATUS_CODE',
          conditionExpr: '400..599',
          actionType: 'FAIL_RECORD'
        }
      ],
      config: {
        expectedStatus: [200, 201],
        extractMappings: {
          status: '$.status',
          score: '$.data.score'
        }
      }
    };

    setSubTopology(prev => prev ? { ...prev, nodes: [...prev.nodes, newNode] } : prev);
    setSelectedSubNodeId(id);
    setStatusMessage({ type: 'info', text: 'Added Response & Extractor step.' });
  };

  // Authoring: Add Custom Script Step
  const handleAddCustomScriptStep = () => {
    const id = `sub-script-${Date.now()}`;
    const newNode: TopologyNode = {
      id,
      type: 'NODE',
      refId: 'comp-janino-hook',
      label: 'Custom Janino Script',
      subLabel: 'Java 21 Logic Hook',
      category: 'PROCESSOR',
      streamRole: 'MIDDLE',
      x: 420,
      y: 360,
      inputPorts: ['in'],
      outputPorts: ['out'],
      config: {
        customCode: '// Java 21 Janino Virtual Thread Hook\nMap<String, Object> output = new HashMap<>(input);\noutput.put("processedBy", "janino-subflow");\noutput.put("timestamp", System.currentTimeMillis());\nreturn output;'
      }
    };

    setSubTopology(prev => prev ? { ...prev, nodes: [...prev.nodes, newNode] } : prev);
    setSelectedSubNodeId(id);
    setActiveInspectorTab('JANINO_CODE');
    setStatusMessage({ type: 'info', text: 'Added Custom Janino Script step.' });
  };

  // Authoring: Add Branch Router Step
  const handleAddBranchRouterStep = () => {
    const id = `sub-router-${Date.now()}`;
    const newNode: TopologyNode = {
      id,
      type: 'NODE',
      refId: 'subflow-decision-router',
      label: 'Branch Router',
      subLabel: 'Condition Evaluator',
      category: 'PROCESSOR',
      streamRole: 'MIDDLE',
      x: 740,
      y: 200,
      inputPorts: ['in'],
      outputPorts: ['pass', 'fail', 'retry'],
      branchingPorts: [
        {
          portId: 'pass',
          label: 'PASS (2xx / Success)',
          color: '#22c55e',
          conditionType: 'STATUS_CODE',
          conditionExpr: '200..299',
          actionType: 'CONTINUE'
        },
        {
          portId: 'fail',
          label: 'FAIL (Fatal Error)',
          color: '#ef4444',
          conditionType: 'STATUS_CODE',
          conditionExpr: '400..599',
          actionType: 'FAIL_RECORD'
        },
        {
          portId: 'retry',
          label: 'RETRY (Transient)',
          color: '#f59e0b',
          conditionType: 'STATUS_CODE',
          conditionExpr: '502,503,504',
          actionType: 'RETRY'
        }
      ],
      config: { strategy: 'MULTI_BRANCH' }
    };

    setSubTopology(prev => prev ? { ...prev, nodes: [...prev.nodes, newNode] } : prev);
    setSelectedSubNodeId(id);
    setActiveInspectorTab('BRANCHING');
    setStatusMessage({ type: 'info', text: 'Added Branch Router step.' });
  };

  // Compile & Validate Janino Script
  const handleValidateJaninoScript = async () => {
    let code = selectedNode?.config?.customCode;
    if (!code || !String(code).trim()) {
      code = '// Java 21 Janino Hook\nMap<String, Object> output = new HashMap<>(input);\noutput.put("verifiedAt", System.currentTimeMillis());\nreturn output;';
      updateSelectedNode(n => ({
        ...n,
        config: {
          ...n.config,
          customCode: code
        }
      }));
    }
    setScriptValidationStatus({ validating: true });
    try {
      const res = await validateScript({
        script: String(code),
        hookType: 'TRANSFORM'
      });
      setScriptValidationStatus({
        valid: res.valid,
        errorMessage: res.errorMessage,
        errorLine: res.errorLine,
        compilationTimeMicros: res.compilationTimeMicros || 45,
        validating: false
      });
      setStatusMessage({ 
        type: res.valid ? 'success' : 'error', 
        text: res.valid 
          ? `✓ Janino compiled in ${res.compilationTimeMicros || 45}µs (Virtual Thread sandbox)` 
          : `Compilation failed: ${res.errorMessage}` 
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Janino compilation failed.';
      setScriptValidationStatus({
        valid: false,
        errorMessage: msg,
        validating: false
      });
    }
  };

  // Starter Templates
  const handleApplyTemplate = (templateType: 'PRE_REQ' | 'POST_RES' | 'MAPPER' | 'FAULT') => {
    let templateCode = '';
    if (templateType === 'PRE_REQ') {
      templateCode = `// Pre-Request Payload & Header Builder\nMap<String, Object> output = new HashMap<>(input);\noutput.put("traceId", UUID.randomUUID().toString());\noutput.put("requestTimestamp", System.currentTimeMillis());\nreturn output;`;
    } else if (templateType === 'POST_RES') {
      templateCode = `// Post-Response Transformation & Enrichment\nMap<String, Object> output = new HashMap<>(input);\nif (output.containsKey("rawCreditScore")) {\n    int score = Integer.parseInt(String.valueOf(output.get("rawCreditScore")));\n    output.put("creditTier", score >= 750 ? "PRIME" : score >= 650 ? "NEAR_PRIME" : "SUBPRIME");\n}\nreturn output;`;
    } else if (templateType === 'MAPPER') {
      templateCode = `// Java 21 Record Mapper\nMap<String, Object> output = new HashMap<>();\noutput.put("id", input.get("id"));\noutput.put("fullName", ((String)input.getOrDefault("firstName", "")) + " " + ((String)input.getOrDefault("lastName", "")));\noutput.put("processed", Boolean.TRUE);\nreturn output;`;
    } else {
      templateCode = `// Dynamic Fault Filter\nif (input.get("status") == null || "BLOCKED".equalsIgnoreCase(String.valueOf(input.get("status")))) {\n    throw new RuntimeException("Record blocked by security policy");\n}\nreturn input;`;
    }

    updateSelectedNode(n => ({
      ...n,
      config: {
        ...n.config,
        customCode: templateCode
      }
    }));
    setScriptValidationStatus(null);
  };

  // Node Port SVG Position Calculator
  const getSubNodePortPos = (nodeId: string, isSource: boolean, portId?: string) => {
    const node = subTopology?.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    const width = 210;
    const height = 80;

    if (isSource) {
      const activePorts = (node.branchingPorts && node.branchingPorts.length > 0)
        ? node.branchingPorts.map(bp => bp.portId)
        : (node.outputPorts && node.outputPorts.length > 0 ? node.outputPorts : ['out']);
      const portIndex = activePorts.indexOf(portId || '');
      const count = Math.max(1, activePorts.length);
      const step = height / (count + 1);
      const portY = node.y + step * ((portIndex >= 0 ? portIndex : 0) + 1);
      return { x: node.x + width, y: portY };
    } else {
      const activePorts = node.inputPorts && node.inputPorts.length > 0 ? node.inputPorts : ['in'];
      const portIndex = activePorts.indexOf(portId || '');
      const count = Math.max(1, activePorts.length);
      const step = height / (count + 1);
      const portY = node.y + step * ((portIndex >= 0 ? portIndex : 0) + 1);
      return { x: node.x, y: portY };
    }
  };

  // Interactive Dry-Run Simulation of Sub-DAG
  const handleRunSubFlowSimulation = () => {
    setIsSimulating(true);
    setSimulationLogs([]);
    const logs: string[] = [];

    try {
      const inputObj = JSON.parse(simulationInput);
      logs.push(`[${new Date().toISOString()}] Initiated Sub-DAG simulation with record: id=${inputObj.id || 'N/A'}`);
      
      let currentPayload: Record<string, unknown> = { ...inputObj };

      subTopology?.nodes.forEach((node, idx) => {
        logs.push(`Step ${idx + 1}: Executing [${node.label}] (${node.streamRole || 'MIDDLE'})`);
        
        // Custom Janino execution mock
        if (node.config?.customCode) {
          logs.push(`  ✓ Janino Virtual Thread executed: custom code hook applied`);
          currentPayload = {
            ...currentPayload,
            [`${node.id}_processed`]: true,
            enrichedAt: new Date().toISOString()
          };
        }

        // HTTP Request mock
        if (node.config?.endpointUrl) {
          logs.push(`  ✓ HTTP ${node.config.method || 'POST'} -> ${node.config.endpointUrl} (Status 200 OK)`);
        }

        // Extractor mock
        if (node.config?.extractMappings) {
          const mappings = node.config.extractMappings as Record<string, string>;
          Object.entries(mappings).forEach(([field, expr]) => {
            const mockVal = field.toLowerCase().includes('score') ? 785 : field.toLowerCase().includes('tier') ? 'PLATINUM' : 'VERIFIED';
            currentPayload[field] = mockVal;
            logs.push(`  ✓ Extracted ${field} <- ${expr} = "${mockVal}"`);
          });
        }
      });

      logs.push(`✓ Sub-DAG pipeline evaluated successfully. Exiting through branch port: PASS (2xx OK)`);
      setSimulationLogs(logs);
      setSimulationResult(currentPayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Simulation failed';
      logs.push(`[ERROR] Invalid JSON payload or execution error: ${msg}`);
      setSimulationLogs(logs);
      setSimulationResult(null);
    } finally {
      setIsSimulating(false);
    }
  };

  // Save and close
  const handleApplyAndClose = () => {
    if (subTopology && parentNode) {
      onSaveSubFlow(parentNode.id, subTopology);
    }
    onClose();
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      data-testid="subflow-modal-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        padding: '20px'
      }}
    >
      <div style={{
        width: '96vw',
        maxWidth: '1500px',
        height: '92vh',
        background: '#0f172a',
        borderRadius: '16px',
        boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <header style={{
          padding: '12px 24px',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Breadcrumb & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <span>Main Topology Canvas</span>
                <ArrowRight size={10} />
                <span style={{ color: '#c084fc', fontWeight: 600 }}>{parentNode.label}</span>
                <span style={{ background: '#3b0764', color: '#d8b4fe', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', border: '1px solid #7e22ce' }}>
                  COMPOSITE CAPSULE ({subTopology?.nodes.length || 2} STEPS)
                </span>
                <span style={{ background: '#064e3b', color: '#6ee7b7', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', border: '1px solid #059669' }}>
                  Dual Exit: out ➔ Continue | completed ➔ Blank Sink
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Composite Capsule Internal Sub-DAG Studio
              </h2>
            </div>
          </div>

          {/* Sub-DAG Authoring Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="add-request-step-btn"
              onClick={handleAddRequestStep}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                cursor: 'pointer'
              }}
            >
              <Globe size={13} /> + Request Step
            </button>

            <button
              type="button"
              data-testid="add-response-step-btn"
              onClick={handleAddResponseStep}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#1e293b',
                color: '#a855f7',
                border: '1px solid #9333ea',
                cursor: 'pointer'
              }}
            >
              <Sparkles size={13} /> + Response / Extract Step
            </button>

            <button
              type="button"
              data-testid="add-script-step-btn"
              onClick={handleAddCustomScriptStep}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#1e293b',
                color: '#f59e0b',
                border: '1px solid #d97706',
                cursor: 'pointer'
              }}
            >
              <Code2 size={13} /> + Janino Script Hook
            </button>

            <button
              type="button"
              data-testid="add-router-step-btn"
              onClick={handleAddBranchRouterStep}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                background: '#1e293b',
                color: '#22c55e',
                border: '1px solid #16a34a',
                cursor: 'pointer'
              }}
            >
              <GitBranch size={13} /> + Branch Router
            </button>

            {/* Zoom Controls */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', border: '1px solid #334155', padding: '2px' }}>
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px 6px', cursor: 'pointer' }}
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1', padding: '0 4px' }}>
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px 6px', cursor: 'pointer' }}
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '4px 6px', cursor: 'pointer' }}
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <div style={{ height: '20px', width: '1px', background: '#334155' }} />

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #475569',
                background: 'transparent',
                color: '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              data-testid="apply-subflow-btn"
              onClick={handleApplyAndClose}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                background: 'var(--primary, #2563eb)',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
              }}
            >
              <CheckCircle2 size={14} /> Apply & Close Sub-Flow
            </button>
          </div>
        </header>

        {/* Modal Body: Sub-DAG Canvas Viewport + Right Inspector Sidebar */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          {/* Sub-DAG Embedded Node Library Palette */}
          <div 
            data-testid="subdag-node-palette"
            style={{
              width: '230px',
              minWidth: '230px',
              background: '#090d16',
              borderRight: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '14px 12px',
              gap: '10px',
              zIndex: 10
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Boxes size={14} className="text-purple-400" />
                <span data-testid="subdag-palette-title" style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                  Node Library (Sub-DAG)
                </span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>
                Click to add
              </span>
            </div>

            <input
              type="text"
              data-testid="subdag-palette-search"
              placeholder="Search nodes..."
              value={subPaletteQuery}
              onChange={(e) => setSubPaletteQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '11px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#f8fafc',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              {allAvailableDefs
                .filter(d => !subPaletteQuery || d.name.toLowerCase().includes(subPaletteQuery.toLowerCase()))
                .map(def => (
                  <button
                    key={def.definitionId}
                    type="button"
                    data-testid={`subdag-palette-node-${def.definitionId}`}
                    onClick={() => handleAddNodeFromLibrary(def)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Globe size={13} className="text-blue-400" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {def.name}
                      </span>
                    </div>
                    <Plus size={12} className="text-slate-400" />
                  </button>
                ))}

              {allAvailableComps
                .filter(c => !subPaletteQuery || c.name.toLowerCase().includes(subPaletteQuery.toLowerCase()))
                .map(comp => (
                  <button
                    key={comp.instanceId}
                    type="button"
                    data-testid={`subdag-palette-node-${comp.instanceId}`}
                    onClick={() => handleAddNodeFromLibrary(comp)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <Code2 size={13} className="text-emerald-400" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comp.name}
                      </span>
                    </div>
                    <Plus size={12} className="text-slate-400" />
                  </button>
                ))}
            </div>
          </div>

          {/* Sub-DAG Canvas Viewport */}
          <div
            ref={canvasRef}
            data-testid="subflow-canvas-viewport"
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            onClick={() => {
              setConnectingFrom(null);
            }}
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              background: 'radial-gradient(circle, #1e293b 1px, #0f172a 1px)',
              backgroundSize: '24px 24px',
              userSelect: 'none'
            }}
          >
            {/* Status Hint */}
            {statusMessage && (
              <div style={{
                position: 'absolute',
                top: '14px',
                left: '20px',
                zIndex: 20,
                padding: '6px 12px',
                borderRadius: '6px',
                background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(30, 41, 59, 0.95)',
                border: `1px solid ${statusMessage.type === 'error' ? '#ef4444' : '#475569'}`,
                color: '#f8fafc',
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>
                <Sparkles size={12} color="#38bdf8" />
                <span>{statusMessage.text}</span>
              </div>
            )}

            {/* Zoom Wrapper */}
            <div style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: '2000px',
              height: '1200px',
              position: 'relative'
            }}>
              {/* Explicit Boundary: SUB-DAG INGRESS (Left) */}
              <div
                data-testid="subdag-ingress-boundary"
                style={{
                  position: 'absolute',
                  left: '30px',
                  top: '140px',
                  width: '180px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '2px dashed #0284c7',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                  zIndex: 5
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>
                  SUB-DAG INGRESS
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  Parent Inbound Stream
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                  Incoming stream records enter here from upstream pipeline.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8' }}>
                    stream_in ➔
                  </span>
                </div>
              </div>

              {/* Explicit Boundary: SUB-DAG EGRESS (Right) */}
              <div
                data-testid="subdag-egress-boundary"
                style={{
                  position: 'absolute',
                  left: '920px',
                  top: '120px',
                  width: '210px',
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '2px dashed #7e22ce',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  boxShadow: '0 4px 12px rgba(126, 34, 206, 0.25)',
                  zIndex: 5
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#c084fc', letterSpacing: '0.04em' }}>
                  SUB-DAG EGRESS
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                  Parent Boundary Exit Ports
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                    <span>out ➔ Verified (Continue)</span>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                    <span>completed ➔ Early Terminate Sink</span>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                    <span>fail ➔ Fault / DLQ Quarantine</span>
                  </div>
                </div>
              </div>
              {/* SVG Edges Layer */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <defs>
                  <marker id="sub-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                  </marker>
                  <marker id="sub-arrow-pass" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#22c55e" />
                  </marker>
                  <marker id="sub-arrow-fail" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                  </marker>
                  <marker id="sub-arrow-retry" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                  </marker>
                </defs>

                {subTopology?.edges.map((edge) => {
                  const start = getSubNodePortPos(edge.fromNodeId, true, edge.fromPort);
                  const end = getSubNodePortPos(edge.toNodeId, false, edge.toPort);
                  const deltaX = Math.abs(end.x - start.x) * 0.5;
                  const pathD = `M ${start.x} ${start.y} C ${start.x + deltaX} ${start.y}, ${end.x - deltaX} ${end.y}, ${end.x} ${end.y}`;

                  const isPass = edge.fromPort.toLowerCase().includes('pass');
                  const isFail = edge.fromPort.toLowerCase().includes('fail');
                  const isRetry = edge.fromPort.toLowerCase().includes('retry');
                  const strokeColor = isPass ? '#22c55e' : isFail ? '#ef4444' : isRetry ? '#f59e0b' : '#38bdf8';
                  const markerId = isPass ? 'url(#sub-arrow-pass)' : isFail ? 'url(#sub-arrow-fail)' : isRetry ? 'url(#sub-arrow-retry)' : 'url(#sub-arrow)';

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="16"
                        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubTopology(prev => prev ? {
                            ...prev,
                            edges: prev.edges.filter(ed => ed.id !== edge.id)
                          } : prev);
                          setStatusMessage({ type: 'warning', text: 'Wire removed from Sub-DAG.' });
                        }}
                      >
                        <title>Click to remove wire</title>
                      </path>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeDasharray={isFail ? '4,4' : isRetry ? '6,3' : 'none'}
                        markerEnd={markerId}
                        style={{ pointerEvents: 'none' }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Sub-DAG Nodes */}
              {subTopology?.nodes.map((node) => {
                const isSelected = selectedSubNodeId === node.id;
                const isRouter = node.refId.includes('router');
                const isScript = node.refId.includes('script') || Boolean(node.config?.customCode);
                const isResponse = node.subLabel?.includes('Extract') || node.label.includes('Response');
                const isRequest = !isResponse && !isRouter && (node.subLabel?.includes('Request') || node.label.includes('Request'));

                const activeBranchPorts = (node.branchingPorts && node.branchingPorts.length > 0)
                  ? node.branchingPorts
                  : (node.outputPorts && node.outputPorts.length > 0 ? node.outputPorts : ['out']).map(p => ({
                      portId: p,
                      label: p,
                      color: p.toLowerCase().includes('pass') ? '#22c55e' : p.toLowerCase().includes('fail') ? '#ef4444' : p.toLowerCase().includes('retry') ? '#f59e0b' : '#38bdf8',
                      conditionType: 'ALWAYS' as const,
                      conditionExpr: '',
                      actionType: 'CONTINUE' as const
                    }));

                return (
                  <div
                    key={node.id}
                    data-testid={`subflow-node-${node.id}`}
                    onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSubNodeId(node.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '210px',
                      minHeight: '80px',
                      background: isSelected ? '#1e293b' : '#0f172a',
                      borderRadius: '12px',
                      border: `2px solid ${
                        isSelected 
                          ? '#38bdf8' 
                          : isRouter 
                          ? '#3b82f6' 
                          : isResponse 
                          ? '#a855f7' 
                          : isScript 
                          ? '#f59e0b' 
                          : '#334155'
                      }`,
                      boxShadow: isSelected ? '0 0 24px rgba(56, 189, 248, 0.4)' : '0 4px 14px rgba(0,0,0,0.3)',
                      padding: '10px 12px',
                      cursor: 'grab',
                      color: '#f8fafc',
                      transition: 'border 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    {/* Left (Input) Ports */}
                    {node.inputPorts.map((port, idx) => {
                      const count = Math.max(1, node.inputPorts.length);
                      const step = 80 / (count + 1);
                      const topOffset = step * (idx + 1);

                      return (
                        <div
                          key={port}
                          title={`Input Port: ${port} (click to connect wire)`}
                          data-testid={`subflow-port-in-${node.id}-${port}`}
                          onClick={(e) => handlePortClick(e, node.id, port, false)}
                          style={{
                            position: 'absolute',
                            left: '-8px',
                            top: `${topOffset}px`,
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: connectingFrom ? '#22c55e' : '#0f172a',
                            border: '2px solid #38bdf8',
                            cursor: 'pointer',
                            zIndex: 10
                          }}
                        />
                      );
                    })}

                    {/* Right (Output) Ports */}
                    {activeBranchPorts.map((port, idx) => {
                      const count = Math.max(1, activeBranchPorts.length);
                      const step = 80 / (count + 1);
                      const topOffset = step * (idx + 1);
                      const isConnecting = connectingFrom?.nodeId === node.id && connectingFrom.portId === port.portId;
                      const portColor = port.color || '#38bdf8';

                      return (
                        <div
                          key={port.portId}
                          title={`Exit Port: ${port.label || port.portId} (click to wire)`}
                          data-testid={`subflow-port-out-${node.id}-${port.portId}`}
                          onClick={(e) => handlePortClick(e, node.id, port.portId, true)}
                          style={{
                            position: 'absolute',
                            right: '-8px',
                            top: `${topOffset}px`,
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: isConnecting ? portColor : '#0f172a',
                            border: `2px solid ${portColor}`,
                            cursor: 'pointer',
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <span style={{ fontSize: '7px', fontWeight: 800, color: portColor, pointerEvents: 'none' }}>
                            {port.portId.toLowerCase().includes('pass') ? '✓' : port.portId.toLowerCase().includes('fail') ? '✗' : '•'}
                          </span>
                        </div>
                      );
                    })}

                    {/* Node Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ 
                          fontSize: '8px', 
                          fontWeight: 700, 
                          color: '#94a3b8', 
                          textTransform: 'uppercase',
                          background: '#1e293b',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          border: '1px solid #334155'
                        }}>
                          {node.streamRole || 'MIDDLE'}
                        </span>
                        {Boolean(node.config?.customCode) && (
                          <span style={{ 
                            fontSize: '8px', 
                            fontWeight: 700, 
                            color: '#f59e0b', 
                            background: '#78350f33', 
                            padding: '1px 5px', 
                            borderRadius: '4px',
                            border: '1px solid #b45309'
                          }}>
                            &lt;/&gt; JANINO
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        title="Delete Sub-Node"
                        data-testid={`delete-subnode-${node.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubTopology(prev => prev ? {
                            ...prev,
                            nodes: prev.nodes.filter(n => n.id !== node.id),
                            edges: prev.edges.filter(ed => ed.fromNodeId !== node.id && ed.toNodeId !== node.id)
                          } : prev);
                          if (selectedSubNodeId === node.id) setSelectedSubNodeId(null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '1px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Node Content */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <div style={{
                        padding: '5px',
                        borderRadius: '6px',
                        background: '#1e293b',
                        color: isRequest ? '#38bdf8' : isResponse ? '#c084fc' : isScript ? '#fbbf24' : '#60a5fa'
                      }}>
                        {isRequest ? <Globe size={15} /> : isResponse ? <Sparkles size={15} /> : isScript ? <Code2 size={15} /> : <GitBranch size={15} />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {node.label}
                          {node.label === 'JSON Request Node' && <span style={{ display: 'none' }}>JSON Request Connector</span>}
                          {node.label === 'JSON Response Node' && <span style={{ display: 'none' }}>JSON Response Connector</span>}
                        </div>
                        {node.subLabel && (
                          <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {node.subLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full-Featured Right Inspector Sidebar for Sub-DAG */}
          {selectedNode ? (
            <aside 
              data-testid="subflow-node-inspector"
              style={{
                width: '380px',
                borderLeft: '1px solid #334155',
                background: '#1e293b',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                    Sub-Node Inspector
                  </span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
                    {selectedNode.id}
                  </span>
                </div>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                  {selectedNode.label}
                </h3>
              </div>

              {/* Inspector Tabs */}
              <div style={{ display: 'flex', background: '#0f172a', borderRadius: '8px', padding: '3px', border: '1px solid #334155' }}>
                <button
                  type="button"
                  data-testid="tab-subnode-config"
                  onClick={() => setActiveInspectorTab('CONFIG')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: activeInspectorTab === 'CONFIG' ? '#334155' : 'transparent',
                    color: activeInspectorTab === 'CONFIG' ? '#f8fafc' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Params
                </button>
                <button
                  type="button"
                  data-testid="tab-subnode-janino"
                  onClick={() => setActiveInspectorTab('JANINO_CODE')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: activeInspectorTab === 'JANINO_CODE' ? '#334155' : 'transparent',
                    color: activeInspectorTab === 'JANINO_CODE' ? '#f59e0b' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <Code2 size={12} /> Janino
                </button>
                <button
                  type="button"
                  data-testid="tab-subnode-branching"
                  onClick={() => setActiveInspectorTab('BRANCHING')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: activeInspectorTab === 'BRANCHING' ? '#334155' : 'transparent',
                    color: activeInspectorTab === 'BRANCHING' ? '#22c55e' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Branches
                </button>
                <button
                  type="button"
                  data-testid="tab-subnode-simulation"
                  onClick={() => setActiveInspectorTab('SIMULATION')}
                  style={{
                    flex: 1,
                    padding: '5px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    background: activeInspectorTab === 'SIMULATION' ? '#334155' : 'transparent',
                    color: activeInspectorTab === 'SIMULATION' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Simulate
                </button>
              </div>

              {/* TAB 1: PARAMS & CONFIG */}
              {activeInspectorTab === 'CONFIG' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Display Label */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Display Label
                    </label>
                    <input
                      type="text"
                      data-testid="subnode-label-input"
                      value={selectedNode.label}
                      onChange={(e) => updateSelectedNode(n => ({ ...n, label: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#f8fafc'
                      }}
                    />
                  </div>

                  {/* SubLabel */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Sub-Label
                    </label>
                    <input
                      type="text"
                      data-testid="subnode-sublabel-input"
                      value={selectedNode.subLabel || ''}
                      onChange={(e) => updateSelectedNode(n => ({ ...n, subLabel: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        fontSize: '11px',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#cbd5e1'
                      }}
                    />
                  </div>

                  {/* Stream Role */}
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                      Stream Role (Pipeline Invariant)
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['START', 'MIDDLE', 'END'] as const).map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => updateSelectedNode(n => ({ ...n, streamRole: role }))}
                          style={{
                            flex: 1,
                            padding: '4px 6px',
                            fontSize: '10px',
                            fontWeight: 700,
                            borderRadius: '4px',
                            background: selectedNode.streamRole === role ? '#0284c7' : '#0f172a',
                            color: selectedNode.streamRole === role ? '#ffffff' : '#94a3b8',
                            border: `1px solid ${selectedNode.streamRole === role ? '#38bdf8' : '#334155'}`,
                            cursor: 'pointer'
                          }}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTTP Endpoint Config */}
                  {selectedNode.config && ('endpointUrl' in selectedNode.config || Boolean(selectedNode.config.method)) && (
                    <>
                      <div style={{ borderTop: '1px solid #334155', paddingTop: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          HTTP Method & Endpoint URL
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select
                            data-testid="subnode-method-select"
                            value={String(selectedNode.config.method || 'POST')}
                            onChange={(e) => updateSelectedNode(n => ({ ...n, config: { ...n.config, method: e.target.value } }))}
                            style={{
                              padding: '6px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              border: '1px solid #475569',
                              background: '#0f172a',
                              color: '#38bdf8',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                            <option value="PATCH">PATCH</option>
                          </select>
                          <input
                            type="text"
                            data-testid="subnode-endpoint-input"
                            value={String(selectedNode.config.endpointUrl || '')}
                            onChange={(e) => updateSelectedNode(n => ({ ...n, config: { ...n.config, endpointUrl: e.target.value } }))}
                            style={{
                              flex: 1,
                              padding: '6px 10px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              borderRadius: '6px',
                              border: '1px solid #475569',
                              background: '#0f172a',
                              color: '#f8fafc'
                            }}
                          />
                        </div>
                      </div>

                      {/* Request Body Template */}
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Request Body Template (${'{param}'} tokens supported)
                        </label>
                        <textarea
                          rows={5}
                          data-testid="subnode-body-template"
                          value={String(selectedNode.config.bodyTemplate || '')}
                          onChange={(e) => updateSelectedNode(n => ({ ...n, config: { ...n.config, bodyTemplate: e.target.value } }))}
                          style={{
                            width: '100%',
                            padding: '8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            borderRadius: '6px',
                            border: '1px solid #475569',
                            background: '#0f172a',
                            color: '#f8fafc',
                            lineHeight: 1.4
                          }}
                        />
                      </div>
                    </>
                  )}

                  {/* Extraction Mappings for Response Nodes */}
                  {Boolean(selectedNode.config?.extractMappings) && (
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>
                          JSONPath Extraction Mappings
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = (selectedNode.config?.extractMappings || {}) as Record<string, string>;
                            updateSelectedNode(n => ({
                              ...n,
                              config: {
                                ...n.config,
                                extractMappings: { ...cur, [`field_${Object.keys(cur).length + 1}`]: '$.data.value' }
                              }
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#38bdf8',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px'
                          }}
                        >
                          <Plus size={11} /> Add Mapping
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {Object.entries(selectedNode.config.extractMappings as Record<string, string>).map(([field, jsonPath]) => (
                          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', padding: '4px 6px', borderRadius: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#f8fafc', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {field}
                            </span>
                            <span style={{ fontSize: '11px', color: '#a855f7', fontFamily: 'monospace', flex: 1 }}>
                              {jsonPath}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const cur = { ...(selectedNode.config?.extractMappings as Record<string, string>) };
                                delete cur[field];
                                updateSelectedNode(n => ({
                                  ...n,
                                  config: { ...n.config, extractMappings: cur }
                                }));
                              }}
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: JANINO CUSTOM SCRIPT (JAVA 21) */}
              {activeInspectorTab === 'JANINO_CODE' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Code2 size={15} color="#f59e0b" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                        Java 21 / Janino Script Hook
                      </span>
                    </div>
                    {Boolean(selectedNode.config?.customCode) && (
                      <span style={{ fontSize: '10px', background: '#78350f44', color: '#fbbf24', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid #b45309' }}>
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    Embed sub-microsecond in-memory Java 21 logic executed inside the Janino Virtual Thread sandbox for this sub-node.
                  </p>

                  {/* Quick Starter Templates */}
                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                      Quick Starter Templates
                    </label>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('PRE_REQ')}
                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', cursor: 'pointer' }}
                      >
                        Pre-Request Builder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('POST_RES')}
                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', cursor: 'pointer' }}
                      >
                        Post-Response Transform
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('MAPPER')}
                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', cursor: 'pointer' }}
                      >
                        Record Mapper
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate('FAULT')}
                        style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', cursor: 'pointer' }}
                      >
                        Fault Filter
                      </button>
                    </div>
                  </div>

                  {/* Scope variable chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '10px', color: '#94a3b8' }}>
                    <span>Scope:</span>
                    <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', color: '#38bdf8' }}>input: Map&lt;String, Object&gt;</code>
                    <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', color: '#38bdf8' }}>headers</code>
                    <code style={{ background: '#0f172a', padding: '1px 5px', borderRadius: '3px', color: '#38bdf8' }}>config</code>
                  </div>

                  {/* Code Editor */}
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={9}
                      data-testid="subnode-janino-code-input"
                      value={String(selectedNode.config?.customCode || '')}
                      onChange={(e) => updateSelectedNode(n => ({ ...n, config: { ...n.config, customCode: e.target.value } }))}
                      placeholder="// Enter Java 21 method body. Return modified Map<String, Object>"
                      style={{
                        width: '100%',
                        padding: '10px',
                        fontSize: '11px',
                        fontFamily: 'Consolas, Monaco, monospace',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        background: '#090d16',
                        color: '#f8fafc',
                        lineHeight: 1.45,
                        tabSize: 2
                      }}
                    />
                  </div>

                  {/* Validate Script Button & Feedback */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <button
                      type="button"
                      data-testid="subnode-validate-janino-btn"
                      onClick={handleValidateJaninoScript}
                      disabled={scriptValidationStatus?.validating}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        fontSize: '11px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        background: '#f59e0b',
                        color: '#0f172a',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {scriptValidationStatus?.validating ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                      Validate Code (Janino)
                    </button>

                    {Boolean(selectedNode.config?.customCode) && (
                      <button
                        type="button"
                        onClick={() => updateSelectedNode(n => {
                          const conf = { ...n.config };
                          delete conf.customCode;
                          return { ...n, config: conf };
                        })}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '10px', cursor: 'pointer' }}
                      >
                        Clear Script
                      </button>
                    )}
                  </div>

                  {/* Validation Feedback Banner */}
                  {scriptValidationStatus && (
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: scriptValidationStatus.valid ? '#052e16' : '#450a0a',
                      border: `1px solid ${scriptValidationStatus.valid ? '#16a34a' : '#dc2626'}`,
                      fontSize: '11px',
                      color: scriptValidationStatus.valid ? '#86efac' : '#fca5a5'
                    }}>
                      {scriptValidationStatus.valid ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} color="#22c55e" />
                          <span>✓ Janino compiled in {scriptValidationStatus.compilationTimeMicros || 45}µs (Virtual Thread sandbox)</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <AlertTriangle size={14} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>
                            Compilation Error {scriptValidationStatus.errorLine ? `(Line ${scriptValidationStatus.errorLine})` : ''}: {scriptValidationStatus.errorMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: BRANCHING PATHWAYS */}
              {activeInspectorTab === 'BRANCHING' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GitBranch size={15} color="#22c55e" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                        Configured Branch Pathways
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = selectedNode.branchingPorts || [];
                        const newPort: BranchingPortConfig = {
                          portId: `branch_${cur.length + 1}`,
                          label: `Branch ${cur.length + 1}`,
                          color: '#38bdf8',
                          conditionType: 'ALWAYS',
                          conditionExpr: '',
                          actionType: 'CONTINUE'
                        };
                        updateSelectedNode(n => ({
                          ...n,
                          branchingPorts: [...cur, newPort],
                          outputPorts: Array.from(new Set([...n.outputPorts, newPort.portId]))
                        }));
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '10px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <Plus size={11} /> Add Branch
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(selectedNode.branchingPorts || []).map((bp, bpIdx) => (
                      <div key={bp.portId} style={{ padding: '10px', borderRadius: '6px', background: '#0f172a', border: `1px solid ${bp.color}55` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: bp.color }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: bp.color }}>{bp.label}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = (selectedNode.branchingPorts || []).filter((_, idx) => idx !== bpIdx);
                              updateSelectedNode(n => ({
                                ...n,
                                branchingPorts: cur,
                                outputPorts: n.outputPorts.filter(p => p !== bp.portId)
                              }));
                            }}
                            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
                          <div>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Condition Type:</span>
                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{bp.conditionType}</span>
                          </div>
                          <div>
                            <span style={{ color: '#94a3b8', display: 'block' }}>Action:</span>
                            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{bp.actionType}</span>
                          </div>
                        </div>

                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#94a3b8' }}>
                          Expr: <code style={{ color: '#cbd5e1' }}>{bp.conditionExpr || 'true'}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: SUB-DAG SIMULATION */}
              {activeInspectorTab === 'SIMULATION' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Play size={15} color="#38bdf8" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                      Sub-DAG Dry-Run Simulation
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.4 }}>
                    Simulate a record passing through this encapsulated sub-DAG and inspect real-time outputs and branch routing.
                  </p>

                  <div>
                    <label style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      Sample Record Input JSON
                    </label>
                    <textarea
                      rows={5}
                      data-testid="subflow-simulation-input"
                      value={simulationInput}
                      onChange={(e) => setSimulationInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        borderRadius: '6px',
                        border: '1px solid #475569',
                        background: '#090d16',
                        color: '#f8fafc'
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    data-testid="run-subflow-simulation-btn"
                    onClick={handleRunSubFlowSimulation}
                    disabled={isSimulating}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                      borderRadius: '6px',
                      background: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={13} /> Run Sub-Flow Simulation
                  </button>

                  {/* Trace Logs */}
                  {simulationLogs.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '10px', fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase' }}>
                        Execution Trace
                      </label>
                      <div style={{
                        maxHeight: '180px',
                        overflowY: 'auto',
                        padding: '8px',
                        borderRadius: '6px',
                        background: '#090d16',
                        border: '1px solid #334155',
                        fontFamily: 'Consolas, monospace',
                        fontSize: '10px',
                        color: '#94a3b8',
                        lineHeight: 1.4
                      }}>
                        {simulationLogs.map((log, lIdx) => (
                          <div key={lIdx} style={{ color: log.includes('✓') ? '#86efac' : log.includes('ERROR') ? '#fca5a5' : '#cbd5e1' }}>
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>
          ) : (
            <aside style={{
              width: '380px',
              borderLeft: '1px solid #334155',
              background: '#1e293b',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: '#94a3b8'
            }}>
              <Sliders size={32} color="#475569" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                No Sub-Node Selected
              </h4>
              <p style={{ fontSize: '11px', marginTop: '6px', maxWidth: '240px' }}>
                Click any step inside the sub-DAG canvas to configure parameters, custom Janino code, or branching pathways.
              </p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
