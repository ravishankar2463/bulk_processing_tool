import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  FileSpreadsheet, 
  Globe, 
  Code2, 
  Database, 
  Cpu, 
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  FileCode,
  Check,
  Maximize2,
  GitBranch,
  Layers,
  CornerDownRight,
  RefreshCw,
  Activity
} from 'lucide-react';
import { 
  TopologyNode, 
  ConnectorDefinition, 
  CsvFieldSchema, 
  CsvFieldDataType, 
  PropertyFieldManifest,
  WsdlOperationMeta,
  BranchingPortConfig,
  BranchingPortConditionType,
  BranchingPortActionType
} from '../../../types/process';
import {
  validateScript,
  parseJsonStructure,
  validateWsdl,
  generateSoapEnvelope,
  generateXPathMappings
} from '../../../services/apiClient';

interface Props {
  node: TopologyNode | null;
  definition?: ConnectorDefinition;
  onClose: () => void;
  onSaveNodeConfig: (
    nodeId: string, 
    updatedConfig: Record<string, unknown>, 
    updatedLabel?: string,
    updatedBranchingPorts?: ReadonlyArray<BranchingPortConfig>
  ) => void;
  onOpenDryRun: (node: TopologyNode) => void;
  onOpenSubFlowModal?: (node: TopologyNode) => void;
}

