import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Cpu, 
  Activity, 
  Settings, 
  Plus, 
  Code2, 
  AlertOctagon, 
  GitMerge,
  Server,
  Zap,
  Sun,
  Moon,
  ChevronRight,
  Home,
  CheckCircle2,
  FileSpreadsheet,
  Workflow
} from 'lucide-react';
import { UserDashboard, UserJob } from './components/user/UserDashboard';
import { UserUpload } from './components/user/UserUpload';
import { UserErrorInspector } from './components/user/UserErrorInspector';
import { AdminRouteStudio, RouteConfigData } from './components/admin/AdminRouteStudio';
import { AdminComponentWizard, ComponentInstanceData } from './components/admin/AdminComponentWizard';
import { AdminComponentEditor } from './components/admin/AdminComponentEditor';
import { AdminDlqConsole, DlqErrorItem } from './components/admin/AdminDlqConsole';
import { AdminPipelineWizard, PipelineDefinitionData } from './components/admin/AdminPipelineWizard';
import { ProcessWorkspace } from './components/workspace/ProcessWorkspace';
import { FileDiagnosticsModal } from './components/diagnostics/FileDiagnosticsModal';
import { ProcessRoute, FileExecutionJob, FileDiagnosticsData } from './types/process';
import { 
  fetchCatalogRoutes, 
  fetchProcessJobs, 
  fetchJobDiagnostics, 
  getImmediateJobDiagnostics,
  fetchComponents,
  saveComponent,
  fetchDlqErrors,
  resubmitDlqRecord,
  pauseJob as apiPauseJob, 
  resumeJob as apiResumeJob, 
  retryJob as apiRetryJob, 
  cancelJob as apiCancelJob, 
  batchUploadFiles as apiBatchUpload 
} from './services/apiClient';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN'>('USER');
  const [adminSubTab, setAdminSubTab] = useState<'ROUTES' | 'COMPONENTS' | 'DLQ'>('ROUTES');
  const [userInspectingJobId, setUserInspectingJobId] = useState<string | null>(null);

  // 3-Tier Enterprise Hierarchy State
  const [activeWorkspaceRouteId, setActiveWorkspaceRouteId] = useState<string | null>(null);
  const [diagnosticsJobId, setDiagnosticsJobId] = useState<string | null>(null);
  const [currentDiagnostics, setCurrentDiagnostics] = useState<FileDiagnosticsData | null>(null);
  const [processRoutes, setProcessRoutes] = useState<ProcessRoute[]>([]);
  const [processJobs, setProcessJobs] = useState<FileExecutionJob[]>([]);

  // Apply theme class to document body / root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else {
      document.documentElement.classList.remove('theme-dark');
    }
  }, [theme]);

  // Map ProcessRoute to RouteConfigData for Admin Studio
  const mapProcessRouteToAdmin = (r: ProcessRoute): RouteConfigData => {
    return {
      routeId: r.id,
      name: r.name,
      status: r.status,
      sourceEndpoint: `file://data/inbox/${r.id}?include=.*\\.csv`,
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-customer-kyc',
      processorInstanceId: 'proc-customer-enricher',
      writerInstanceId: 'writer-audit-csv',
      batchSize: 500,
      parallelConsumers: 8
    };
  };

  // User Portal Jobs State
  const [jobs, setJobs] = useState<UserJob[]>([
    {
      jobId: 'job-101',
      fileName: 'customers.csv',
      status: 'PROCESSING',
      totalRecords: 10000,
      processedRecords: 6500,
      successfulRecords: 6480,
      failedRecords: 20,
      startTime: new Date().toISOString()
    },
    {
      jobId: 'job-102',
      fileName: 'orders.csv',
      status: 'COMPLETED',
      totalRecords: 500,
      processedRecords: 500,
      successfulRecords: 500,
      failedRecords: 0,
      startTime: new Date(Date.now() - 3600000).toISOString()
    }
  ]);

  // DLQ Errors State
  const [dlqErrors, setDlqErrors] = useState<DlqErrorItem[]>([
    {
      errorId: 101,
      jobId: 'job-101',
      sequenceNumber: 42,
      stepName: 'DYNAMIC_VALIDATOR',
      errorCode: 'MISSING_EMAIL',
      errorMessage: 'Email is required on customer record',
      rawPayload: '{"id": 42, "name": "John Doe", "email": ""}'
    },
    {
      errorId: 102,
      jobId: 'job-101',
      sequenceNumber: 156,
      stepName: 'DYNAMIC_VALIDATOR',
      errorCode: 'INVALID_DOMAIN',
      errorMessage: 'Domain @tempmail.com is rejected by corporate policy',
      rawPayload: '{"id": 156, "name": "Fake User", "email": "fake@tempmail.com"}'
    }
  ]);

  // Admin Studio State
  const [routes, setRoutes] = useState<RouteConfigData[]>([
    {
      routeId: 'csv-customer-ingest',
      name: 'Customer CSV Ingestion Pipeline',
      status: 'ACTIVE',
      sourceEndpoint: 'file://data/inbox?include=.*\\.csv',
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-kyc-01',
      processorInstanceId: 'proc-customer-enricher',
      writerInstanceId: 'writer-json-s3',
      batchSize: 500,
      parallelConsumers: 8
    },
    {
      routeId: 'csv-order-stream',
      name: 'Order Processing Stream',
      status: 'PAUSED',
      sourceEndpoint: 'kafka:orders.incoming',
      splitterInstanceId: 'splitter-default',
      validatorInstanceId: 'val-order-schema',
      processorInstanceId: 'proc-tax-calc',
      writerInstanceId: 'writer-db-upsert',
      batchSize: 200,
      parallelConsumers: 4
    }
  ]);

  const [components, setComponents] = useState<ComponentInstanceData[]>([
    {
      instanceId: 'val-kyc-01',
      componentType: 'VALIDATOR',
      name: 'Customer KYC Email Validator',
      description: 'Ensures email domain and formatting matches compliance standards',
      executionMode: 'CODE_SNIPPET',
      language: 'JAVA',
      sourceCode: '// Java 21 Validation Script\nif (!record.containsKey("email")) {\n    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("MISSING_EMAIL", "Email required");\n}\nreturn com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();',
      sampleTestPayload: '{"id": 101, "email": "test@example.com"}'
    },
    {
      instanceId: 'proc-customer-enricher',
      componentType: 'BATCH_PROCESSOR',
      name: 'Customer Tier Enricher',
      description: 'Calculates loyalty points and assigns bronze/silver/gold tier',
      executionMode: 'CODE_SNIPPET',
      language: 'JAVA',
      sourceCode: '// Java 21 Batch Processor Script\njava.util.Map result = new java.util.HashMap(record);\nresult.put("tier", "GOLD");\nreturn result;',
      sampleTestPayload: '{"id": 101, "spend": 5000}'
    }
  ]);

  // Load and synchronize all shared demo fixtures from apiClient
  useEffect(() => {
    fetchCatalogRoutes().then(data => {
      setProcessRoutes(data);
      const mappedAdmin = data.map(mapProcessRouteToAdmin);
      setRoutes(prev => {
        const existingMap = new Map(prev.map(r => [r.routeId, r]));
        mappedAdmin.forEach(mr => existingMap.set(mr.routeId, mr));
        return Array.from(existingMap.values());
      });
    }).catch(() => {});

    fetchProcessJobs().then(pJobs => {
      setProcessJobs(pJobs);
      if (pJobs && pJobs.length > 0) {
        setJobs(prev => {
          const existingIds = new Set(prev.map(j => j.jobId));
          const newOnes: UserJob[] = pJobs
            .filter(pj => !existingIds.has(pj.id))
            .map(pj => ({
              jobId: pj.id,
              fileName: pj.fileName,
              status: pj.status,
              totalRecords: pj.totalRecords,
              processedRecords: pj.processedRecords,
              successfulRecords: Math.max(0, pj.processedRecords - pj.failedRecords),
              failedRecords: pj.failedRecords,
              startTime: pj.submittedAt || new Date().toISOString(),
              processId: pj.processId
            }));
          return [...prev, ...newOnes];
        });
      }
    }).catch(() => {});

    fetchComponents().then(comps => {
      if (comps && comps.length > 0) {
        setComponents(prev => {
          const map = new Map(prev.map(c => [c.instanceId, c]));
          comps.forEach(c => map.set(c.instanceId, {
            instanceId: c.instanceId,
            componentType: c.componentType,
            name: c.name,
            description: c.description,
            executionMode: c.executionMode,
            language: c.language,
            sourceCode: c.sourceCode,
            sampleTestPayload: c.sampleTestPayload || '{}'
          }));
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

    fetchDlqErrors().then(errs => {
      if (errs && errs.length > 0) {
        setDlqErrors(prev => {
          const existing = new Set(prev.map(e => e.errorId));
          const additions: DlqErrorItem[] = errs
            .map((e, idx) => ({
              errorId: e.lineNumber || (idx + 101),
              jobId: e.jobId || 'job-cmo-001',
              batchId: e.batchId,
              sequenceNumber: e.sequenceNumber || e.lineNumber,
              stepName: e.stepName || 'DYNAMIC_VALIDATOR',
              errorCode: e.errorCode,
              errorMessage: e.errorMessage,
              rawPayload: e.rawPayload
            }))
            .filter(e => !existing.has(e.errorId));
          return [...prev, ...additions];
        });
      }
    }).catch(() => {});
  }, []);

  const handleInspectDiagnostics = (jobId: string) => {
    setDiagnosticsJobId(jobId);
    const immediate = getImmediateJobDiagnostics(jobId);
    if (immediate) {
      setCurrentDiagnostics(immediate);
    }
  };

  useEffect(() => {
    if (diagnosticsJobId) {
      const immediate = getImmediateJobDiagnostics(diagnosticsJobId);
      if (immediate && !currentDiagnostics) {
        setCurrentDiagnostics(immediate);
      }
      fetchJobDiagnostics(diagnosticsJobId).then(diag => {
        if (diag) setCurrentDiagnostics(diag);
      }).catch(() => {});
    } else {
      setCurrentDiagnostics(null);
    }
  }, [diagnosticsJobId]);

  const [activeModal, setActiveModal] = useState<'NONE' | 'WIZARD' | 'EDITOR' | 'UPLOAD' | 'PIPELINE_WIZARD'>('NONE');
  const [editingComponent, setEditingComponent] = useState<ComponentInstanceData | undefined>(undefined);
  const [editingRoute, setEditingRoute] = useState<RouteConfigData | null>(null);

  // User Actions
  const handleUploadSubmit = (file: File, routeId: string) => {
    const newJob: UserJob = {
      jobId: `job-${Date.now().toString().slice(-4)}`,
      fileName: file.name,
      status: 'PROCESSING',
      totalRecords: 1000,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      startTime: new Date().toISOString(),
      processId: routeId
    };
    setJobs([newJob, ...jobs]);
    setActiveModal('NONE');
  };

  const handleDownloadReport = (jobId: string) => {
    handleInspectDiagnostics(jobId);
  };

  // Admin Actions
  const handleToggleRoute = (routeId: string) => {
    setRoutes(routes.map(r => {
      if (r.routeId === routeId) {
        return { ...r, status: r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' };
      }
      return r;
    }));
  };

  const handleSaveComponent = (data: ComponentInstanceData) => {
    saveComponent({
      ...data,
      componentType: data.componentType as 'SPLITTER' | 'VALIDATOR' | 'BATCH_PROCESSOR' | 'REPORT_WRITER',
      executionMode: (data.executionMode === 'DECLARATIVE_RULE' || data.executionMode === 'COMPILED_BEAN' ? data.executionMode : 'CODE_SNIPPET'),
      language: (data.language === 'PYTHON' || data.language === 'GROOVY' ? data.language : 'JAVA')
    }).catch(() => {});
    const existingIndex = components.findIndex(c => c.instanceId === data.instanceId);
    if (existingIndex >= 0) {
      const updated = [...components];
      updated[existingIndex] = data;
      setComponents(updated);
    } else {
      setComponents([...components, data]);
    }
    setActiveModal('NONE');
    setEditingComponent(undefined);
  };

  const handleSavePipeline = (data: PipelineDefinitionData) => {
    const existingIndex = routes.findIndex(r => r.routeId === data.processId);
    if (existingIndex >= 0) {
      const updatedRoute: RouteConfigData = {
        ...routes[existingIndex],
        name: data.name,
        splitterInstanceId: data.splitterInstanceId,
        validatorInstanceId: data.validatorInstanceIds[0] || 'none',
        processorInstanceId: data.processorInstanceIds[0] || 'none',
        writerInstanceId: data.reportWriterInstanceId,
        batchSize: data.batchSize
      };
      const updated = [...routes];
      updated[existingIndex] = updatedRoute;
      setRoutes(updated);

      const pIndex = processRoutes.findIndex(p => p.id === data.processId);
      if (pIndex >= 0) {
        const existingProcess = processRoutes[pIndex];
        const updatedProcess: ProcessRoute = {
          ...existingProcess,
          name: data.name,
          pipelineSteps: existingProcess.pipelineSteps.map(step => {
            if (step.id === 'splitter') {
              return { ...step, parameters: { ...step.parameters, chunkSize: data.batchSize } };
            }
            return step;
          })
        };
        const pUpdated = [...processRoutes];
        pUpdated[pIndex] = updatedProcess;
        setProcessRoutes(pUpdated);
      }
    } else {
      const newRoute: RouteConfigData = {
        routeId: data.processId,
        name: data.name,
        status: 'ACTIVE',
        sourceEndpoint: 'file://data/inbox',
        splitterInstanceId: data.splitterInstanceId,
        validatorInstanceId: data.validatorInstanceIds[0] || 'none',
        processorInstanceId: data.processorInstanceIds[0] || 'none',
        writerInstanceId: data.reportWriterInstanceId,
        batchSize: data.batchSize,
        parallelConsumers: 4
      };
      setRoutes([...routes, newRoute]);
    }
    setActiveModal('NONE');
    setEditingRoute(null);
  };

  const handleResubmitDlq = (errorId: number) => {
    resubmitDlqRecord(errorId.toString()).catch(() => {});
    setDlqErrors(dlqErrors.filter(e => e.errorId !== errorId));
  };

  const activeProcessingCount = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length;
  const activeRoute = processRoutes.find(r => r.id === activeWorkspaceRouteId);

  return (
    <div className={theme === 'dark' ? 'theme-dark' : ''} style={{ minHeight: '100vh', background: 'var(--bg-app, #f8fafc)', color: 'var(--text-main, #0f172a)' }}>
      {/* Top Telemetry & Health Bar with Theme Toggle */}
      <div style={{ 
        background: '#090d16', 
        borderBottom: '1px solid #1e293b', 
        padding: '6px 24px', 
        fontSize: '11px', 
        color: '#94a3b8' 
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulsing-dot" style={{ background: '#10b981' }} />
              Camel Context: <strong style={{ color: '#f8fafc' }}>RUNNING</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={12} color="#60a5fa" />
              Loom Virtual Threads: <strong style={{ color: '#f8fafc' }}>ACTIVE (O(1) RAM)</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={12} color="#a78bfa" />
              Kafka Ingress: <strong style={{ color: '#f8fafc' }}>CONNECTED</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="headroom-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={11} /> Headroom Token Optimizer Active (-74%)
            </span>

            {/* Liquid Glass Dual-Theme Toggle */}
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle Liquid Glass Theme"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {theme === 'dark' ? <Sun size={12} color="#fbbf24" /> : <Moon size={12} color="#60a5fa" />}
              {theme === 'dark' ? 'Light Frost' : 'Dark Glass'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header style={{ 
        background: '#0f172a', 
        color: '#ffffff', 
        padding: '0 24px', 
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: '68px' 
        }}>
          {/* Logo and Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
              padding: '9px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
            }}>
              <Layers size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Enterprise Bulk Processor
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                Java 21 Project Loom · Apache Camel · Kafka
              </span>
            </div>
          </div>

          {/* Main Portal Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => {
                setActiveTab('USER');
                setUserInspectingJobId(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'USER' ? '#2563eb' : 'transparent',
                color: activeTab === 'USER' ? '#ffffff' : '#94a3b8',
                border: 'none',
                boxShadow: activeTab === 'USER' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <Activity size={15} />
              User Portal
              {activeProcessingCount > 0 && (
                <span style={{ 
                  background: activeTab === 'USER' ? '#ffffff' : '#2563eb', 
                  color: activeTab === 'USER' ? '#1d4ed8' : '#ffffff', 
                  fontSize: '10px', 
                  padding: '1px 6px', 
                  borderRadius: '999px',
                  fontWeight: 700 
                }}>
                  {activeProcessingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('ADMIN')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'ADMIN' ? '#2563eb' : 'transparent',
                color: activeTab === 'ADMIN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                boxShadow: activeTab === 'ADMIN' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <Settings size={15} />
              Admin Studio
              {dlqErrors.length > 0 && (
                <span style={{ 
                  background: '#dc2626', 
                  color: '#ffffff', 
                  fontSize: '10px', 
                  padding: '1px 6px', 
                  borderRadius: '999px',
                  fontWeight: 700 
                }}>
                  {dlqErrors.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb Navigation Trail */}
      <div style={{ background: 'var(--bg-card-subtle, #f1f5f9)', borderBottom: '1px solid var(--glass-border, #e2e8f0)', padding: '8px 24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
          <button 
            onClick={() => { setActiveTab('USER'); setActiveWorkspaceRouteId(null); setUserInspectingJobId(null); }}
            style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <Home size={13} /> Home
          </button>
          <ChevronRight size={12} />
          {activeTab === 'USER' ? (
            <>
              <button 
                onClick={() => setActiveWorkspaceRouteId(null)}
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
                    {activeRoute ? activeRoute.name : activeWorkspaceRouteId} (Workspace)
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

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>
        {activeWorkspaceRouteId ? (
          <ProcessWorkspace
            route={processRoutes.find(r => r.id === activeWorkspaceRouteId) || processRoutes[0]}
            jobs={processJobs.length > 0 ? processJobs : jobs.map(j => ({
              id: j.jobId,
              processId: activeWorkspaceRouteId,
              fileName: j.fileName,
              fileSizeBytes: 2048500,
              stage: (j.status === 'COMPLETED' ? 'DONE' : 'IN_FLIGHT') as any,
              status: (j.status === 'COMPLETED' ? 'COMPLETED' : 'RUNNING') as any,
              totalRecords: j.totalRecords,
              processedRecords: j.processedRecords,
              failedRecords: j.failedRecords,
              submittedAt: j.startTime,
              checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
              detectedEncoding: 'UTF-8',
              detectedDelimiter: ',',
              loomThreadAllocation: 'virtual-worker-101-loom-01'
            }))}
            onBackToCatalog={() => setActiveWorkspaceRouteId(null)}
            onUpdateStep={(updatedStep) => {
              setProcessRoutes(prev => prev.map(r => {
                if (r.id === activeWorkspaceRouteId) {
                  return {
                    ...r,
                    pipelineSteps: r.pipelineSteps.map(s => s.id === updatedStep.id ? updatedStep : s)
                  };
                }
                return r;
              }));
            }}
            onUploadBatch={async (files) => {
              try {
                const newJobs = await apiBatchUpload(activeWorkspaceRouteId, files);
                setProcessJobs(prev => [...newJobs, ...prev]);
              } catch {
                // fallback handled
              }
            }}
            onJobAction={async (action, jobId) => {
              if (action === 'PAUSE') {
                try { await apiPauseJob(jobId); } catch {}
                setProcessJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'PAUSED' } : j));
              } else if (action === 'RESUME') {
                try { await apiResumeJob(jobId); } catch {}
                setProcessJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'RUNNING' } : j));
              } else if (action === 'RETRY') {
                try { await apiRetryJob(jobId); } catch {}
                setProcessJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'RUNNING', failedRecords: 0, stage: 'IN_FLIGHT' } : j));
              } else if (action === 'CANCEL') {
                try { await apiCancelJob(jobId); } catch {}
                setProcessJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'FAILED', stage: 'DONE' } : j));
              } else if (action === 'DOWNLOAD_REPORT') {
                handleDownloadReport(jobId);
              }
            }}
            onInspectFile={handleInspectDiagnostics}
          />
        ) : (
          <>
            {/* User Portal View */}
            {activeTab === 'USER' && (
              <div>
                {userInspectingJobId ? (
                  <UserErrorInspector
                    jobId={userInspectingJobId}
                    errors={dlqErrors.filter(e => e.jobId === userInspectingJobId)}
                    onExportErrorCsv={() => alert(`Exporting failed rows CSV for ${userInspectingJobId}...`)}
                    onBack={() => setUserInspectingJobId(null)}
                  />
                ) : (
                  <UserDashboard
                    jobs={jobs}
                    routes={processRoutes}
                    onSelectRoute={(routeId) => setActiveWorkspaceRouteId(routeId)}
                    onDownloadReport={handleDownloadReport}
                    onUploadNew={() => setActiveModal('UPLOAD')}
                    onInspectErrors={handleInspectDiagnostics}
                  />
                )}
              </div>
            )}

            {/* Admin Studio View */}
            {activeTab === 'ADMIN' && (
              <div>
                {/* Admin Subtabs & Action Bar */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '24px', 
                  borderBottom: '1px solid var(--glass-border, #e2e8f0)', 
                  paddingBottom: '14px',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '24px' }}>
                    <button
                      onClick={() => setAdminSubTab('ROUTES')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 0',
                        fontSize: '15px',
                        fontWeight: adminSubTab === 'ROUTES' ? 700 : 500,
                        color: adminSubTab === 'ROUTES' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                        borderBottom: adminSubTab === 'ROUTES' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <GitMerge size={16} /> Dynamic Route Studio
                    </button>
                    <button
                      onClick={() => setAdminSubTab('COMPONENTS')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 0',
                        fontSize: '15px',
                        fontWeight: adminSubTab === 'COMPONENTS' ? 700 : 500,
                        color: adminSubTab === 'COMPONENTS' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                        borderBottom: adminSubTab === 'COMPONENTS' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Code2 size={16} /> Component Library
                    </button>
                    <button
                      onClick={() => setAdminSubTab('DLQ')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 0',
                        fontSize: '15px',
                        fontWeight: adminSubTab === 'DLQ' ? 700 : 500,
                        color: adminSubTab === 'DLQ' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                        borderBottom: adminSubTab === 'DLQ' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <AlertOctagon size={16} /> DLQ Error Console
                    </button>
                  </div>

                  {adminSubTab === 'COMPONENTS' && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => {
                          setEditingComponent(undefined);
                          setActiveModal('WIZARD');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'var(--primary, #2563eb)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                        }}
                      >
                        <Plus size={14} /> New Component Wizard
                      </button>
                      <button
                        onClick={() => {
                          setEditingComponent(undefined);
                          setActiveModal('EDITOR');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          background: 'var(--bg-card, #ffffff)',
                          color: 'var(--text-main, #0f172a)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}
                      >
                        <Code2 size={14} /> Direct Code Editor
                      </button>
                    </div>
                  )}

                  {adminSubTab === 'ROUTES' && (
                    <button
                      onClick={() => {
                        setEditingRoute(null);
                        setActiveModal('PIPELINE_WIZARD');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        background: 'var(--primary, #2563eb)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
                      }}
                    >
                      <GitMerge size={14} /> Assemble Pipeline Wizard
                    </button>
                  )}
                </div>

                {/* Dynamic Route Studio */}
                {adminSubTab === 'ROUTES' && (
                  <AdminRouteStudio
                    routes={routes}
                    onToggleStatus={handleToggleRoute}
                    onEditRoute={(route) => {
                      setEditingRoute(route);
                      setActiveModal('PIPELINE_WIZARD');
                    }}
                    onCreateRoute={() => {
                      setEditingRoute(null);
                      setActiveModal('PIPELINE_WIZARD');
                    }}
                    onViewWorkspace={(routeId) => setActiveWorkspaceRouteId(routeId)}
                    onInspectComponent={(compInstanceId) => {
                      const found = components.find(c => c.instanceId === compInstanceId);
                      if (found) {
                        setEditingComponent(found);
                        setActiveModal('EDITOR');
                      }
                    }}
                  />
                )}

                {/* Component Library Cards with Process Linkage */}
                {adminSubTab === 'COMPONENTS' && (
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
                              onClick={() => {
                                setEditingComponent(comp);
                                setActiveModal('EDITOR');
                              }}
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
                )}

                {/* DLQ Error Console with Job Diagnostic Link */}
                {adminSubTab === 'DLQ' && (
                  <AdminDlqConsole
                    errors={dlqErrors}
                    onResubmit={handleResubmitDlq}
                    onRefresh={() => {}}
                    onInspectJob={handleInspectDiagnostics}
                  />
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* File Diagnostics Modal (Tier 3 Slide-Out Drawer) */}
      <FileDiagnosticsModal
        diagnostics={currentDiagnostics}
        jobId={diagnosticsJobId}
        isOpen={diagnosticsJobId !== null}
        onClose={() => {
          setDiagnosticsJobId(null);
          setCurrentDiagnostics(null);
        }}
      />

      {/* Modal Dialog Overlays */}
      {activeModal !== 'NONE' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <div style={{ width: '100%', maxWidth: activeModal === 'UPLOAD' ? '680px' : '960px' }}>
            {activeModal === 'WIZARD' && (
              <AdminComponentWizard
                onSave={handleSaveComponent}
                onCancel={() => setActiveModal('NONE')}
              />
            )}
            {activeModal === 'EDITOR' && (
              <AdminComponentEditor
                initialData={editingComponent}
                onSave={handleSaveComponent}
                onCancel={() => {
                  setActiveModal('NONE');
                  setEditingComponent(undefined);
                }}
              />
            )}
            {activeModal === 'UPLOAD' && (
              <UserUpload
                availableRoutes={routes.map(r => ({ routeId: r.routeId, name: r.name }))}
                onUpload={handleUploadSubmit}
                onCancel={() => setActiveModal('NONE')}
              />
            )}
            {activeModal === 'PIPELINE_WIZARD' && (
              <AdminPipelineWizard
                initialData={editingRoute}
                onSave={handleSavePipeline}
                onCancel={() => {
                  setActiveModal('NONE');
                  setEditingRoute(null);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