export const ConnectorConfigDrawer: React.FC<Props> = ({
  node,
  definition,
  onClose,
  onSaveNodeConfig,
  onOpenDryRun,
  onOpenSubFlowModal
}) => {
  if (!node) return null;

  const [label, setLabel] = useState(node.label);
  const [config, setConfig] = useState<Record<string, any>>({ ...node.config });

  // Custom Code Hook state
  const [isCodeHookOpen, setIsCodeHookOpen] = useState(Boolean(node.config?.customCode));
  const [isStudioModalOpen, setIsStudioModalOpen] = useState(false);
  const codeHookRef = useRef<HTMLDivElement>(null);

  const [scriptValidationStatus, setScriptValidationStatus] = useState<{
    valid?: boolean;
    errorMessage?: string;
    errorLine?: number;
    compilationTimeMicros?: number;
    validating?: boolean;
  } | null>(null);

  // JSON Schema / Sample Modal state
  const [jsonModalMode, setJsonModalMode] = useState<'REQUEST' | 'RESPONSE' | null>(null);
  const [jsonModalInput, setJsonModalInput] = useState('');
  const [jsonModalIsSchema, setJsonModalIsSchema] = useState(false);
  const [jsonModalError, setJsonModalError] = useState<string | null>(null);

  // WSDL Inspector state
  const [wsdlLoading, setWsdlLoading] = useState(false);
  const [wsdlOperations, setWsdlOperations] = useState<ReadonlyArray<WsdlOperationMeta>>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [wsdlTargetNamespace, setWsdlTargetNamespace] = useState<string>('');
  const [wsdlStatusMessage, setWsdlStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  // XPath Extractor Modal state
  const [isXPathModalOpen, setIsXPathModalOpen] = useState(false);
  const [sampleXmlInput, setSampleXmlInput] = useState('');
  const [xpathError, setXpathError] = useState<string | null>(null);

  // Dynamic Branching Pathways state
  const getDefaultBranchingPorts = (n: TopologyNode): BranchingPortConfig[] => {
    if (n.branchingPorts && n.branchingPorts.length > 0) {
      return [...n.branchingPorts];
    }
    if (n.outputPorts.some(p => p.toLowerCase().includes('retry'))) {
      return [
        { portId: 'retry', label: 'RETRY (Delayed Loop)', color: '#f59e0b', conditionType: 'ALWAYS', conditionExpr: 'attempts <= maxRetries', actionType: 'RETRY' },
        { portId: 'exhausted', label: 'EXHAUSTED (DLQ)', color: '#ef4444', conditionType: 'ALWAYS', conditionExpr: 'attempts > maxRetries', actionType: 'FAIL_RECORD' }
      ];
    }
    return [
      { portId: 'pass', label: 'PASS (2xx / Success)', color: '#22c55e', conditionType: 'STATUS_CODE', conditionExpr: '200..299', actionType: 'CONTINUE' },
      { portId: 'fail', label: 'FAIL (Error / Timeout)', color: '#ef4444', conditionType: 'STATUS_CODE', conditionExpr: '400..599', actionType: 'FAIL_RECORD' }
    ];
  };

  const [branchingPorts, setBranchingPorts] = useState<BranchingPortConfig[]>(getDefaultBranchingPorts(node));
  const [isBranchingOpen, setIsBranchingOpen] = useState(false);
  const [barrierReleased, setBarrierReleased] = useState(false);

  // Sync state when selected node changes
  useEffect(() => {
    setLabel(node.label);
    setConfig({ ...node.config });
    setIsCodeHookOpen(Boolean(node.config?.customCode));
    setScriptValidationStatus(null);
    setWsdlStatusMessage(null);
    setBranchingPorts(getDefaultBranchingPorts(node));
    setBarrierReleased(false);
  }, [node]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const nodeRole = node.streamRole 
    || (node.type === 'CONNECTOR' ? definition?.streamRole : undefined)
    || (node.category === 'SOURCE' ? 'START' : (node.category === 'SINK' ? 'END' : 'MIDDLE'));

  // CSV Field Builder handlers
  const csvFields: CsvFieldSchema[] = Array.isArray(config.fields) ? config.fields : [];

  const handleAddCsvField = () => {
    const newField: CsvFieldSchema = {
      id: `field-${Date.now()}`,
      name: `field_${csvFields.length + 1}`,
      type: 'STRING',
      required: true
    };
    handleConfigChange('fields', [...csvFields, newField]);
  };

  const handleUpdateCsvField = (index: number, updates: Partial<CsvFieldSchema>) => {
    const updated = [...csvFields];
    updated[index] = { ...updated[index], ...updates };
    handleConfigChange('fields', updated);
  };

  const handleRemoveCsvField = (index: number) => {
    const updated = csvFields.filter((_, i) => i !== index);
    handleConfigChange('fields', updated);
  };

  // REST / SOAP Key-Value helpers
  const handleAddKeyValue = (configKey: string, keyName: string, valName: string) => {
    const current = { ...(config[configKey] || {}) };
    current[keyName || `key_${Object.keys(current).length + 1}`] = valName || '';
    handleConfigChange(configKey, current);
  };

  const handleRemoveKeyValue = (configKey: string, targetKey: string) => {
    const current = { ...(config[configKey] || {}) };
    delete current[targetKey];
    handleConfigChange(configKey, current);
  };

  const handleSave = () => {
    onSaveNodeConfig(node.id, config, label, branchingPorts);
  };

  // Script validation handler
  const handleValidateScript = async (codeToValidate?: string, hookTypeToValidate?: string) => {
    const script = codeToValidate !== undefined ? codeToValidate : (config.customCode || '');
    const hookType = hookTypeToValidate !== undefined ? hookTypeToValidate : (config.codeHookType || 'TRANSFORM');
    setScriptValidationStatus({ validating: true });
    try {
      const res = await validateScript({ script, hookType });
      setScriptValidationStatus({
        valid: res.valid,
        errorMessage: res.errorMessage,
        errorLine: res.errorLine,
        compilationTimeMicros: res.compilationTimeMicros,
        validating: false
      });
      return res;
    } catch (e: any) {
      setScriptValidationStatus({
        valid: false,
        errorMessage: e.message || 'Validation failed',
        validating: false
      });
      return { valid: false, errorMessage: e.message };
    }
  };

  const handleInsertScriptTemplate = (templateType: string) => {
    let templateCode = '';
    if (templateType === 'PRE_REQUEST') {
      templateCode = `// Pre-Request Payload & Header Builder\nheaders.put("X-Custom-Client", "BulkProcessor/2.0");\ninput.put("processedAt", java.time.Instant.now().toString());\nreturn input;`;
    } else if (templateType === 'POST_RESPONSE') {
      templateCode = `// Post-Response Record Transformer & Enricher\ninput.put("enriched_tier", "ENTERPRISE");\ninput.put("verification_status", "VERIFIED");\nreturn input;`;
    } else if (templateType === 'RECORD_MAPPER') {
      templateCode = `// Record Mapper and Field Coercer\nString rawEmail = (String) input.get("email");\nif (rawEmail != null) {\n    input.put("email", rawEmail.trim().toLowerCase());\n}\nreturn input;`;
    } else {
      templateCode = `// Custom Adapter Execution\ninput.put("executionMode", "JaninoVirtualThread");\ninput.put("status", "SUCCESS");\nreturn input;`;
    }
    handleConfigChange('customCode', templateCode);
    handleConfigChange('codeHookType', templateType);
    setScriptValidationStatus(null);
  };

  // JSON Schema / Sample Modal Submit
  const handleApplyJsonStructure = async () => {
    if (!jsonModalInput.trim()) {
      setJsonModalError('Input JSON or Schema cannot be empty.');
      return;
    }
    setJsonModalError(null);
    try {
      const res = await parseJsonStructure({
        input: jsonModalInput,
        isSchema: jsonModalIsSchema,
        targetMode: jsonModalMode || 'REQUEST'
      });

      if (!res.success) {
        setJsonModalError(res.warnings?.[0] || 'Failed to parse JSON structure.');
        return;
      }

      if (jsonModalMode === 'REQUEST') {
        if (res.generatedTemplate) {
          handleConfigChange('bodyTemplate', res.generatedTemplate);
        }
      } else if (jsonModalMode === 'RESPONSE') {
        const merged = { ...(config.extractMappings || {}), ...(res.jsonPathMappings || {}) };
        handleConfigChange('extractMappings', merged);
      }

      setJsonModalMode(null);
      setJsonModalInput('');
    } catch (err: any) {
      setJsonModalError(err.message || 'JSON structure generation failed.');
    }
  };

  // WSDL Validate & Inspect Handler
  const handleInspectWsdl = async () => {
    const wsdlSource = config.wsdlUrl || '';
    if (!wsdlSource.trim()) {
      setWsdlStatusMessage({ success: false, text: 'Please enter a WSDL URL or endpoint.' });
      return;
    }

    setWsdlLoading(true);
    setWsdlStatusMessage(null);
    try {
      const res = await validateWsdl({ wsdlSource, isUrl: true });
      if (res.valid) {
        setWsdlOperations(res.operations || []);
        setWsdlTargetNamespace(res.targetNamespace || '');
        if (res.operations && res.operations.length > 0) {
          setSelectedOperation(res.operations[0].name);
        }
        setWsdlStatusMessage({
          success: true,
          text: `Discovered ${res.operations.length} SOAP operation(s) in service: ${res.serviceName || 'Service'}`
        });
      } else {
        setWsdlStatusMessage({ success: false, text: res.errorMessage || 'Invalid WSDL document.' });
      }
    } catch (err: any) {
      setWsdlStatusMessage({ success: false, text: err.message || 'Failed to inspect WSDL.' });
    } finally {
      setWsdlLoading(false);
    }
  };

  // SOAP Envelope Generation Handler
  const handleGenerateSoapEnvelope = async () => {
    if (!selectedOperation) return;
    const opMeta = wsdlOperations.find(o => o.name === selectedOperation);
    try {
      const res = await generateSoapEnvelope({
        operationName: selectedOperation,
        targetNamespace: wsdlTargetNamespace,
        soapVersion: config.soapVersion || '1.1',
        parameters: opMeta?.detectedParameters || ['id', 'payload']
      });
      handleConfigChange('envelopeTemplate', res.envelopeXml);
      handleConfigChange('soapAction', res.soapAction);
      setWsdlStatusMessage({
        success: true,
        text: `Synthesized SOAP envelope template for operation '${selectedOperation}'`
      });
    } catch (err: any) {
      setWsdlStatusMessage({ success: false, text: err.message || 'Failed to generate envelope.' });
    }
  };

  // XPath Extractor Submit
  const handleApplyXPathExtraction = async () => {
    if (!sampleXmlInput.trim()) {
      setXpathError('Sample XML response cannot be empty.');
      return;
    }
    setXpathError(null);
    try {
      const res = await generateXPathMappings({ sampleXml: sampleXmlInput });
      if (!res.success) {
        setXpathError(res.errorMessage || 'Failed to parse XML response.');
        return;
      }
      const merged = { ...(config.xpathExtractMap || {}), ...(res.xpathMappings || {}) };
      handleConfigChange('xpathExtractMap', merged);
      setIsXPathModalOpen(false);
      setSampleXmlInput('');
    } catch (err: any) {
      setXpathError(err.message || 'XPath extraction failed.');
    }
  };

  const isCsvConnector = definition?.protocol === 'CSV' || node.refId === 'conn-def-csv';
  const isRestReq = node.refId === 'conn-def-rest-json' && (node.subLabel?.includes('Request') || node.outputPorts.includes('out_http_req'));
  const isRestRes = node.refId === 'conn-def-rest-json' && !isRestReq;
  const isSoapReq = node.refId === 'conn-def-soap-xml' && (node.subLabel?.includes('Request') || node.outputPorts.includes('out_soap_req'));
  const isSoapRes = node.refId === 'conn-def-soap-xml' && !isSoapReq;
  const isCustomConnector = definition && !definition.builtIn;

  // Parse custom property manifest if available
  let customProperties: PropertyFieldManifest[] = [];
  if (definition?.propertyManifest) {
    try {
      const parsed = JSON.parse(definition.propertyManifest);
      if (Array.isArray(parsed.properties)) {
        customProperties = parsed.properties;
      }
    } catch {
      // Ignored
    }
  }

  return (
    <>
      <aside
        className="topology-config-drawer"
        data-testid="connector-config-drawer"
        style={{
          width: '460px',
          minWidth: '460px',
          background: 'var(--bg-card, #ffffff)',
          borderLeft: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          maxHeight: '100%',
          minHeight: 0,
          overflow: 'hidden',
          boxShadow: '-4px 0 16px rgba(15,23,42,0.06)',
          zIndex: 20
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle, #f8fafc)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {node.type === 'CONNECTOR' ? <Globe size={18} className="text-blue-600" /> : <Cpu size={18} className="text-emerald-600" />}
            </div>
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted, #64748b)' }}>
                {node.type} Configuration
              </span>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                {node.label}
              </h3>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-config-drawer-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body Scroll */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          scrollbarWidth: 'thin',
          paddingBottom: '36px'
        }}>
          
          {/* Node Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
              Display Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #0f172a)',
                outline: 'none'
              }}
            />
          </div>

          {/* Stream Role Indicator */}
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: nodeRole === 'START' ? '#ecfdf5' : (nodeRole === 'END' ? '#faf5ff' : '#eff6ff'),
            border: `1px solid ${nodeRole === 'START' ? '#a7f3d0' : (nodeRole === 'END' ? '#e9d5ff' : '#bfdbfe')}`
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: nodeRole === 'START' ? '#065f46' : (nodeRole === 'END' ? '#6b21a8' : '#1e40af'), display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: nodeRole === 'START' ? '#10b981' : (nodeRole === 'END' ? '#a855f7' : '#3b82f6') 
              }} />
              STREAM ROLE: {nodeRole} {nodeRole === 'START' ? '(SOURCE / INGRESS)' : (nodeRole === 'END' ? '(TERMINAL SINK)' : '(PIPED STEP)')}
            </div>
            <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
              {nodeRole === 'START' && 'Produces stream records. Output ports only (cannot receive upstream stream inputs).'}
              {nodeRole === 'MIDDLE' && 'Pipelined step. Accepts upstream input records and forwards processed records downstream.'}
              {nodeRole === 'END' && 'Stream terminal / sink. Consumes and persists records. No downstream outgoing pipes.'}
            </div>
          </div>

          {/* Barrier Mode Option for END Nodes */}
          {nodeRole === 'END' && (
            <div 
              data-testid="end-node-barrier-section"
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>
                  Execution Timing & File Completion Barrier
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#9333ea', background: '#f3e8ff', padding: '2px 6px', borderRadius: '4px' }}>
                  END SINK ONLY
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                Configure whether this End Node writes records continuously as batches arrive, or waits until all batches and records of the entire file have drained through all upstream nodes.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  data-testid="barrier-mode-streaming"
                  onClick={() => handleConfigChange('barrierMode', 'STREAMING')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `2px solid ${(config.barrierMode || node.barrierMode || 'STREAMING') === 'STREAMING' ? '#9333ea' : '#e2e8f0'}`,
                    background: (config.barrierMode || node.barrierMode || 'STREAMING') === 'STREAMING' ? '#f3e8ff' : '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: (config.barrierMode || node.barrierMode || 'STREAMING') === 'STREAMING' ? '#581c87' : '#475569',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Continuous Streaming</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Consume as batches arrive</div>
                </button>
                <button
                  type="button"
                  data-testid="barrier-mode-file-completion"
                  onClick={() => handleConfigChange('barrierMode', 'FILE_COMPLETION_BARRIER')}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: `2px solid ${(config.barrierMode || node.barrierMode) === 'FILE_COMPLETION_BARRIER' ? '#9333ea' : '#e2e8f0'}`,
                    background: (config.barrierMode || node.barrierMode) === 'FILE_COMPLETION_BARRIER' ? '#f3e8ff' : '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: (config.barrierMode || node.barrierMode) === 'FILE_COMPLETION_BARRIER' ? '#581c87' : '#475569',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 700 }}>File Completion Barrier</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>Wait for all records to drain</div>
                </button>
              </div>

              {(config.barrierMode || node.barrierMode) === 'FILE_COMPLETION_BARRIER' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px', padding: '8px 10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #d8b4fe' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#6b21a8' }}>
                      Status: <strong>Auto-Triggers on File Drain</strong> (Surviving records execute even if upstream records fault)
                    </span>
                    <button
                      type="button"
                      data-testid="force-execute-barrier-btn"
                      onClick={() => setBarrierReleased(true)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: '#7e22ce',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Force Execute Now
                    </button>
                  </div>
                  {barrierReleased && (
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                      ✓ Barrier released: Executing surviving records now
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= UNIFIED STREAM PIPELINE SECTION ================= */}
          <div 
            data-testid="stream-pipeline-section"
            style={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden'
            }}
          >
            <div style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} className="text-blue-600" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                  Stream Pipeline Contract (In ➔ Logic ➔ Out)
                </span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 6px', borderRadius: '4px', background: '#dbeafe', color: '#1e40af' }}>
                {nodeRole === 'START' ? 'Ingress Root' : (nodeRole === 'END' ? 'Terminal Sink' : 'Pipelined Step')}
              </span>
            </div>

            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* 1. STREAM IN */}
              <div style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    1. Stream In (Input Records)
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>
                    {nodeRole === 'START' ? 'No Upstream Input' : 'Consuming Record Stream'}
                  </span>
                </div>
                {nodeRole === 'START' ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#059669', fontWeight: 500 }}>
                    ✓ Root Ingress Source — generates initial record stream from external source.
                  </p>
                ) : (
                  <div>
                    <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#64748b' }}>
                      Incoming fields available for processing and transformation:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {((config.streamInFields as string[]) || ['customer_id', 'full_name', 'email', 'balance', 'timestamp']).map((f, i) => (
                        <span key={i} style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: '#e0f2fe', color: '#0369a1', fontFamily: 'monospace', fontWeight: 600 }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. LOGIC & OUTPUT PREPARATION */}
              <div style={{ padding: '10px', borderRadius: '8px', background: '#faf5ff', border: '1px solid #e9d5ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    2. Node Processing Logic & Output Object Preparation
                  </span>
                  <span style={{ fontSize: '10px', color: '#7e22ce', fontWeight: 600 }}>
                    Prepares Next Node's Input
                  </span>
                </div>
                <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                  Processes incoming records and packages the output object emitted to the downstream node.
                </p>
                
                {/* Declarative / Script mode pill */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleConfigChange('streamLogicMode', 'DECLARATIVE')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: (config.streamLogicMode || 'DECLARATIVE') === 'DECLARATIVE' ? '#a855f7' : '#cbd5e1',
                      background: (config.streamLogicMode || 'DECLARATIVE') === 'DECLARATIVE' ? '#f3e8ff' : '#ffffff',
                      color: (config.streamLogicMode || 'DECLARATIVE') === 'DECLARATIVE' ? '#7e22ce' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Declarative Output Preparation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleConfigChange('streamLogicMode', 'JANINO_CODE');
                      setIsCodeHookOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '5px',
                      border: '1px solid',
                      borderColor: config.streamLogicMode === 'JANINO_CODE' ? '#a855f7' : '#cbd5e1',
                      background: config.streamLogicMode === 'JANINO_CODE' ? '#f3e8ff' : '#ffffff',
                      color: config.streamLogicMode === 'JANINO_CODE' ? '#7e22ce' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Janino Java 21 Code Hook
                  </button>
                </div>

                {/* Declarative Output Mapping Builder */}
                {(!config.streamLogicMode || config.streamLogicMode === 'DECLARATIVE') ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155' }}>
                      Output Object Attributes Emitted:
                    </div>
                    {/* Key-Value Output Builder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.entries((config.outputObjectMap as Record<string, string>) || {
                        id: '${input.customer_id}',
                        status: 'VERIFIED',
                        processedAt: 'System.currentTimeMillis()',
                        payload: '${input}'
                      }).map(([k, v], idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <input
                            type="text"
                            value={k}
                            readOnly
                            style={{ width: '38%', padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc', fontFamily: 'monospace' }}
                          />
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>➔</span>
                          <input
                            type="text"
                            value={v}
                            onChange={(e) => {
                              const existing = { ...(config.outputObjectMap as Record<string, string> || {
                                id: '${input.customer_id}',
                                status: 'VERIFIED',
                                processedAt: 'System.currentTimeMillis()',
                                payload: '${input}'
                              }) };
                              existing[k] = e.target.value;
                              handleConfigChange('outputObjectMap', existing);
                            }}
                            style={{ flex: 1, padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#6b21a8', padding: '6px 10px', background: '#f3e8ff', borderRadius: '6px' }}>
                    Janino Java 21 Script active. Output prepared via Java return value: <code>return output;</code>
                  </div>
                )}
              </div>

              {/* 3. STREAM OUT */}
              <div style={{ padding: '10px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3. Stream Out (Forwarded Downstream)
                  </span>
                  <span style={{ fontSize: '10px', color: '#047857', fontWeight: 600 }}>
                    {nodeRole === 'END' ? 'Terminal Sink • Zero Out Ports' : 'Next Node’s Input'}
                  </span>
                </div>
                {nodeRole === 'END' ? (
                  <p style={{ margin: 0, fontSize: '12px', color: '#065f46', fontWeight: 500 }}>
                    ✓ Stream Terminal Sink — seals the stream and commits file stage to COMPLETED (100% progress). No downstream outgoing stream.
                  </p>
                ) : (
                  <p style={{ margin: 0, fontSize: '11px', color: '#047857' }}>
                    Output object will be passed directly into the next connected node's input port.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ---------------- CSV CONNECTOR SPECIFIC CONFIG ---------------- */}
          {isCsvConnector && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* CSV Source Type */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                  CSV Source
                </label>
                <select
                  data-testid="csv-source-type-select"
                  value={config.sourceType || 'MANUAL_UPLOAD'}
                  onChange={(e) => handleConfigChange('sourceType', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-card, #ffffff)',
                    color: 'var(--text-main, #0f172a)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="MANUAL_UPLOAD">Manual Upload (User Dropzone)</option>
                  <option value="S3_BUCKET">S3 Location Upload (AWS S3 Bucket)</option>
                  <option value="SFTP_SERVER">SFTP Server Ingestion</option>
                  <option value="LOCAL_DIRECTORY">Local Server Directory</option>
                </select>
              </div>

              {/* S3 URI details when S3 selected */}
              {config.sourceType === 'S3_BUCKET' && (
                <div style={{ padding: '12px', background: 'var(--bg-card-subtle, #f8fafc)', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '4px' }}>
                    S3 Location URI (Bucket & Key Pattern)
                  </label>
                  <input
                    type="text"
                    data-testid="csv-s3-uri-input"
                    placeholder="s3://customer-inbound-bucket/raw/*.csv"
                    value={config.s3Uri || ''}
                    onChange={(e) => handleConfigChange('s3Uri', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1'
                    }}
                  />
                </div>
              )}

              {/* Parsing Delimiter & Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                    Delimiter
                  </label>
                  <select
                    value={config.delimiter || ','}
                    onChange={(e) => handleConfigChange('delimiter', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1'
                    }}
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                    Header Row
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={config.hasHeader ?? true}
                      onChange={(e) => handleConfigChange('hasHeader', e.target.checked)}
                    />
                    <span>First line is header</span>
                  </label>
                </div>
              </div>

              {/* CSV Fields Dynamic Table with + Button */}
              <div style={{ marginTop: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                      CSV Fields & Datatypes
                    </label>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                      Define column schema for extraction & type coercion
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid="add-csv-field-btn"
                    onClick={handleAddCsvField}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: 'var(--primary, #2563eb)',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
                    }}
                  >
                    <Plus size={14} /> Add Field
                  </button>
                </div>

                {csvFields.length === 0 ? (
                  <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                    No fields defined yet. Click "+ Add Field" to configure column schema.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {csvFields.map((field, idx) => (
                      <div 
                        key={field.id || idx}
                        data-testid={`csv-field-row-${idx}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1.4fr 1.2fr auto auto',
                          gap: '6px',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: 'var(--bg-card-subtle, #f8fafc)',
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          borderRadius: '8px'
                        }}
                      >
                        <input
                          type="text"
                          placeholder="field_name"
                          value={field.name}
                          onChange={(e) => handleUpdateCsvField(idx, { name: e.target.value })}
                          style={{
                            padding: '6px 8px',
                            fontSize: '12px',
                            fontFamily: 'var(--font-mono)',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                          }}
                        />

                        <select
                          value={field.type}
                          onChange={(e) => handleUpdateCsvField(idx, { type: e.target.value as CsvFieldDataType })}
                          style={{
                            padding: '6px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1'
                          }}
                        >
                          <option value="STRING">STRING</option>
                          <option value="INTEGER">INTEGER</option>
                          <option value="DECIMAL">DECIMAL</option>
                          <option value="BOOLEAN">BOOLEAN</option>
                          <option value="DATE">DATE</option>
                          <option value="DATETIME">DATETIME</option>
                          <option value="UUID">UUID</option>
                          <option value="JSON">JSON</option>
                        </select>

                        <label title="Required" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateCsvField(idx, { required: e.target.checked })}
                          />
                          <span style={{ fontSize: '10px', color: '#64748b' }}>Req</span>
                        </label>

                        <button
                          type="button"
                          title="Delete Field"
                          data-testid={`delete-csv-field-${idx}`}
                          onClick={() => handleRemoveCsvField(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger, #dc2626)',
                            cursor: 'pointer',
                            padding: '3px'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ---------------- REST JSON REQ CONFIG ---------------- */}
          {isRestReq && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                    HTTP Method
                  </label>
                  <select
                    value={config.method || 'POST'}
                    onChange={(e) => handleConfigChange('method', e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                    Target Endpoint URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.corp.internal/v1/enrich/${id}"
                    value={config.endpointUrl || ''}
                    onChange={(e) => handleConfigChange('endpointUrl', e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                  Authentication Type
                </label>
                <select
                  value={config.authType || 'NONE'}
                  onChange={(e) => handleConfigChange('authType', e.target.value)}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                >
                  <option value="NONE">None / Anonymous</option>
                  <option value="BEARER_TOKEN">Bearer Token</option>
                  <option value="API_KEY_HEADER">API Key Header</option>
                  <option value="BASIC_AUTH">HTTP Basic Auth</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
                    Request Body Template (JSON)
                  </label>
                  <button
                    type="button"
                    data-testid="open-json-schema-modal-btn"
                    onClick={() => { setJsonModalMode('REQUEST'); setJsonModalError(null); }}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--primary, #2563eb)',
                      background: '#eff6ff',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Sparkles size={12} /> Auto-Generate from Schema/Sample
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder='{"customerId": "${customer_id}", "email": "${email}"}'
                  value={config.bodyTemplate || ''}
                  onChange={(e) => handleConfigChange('bodyTemplate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1'
                  }}
                />
              </div>
            </div>
          )}

          {/* ---------------- REST JSON RES CONFIG ---------------- */}
          {isRestRes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                  Expected Success Status Codes
                </label>
                <input
                  type="text"
                  placeholder="200, 201"
                  value={Array.isArray(config.expectedStatus) ? config.expectedStatus.join(', ') : '200'}
                  onChange={(e) => {
                    const codes = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                    handleConfigChange('expectedStatus', codes);
                  }}
                  style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
                    JSONPath Field Extractions
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      data-testid="open-json-res-modal-btn"
                      onClick={() => { setJsonModalMode('RESPONSE'); setJsonModalError(null); }}
                      style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #2563eb)', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} /> Auto-Map Response
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddKeyValue('extractMappings', 'new_attr', '$.data.val')}
                      style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #2563eb)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      + Add Mapping
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(config.extractMappings || {}).map(([key, path]) => (
                    <div key={key} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={key}
                        placeholder="target_attribute"
                        readOnly
                        style={{ flex: 1, padding: '6px 8px', fontSize: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>&larr;</span>
                      <input
                        type="text"
                        value={String(path)}
                        placeholder="$.json.path"
                        onChange={(e) => {
                          const m = { ...config.extractMappings, [key]: e.target.value };
                          handleConfigChange('extractMappings', m);
                        }}
                        style={{ flex: 1.5, padding: '6px 8px', fontSize: '12px', fontFamily: 'var(--font-mono)', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyValue('extractMappings', key)}
                        style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ---------------- SOAP XML REQ & RES CONFIG ---------------- */}
          {(isSoapReq || isSoapRes) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSoapReq ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                      WSDL or Service Endpoint URL
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={config.wsdlUrl || ''}
                        placeholder="https://legacy.corp/ws/CustomerService?wsdl"
                        onChange={(e) => handleConfigChange('wsdlUrl', e.target.value)}
                        style={{ flex: 1, padding: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                      />
                      <button
                        type="button"
                        data-testid="inspect-wsdl-btn"
                        onClick={handleInspectWsdl}
                        disabled={wsdlLoading}
                        style={{
                          padding: '8px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          cursor: wsdlLoading ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Globe size={13} /> {wsdlLoading ? 'Fetching...' : 'Inspect WSDL'}
                      </button>
                    </div>

                    {wsdlStatusMessage && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        background: wsdlStatusMessage.success ? '#ecfdf5' : '#fef2f2',
                        color: wsdlStatusMessage.success ? '#065f46' : '#991b1b',
                        border: `1px solid ${wsdlStatusMessage.success ? '#a7f3d0' : '#fecaca'}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {wsdlStatusMessage.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        <span>{wsdlStatusMessage.text}</span>
                      </div>
                    )}
                  </div>

                  {wsdlOperations.length > 0 && (
                    <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                        Discovered SOAP Operations:
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                          data-testid="wsdl-operation-select"
                          value={selectedOperation}
                          onChange={(e) => setSelectedOperation(e.target.value)}
                          style={{ flex: 1, padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                          {wsdlOperations.map(op => (
                            <option key={op.name} value={op.name}>{op.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-testid="generate-envelope-btn"
                          onClick={handleGenerateSoapEnvelope}
                          style={{
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '6px',
                            background: 'var(--primary, #2563eb)',
                            color: '#ffffff',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <Sparkles size={12} style={{ display: 'inline', marginRight: '3px' }} /> Auto-Envelope
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '6px' }}>
                      SOAP Envelope Template (XML)
                    </label>
                    <textarea
                      rows={5}
                      value={config.envelopeTemplate || ''}
                      placeholder="<soapenv:Envelope>...<Customer id='${id}'/>...</soapenv:Envelope>"
                      onChange={(e) => handleConfigChange('envelopeTemplate', e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)' }}>
                      XPath Extractions Map
                    </label>
                    <button
                      type="button"
                      data-testid="open-xpath-extractor-btn"
                      onClick={() => { setIsXPathModalOpen(true); setXpathError(null); }}
                      style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #2563eb)', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                    >
                      <Sparkles size={11} style={{ display: 'inline', marginRight: '3px' }} /> Auto-Extract from Sample XML
                    </button>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '11px', color: '#64748b' }}>
                    Map XPath queries from XML Response Body into record properties
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(config.xpathExtractMap || { '//Status/text()': 'status' }).map(([xpath, targetKey]) => (
                      <div key={xpath} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={String(targetKey)}
                          placeholder="target_field"
                          readOnly
                          style={{ flex: 1, padding: '6px', fontSize: '12px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#64748b' }}>&larr;</span>
                        <input
                          type="text"
                          value={xpath}
                          placeholder="//tns:Status/text()"
                          onChange={(e) => {
                            const updated = { ...config.xpathExtractMap };
                            delete updated[xpath];
                            updated[e.target.value] = targetKey;
                            handleConfigChange('xpathExtractMap', updated);
                          }}
                          style={{ flex: 1.5, padding: '6px', fontSize: '12px', fontFamily: 'var(--font-mono)', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyValue('xpathExtractMap', xpath)}
                          style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---------------- CUSTOM SCHEMA-DRIVEN MANIFEST ---------------- */}
          {isCustomConnector && customProperties.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                Manifest Parameters
              </span>
              {customProperties.map((prop) => (
                <div key={prop.key}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main, #334155)', marginBottom: '4px' }}>
                    {prop.label} {prop.required && <span style={{ color: '#dc2626' }}>*</span>}
                  </label>
                  {prop.type === 'select' ? (
                    <select
                      value={config[prop.key] || prop.defaultValue || ''}
                      onChange={(e) => handleConfigChange(prop.key, e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      {(prop.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={prop.type === 'number' ? 'number' : prop.type === 'secret' ? 'password' : 'text'}
                      placeholder={prop.placeholder || ''}
                      value={config[prop.key] || ''}
                      onChange={(e) => handleConfigChange(prop.key, e.target.value)}
                      style={{ width: '100%', padding: '8px', fontSize: '13px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ---------------- CUSTOM CODE HOOK ACCORDION (JAVA 21 / JANINO) ---------------- */}
          <div 
            ref={codeHookRef}
            style={{
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#f8fafc',
                borderBottom: isCodeHookOpen ? '1px solid #e2e8f0' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <button
                type="button"
                data-testid="toggle-code-hook-accordion"
                onClick={() => {
                  const nextOpen = !isCodeHookOpen;
                  setIsCodeHookOpen(nextOpen);
                  if (nextOpen) {
                    setTimeout(() => {
                      if (typeof codeHookRef.current?.scrollIntoView === 'function') {
                        codeHookRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }, 50);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Code2 size={16} className="text-indigo-600" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                  Custom Code Hook (Java 21 / Janino)
                </span>
                {config.customCode && (
                  <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1d4ed8', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    Active
                  </span>
                )}
                {isCodeHookOpen ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
              </button>

              <button
                type="button"
                data-testid="expand-code-studio-btn"
                title="Open in Dedicated Script Studio"
                onClick={() => setIsStudioModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  color: '#1d4ed8',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={12} /> Full Studio
              </button>
            </div>

            {isCodeHookOpen && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                    In-memory Java 21 logic on Project Loom virtual threads.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsStudioModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4f46e5',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Maximize2 size={11} /> Open Full Studio
                  </button>
                </div>

                {/* Starter template buttons */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                    Quick Starter Templates:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <button
                      type="button"
                      data-testid="template-pre-request"
                      onClick={() => handleInsertScriptTemplate('PRE_REQUEST')}
                      style={{ fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                      Pre-Request Builder
                    </button>
                    <button
                      type="button"
                      data-testid="template-post-response"
                      onClick={() => handleInsertScriptTemplate('POST_RESPONSE')}
                      style={{ fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                      Post-Response Transform
                    </button>
                    <button
                      type="button"
                      data-testid="template-record-mapper"
                      onClick={() => handleInsertScriptTemplate('RECORD_MAPPER')}
                      style={{ fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                    >
                      Record Mapper
                    </button>
                  </div>
                </div>

                {/* Scope chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '10px', color: '#475569', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>Scope variables:</span>
                  <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px' }}>input: Map&lt;String,Object&gt;</code>
                  <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px' }}>headers</code>
                  <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '3px' }}>config</code>
                </div>

                {/* Code editor */}
                <textarea
                  data-testid="custom-code-textarea"
                  rows={8}
                  placeholder="// Java 21 method body. Must return Map<String, Object>&#10;input.put(&quot;enriched&quot;, true);&#10;return input;"
                  value={config.customCode || ''}
                  onChange={(e) => {
                    handleConfigChange('customCode', e.target.value);
                    setScriptValidationStatus(null);
                  }}
                  style={{
                    width: '100%',
                    minHeight: '130px',
                    boxSizing: 'border-box',
                    padding: '8px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono, monospace)',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#0f172a',
                    color: '#f8fafc',
                    lineHeight: 1.5
                  }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    data-testid="validate-script-btn"
                    onClick={() => handleValidateScript()}
                    disabled={scriptValidationStatus?.validating}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      border: 'none',
                      cursor: scriptValidationStatus?.validating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <CheckCircle2 size={13} /> {scriptValidationStatus?.validating ? 'Compiling...' : 'Validate Code (Janino)'}
                  </button>

                  {scriptValidationStatus && !scriptValidationStatus.validating && (
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: scriptValidationStatus.valid ? '#16a34a' : '#dc2626'
                    }}>
                      {scriptValidationStatus.valid ? (
                        <>
                          <Check size={14} /> Syntax Valid ({scriptValidationStatus.compilationTimeMicros || 0}µs)
                        </>
                      ) : (
                        <>
                          <AlertCircle size={14} />
                          <span title={scriptValidationStatus.errorMessage}>
                            Compile Error {scriptValidationStatus.errorLine ? `(Line ${scriptValidationStatus.errorLine})` : ''}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {scriptValidationStatus?.errorMessage && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    fontSize: '11px',
                    color: '#991b1b',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {scriptValidationStatus.errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ---------------- ENCAPSULATED SUB-FLOW BANNER (IF APPLICABLE) ---------------- */}
          {(node.subFlow != null || node.config?.isSubFlow === true || node.refId.includes('subflow') || node.refId.includes('rest-json') || node.refId.includes('soap-xml')) && (
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={16} className="text-emerald-600" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
                    Encapsulated Service Sub-Flow
                  </span>
                </div>
                <span style={{ fontSize: '10px', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  {node.subFlow?.nodes.length || 5} Inner Nodes
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11px', color: '#166534', lineHeight: 1.4 }}>
                Contains internal Request, Response capture, and Branch Decision routing.
              </p>
              <button
                type="button"
                data-testid="open-subflow-canvas-drawer-btn"
                onClick={() => onOpenSubFlowModal && onOpenSubFlowModal(node)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '7px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '6px',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <Maximize2 size={13} /> Open Dedicated Sub-Flow Canvas
              </button>
            </div>
          )}

          {/* ---------------- BRANCHING & ROUTING PATHWAYS ACCORDION ---------------- */}
          <div style={{ borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', overflow: 'hidden' }}>
            <div style={{ width: '100%', padding: '10px 14px', background: '#f8fafc', borderBottom: isBranchingOpen ? '1px solid #e2e8f0' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                data-testid="toggle-branching-accordion"
                onClick={() => setIsBranchingOpen(!isBranchingOpen)}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: 0 }}
              >
                <GitBranch size={16} className="text-blue-600" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>
                  Branching & Routing Pathways
                </span>
                <span style={{ fontSize: '10px', background: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                  {branchingPorts.length} Exits
                </span>
                {isBranchingOpen ? <ChevronDown size={16} color="#64748b" /> : <ChevronRight size={16} color="#64748b" />}
              </button>
              <button
                type="button"
                data-testid="add-branch-port-btn"
                onClick={() => {
                  const newPort: BranchingPortConfig = {
                    portId: `branch_${branchingPorts.length + 1}`,
                    label: `Branch ${branchingPorts.length + 1}`,
                    color: '#f59e0b',
                    conditionType: 'STATUS_CODE',
                    conditionExpr: '500..599',
                    actionType: 'RETRY'
                  };
                  setBranchingPorts([...branchingPorts, newPort]);
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', fontSize: '10px', fontWeight: 600, borderRadius: '4px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer' }}
              >
                <Plus size={11} /> Add Exit Port
              </button>
            </div>

            {isBranchingOpen && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>
                  Configure dynamic exit pathways and conditional actions (Chain Request, Retry Policy, or Quarantine).
                </p>
                {branchingPorts.map((bp, idx) => (
                  <div key={bp.portId} style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', border: `1px solid ${bp.color}50`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: bp.color }} />
                        <input
                          type="text"
                          value={bp.label}
                          onChange={(e) => {
                            const updated = [...branchingPorts];
                            updated[idx] = { ...updated[idx], label: e.target.value };
                            setBranchingPorts(updated);
                          }}
                          style={{ fontSize: '11px', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 6px', background: '#ffffff', color: '#0f172a' }}
                        />
                        <span style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>
                          ({bp.portId})
                        </span>
                      </div>
                      {branchingPorts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setBranchingPorts(branchingPorts.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                          title="Remove Branch Port"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Condition</span>
                        <select
                          value={bp.conditionType}
                          onChange={(e) => {
                            const updated = [...branchingPorts];
                            updated[idx] = { ...updated[idx], conditionType: e.target.value as BranchingPortConditionType };
                            setBranchingPorts(updated);
                          }}
                          style={{ width: '100%', fontSize: '10px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                        >
                          <option value="STATUS_CODE">HTTP Status Code</option>
                          <option value="JSON_PATH">JSONPath Check</option>
                          <option value="SCRIPT">Janino Script</option>
                          <option value="ALWAYS">Always Take</option>
                        </select>
                      </div>
                      <div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '2px' }}>Action</span>
                        <select
                          value={bp.actionType}
                          onChange={(e) => {
                            const updated = [...branchingPorts];
                            updated[idx] = { ...updated[idx], actionType: e.target.value as BranchingPortActionType };
                            setBranchingPorts(updated);
                          }}
                          style={{ width: '100%', fontSize: '10px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                        >
                          <option value="CONTINUE">Forward to Next Node</option>
                          <option value="CHAIN_REQUEST">Chain Another Request</option>
                          <option value="RETRY">Trigger Retry Policy</option>
                          <option value="FAIL_RECORD">Fail / Quarantine Record</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="e.g. 200..299 or $.status == 'APPROVED'"
                        value={bp.conditionExpr}
                        onChange={(e) => {
                          const updated = [...branchingPorts];
                          updated[idx] = { ...updated[idx], conditionExpr: e.target.value };
                          setBranchingPorts(updated);
                        }}
                        style={{ width: '100%', fontSize: '10px', fontFamily: 'monospace', padding: '4px 6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Drawer Footer Actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card-subtle, #f8fafc)',
          flexShrink: 0
        }}>
          <button
            type="button"
            data-testid="drawer-dry-run-btn"
            onClick={() => onOpenDryRun({ ...node, label, config })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              color: 'var(--text-main, #334155)',
              cursor: 'pointer'
            }}
          >
            <Play size={14} className="text-emerald-600" /> Test / Dry-Run
          </button>

          <button
            type="button"
            data-testid="drawer-save-btn"
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '8px',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(37,99,235,0.2)'
            }}
          >
            <Save size={14} /> Apply Changes
          </button>
        </div>
      </aside>

      {/* ---------------- FULL CODE STUDIO MODAL ---------------- */}
      {isStudioModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            padding: '24px'
          }}
          onClick={() => setIsStudioModalOpen(false)}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '860px',
              height: '80vh',
              maxHeight: '750px',
              background: '#0f172a',
              color: '#f8fafc',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '6px', background: '#312e81', borderRadius: '8px' }}>
                  <Code2 size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                    Java 21 / Janino Script Studio
                  </h3>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    Target: {node.label} ({nodeRole} Stream Hook)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStudioModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Toolbar */}
            <div style={{
              padding: '10px 24px',
              background: '#1e293b',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#cbd5e1' }}>Templates:</span>
                <button
                  type="button"
                  onClick={() => handleInsertScriptTemplate('PRE_REQUEST')}
                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}
                >
                  Pre-Request
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertScriptTemplate('POST_RESPONSE')}
                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}
                >
                  Post-Response
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertScriptTemplate('RECORD_MAPPER')}
                  style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: '#334155', color: '#e2e8f0', border: 'none', cursor: 'pointer' }}
                >
                  Record Mapper
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <code>input</code>
                <span>&bull;</span>
                <code>headers</code>
                <span>&bull;</span>
                <code>config</code>
              </div>
            </div>

            {/* Modal Code Textarea */}
            <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: 0 }}>
              <textarea
                data-testid="studio-modal-code-textarea"
                rows={16}
                value={config.customCode || ''}
                onChange={(e) => {
                  handleConfigChange('customCode', e.target.value);
                  setScriptValidationStatus(null);
                }}
                placeholder="// Enter Java 21 statements to execute in Janino sandbox&#10;// Must return Map<String, Object>&#10;input.put(&quot;status&quot;, &quot;PROCESSED&quot;);&#10;return input;"
                style={{
                  width: '100%',
                  flex: 1,
                  boxSizing: 'border-box',
                  padding: '14px',
                  fontSize: '13px',
                  fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: '#020617',
                  color: '#38bdf8',
                  lineHeight: 1.6,
                  resize: 'none'
                }}
              />

              {scriptValidationStatus?.errorMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  fontSize: '12px',
                  color: '#fca5a5',
                  fontFamily: 'monospace'
                }}>
                  {scriptValidationStatus.errorMessage}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#1e293b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  type="button"
                  data-testid="studio-modal-validate-btn"
                  onClick={() => handleValidateScript()}
                  disabled={scriptValidationStatus?.validating}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    background: '#4f46e5',
                    color: '#ffffff',
                    border: 'none',
                    cursor: scriptValidationStatus?.validating ? 'not-allowed' : 'pointer'
                  }}
                >
                  <CheckCircle2 size={14} /> {scriptValidationStatus?.validating ? 'Compiling...' : 'Validate Code (Janino)'}
                </button>

                {scriptValidationStatus && !scriptValidationStatus.validating && (
                  <span style={{ fontSize: '12px', fontWeight: 600, color: scriptValidationStatus.valid ? '#4ade80' : '#f87171' }}>
                    {scriptValidationStatus.valid ? `✓ Syntax Valid (${scriptValidationStatus.compilationTimeMicros || 0}µs)` : `✗ Compilation Failed`}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsStudioModalOpen(false)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #475569',
                    background: 'transparent',
                    color: '#cbd5e1',
                    cursor: 'pointer'
                  }}
                >
                  Done
                </button>
                <button
                  type="button"
                  data-testid="studio-modal-apply-btn"
                  onClick={() => {
                    handleSave();
                    setIsStudioModalOpen(false);
                  }}
                  style={{
                    padding: '7px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--primary, #2563eb)',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  Apply & Close Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- JSON SCHEMA / SAMPLE PARSER MODAL ---------------- */}
      {jsonModalMode && (
        <div 
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '560px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} className="text-blue-600" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Auto-Generate Structure ({jsonModalMode === 'REQUEST' ? 'Request Body' : 'Response JSONPath'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setJsonModalMode(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                Paste JSON Schema (Draft-04/07/2020) or a raw sample JSON payload. The generator will synthesize typed fields and parameterized <code>$$&#123;param&#125;</code> body templates or JSONPath mappings.
              </p>

              {jsonModalMode === 'REQUEST' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={jsonModalIsSchema}
                    onChange={(e) => setJsonModalIsSchema(e.target.checked)}
                  />
                  <span>Input is formal JSON Schema (e.g. contains <code>"properties"</code> or <code>"type": "object"</code>)</span>
                </label>
              )}

              <textarea
                data-testid="json-structure-modal-input"
                rows={9}
                placeholder={jsonModalMode === 'REQUEST' 
                  ? '{\n  "customerId": 1024,\n  "email": "ops@acme.com",\n  "active": true\n}'
                  : '{\n  "status": "SUCCESS",\n  "data": {\n    "id": 1024,\n    "tier": "GOLD"\n  }\n}'}
                value={jsonModalInput}
                onChange={(e) => setJsonModalInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  lineHeight: 1.4
                }}
              />

              {jsonModalError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px' }}>
                  {jsonModalError}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setJsonModalMode(null)}
                style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="apply-json-structure-btn"
                onClick={handleApplyJsonStructure}
                style={{ padding: '7px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: 'none', background: 'var(--primary, #2563eb)', color: '#ffffff', cursor: 'pointer' }}
              >
                Parse & Apply Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- XPATH EXTRACTION MODAL ---------------- */}
      {isXPathModalOpen && (
        <div 
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            padding: '20px'
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '560px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -15px rgba(0,0,0,0.3)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} className="text-purple-600" />
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Auto-Extract XPath Mappings from XML
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsXPathModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                Paste a sample XML or SOAP response payload. Discovered elements and attributes will be automatically mapped to field keys.
              </p>

              <textarea
                data-testid="sample-xml-modal-input"
                rows={9}
                placeholder="<soap:Envelope xmlns:soap='http://schemas.xmlsoap.org/soap/envelope/'>&#10;  <soap:Body>&#10;    <CustomerResponse>&#10;      <Status>ACTIVE</Status>&#10;      <Balance currency='USD'>95400.25</Balance>&#10;    </CustomerResponse>&#10;  </soap:Body>&#10;</soap:Envelope>"
                value={sampleXmlInput}
                onChange={(e) => setSampleXmlInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  lineHeight: 1.4
                }}
              />

              {xpathError && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px' }}>
                  {xpathError}
                </div>
              )}
            </div>

            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => setIsXPathModalOpen(false)}
                style={{ padding: '7px 14px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="apply-xpath-extraction-btn"
                onClick={handleApplyXPathExtraction}
                style={{ padding: '7px 16px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', border: 'none', background: 'var(--primary, #2563eb)', color: '#ffffff', cursor: 'pointer' }}
              >
                Extract XPath Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
