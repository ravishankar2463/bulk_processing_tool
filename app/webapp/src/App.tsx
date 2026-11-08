import React, { useState, useEffect } from 'react';
import { 
  GitMerge,
  Plus,
  Code2,
  AlertOctagon
} from 'lucide-react';
import { UserDashboard, UserJob } from './components/user/UserDashboard';
import { UserErrorInspector } from './components/user/UserErrorInspector';
import { AdminRouteStudio, RouteConfigData } from './components/admin/AdminRouteStudio';
import { ComponentInstanceData } from './components/admin/AdminComponentWizard';
import { AdminDlqConsole, DlqErrorItem } from './components/admin/AdminDlqConsole';
import { PipelineDefinitionData } from './components/admin/AdminPipelineWizard';
import { ProcessWorkspace } from './components/workspace/ProcessWorkspace';
import { FileDiagnosticsModal } from './components/diagnostics/FileDiagnosticsModal';
import { AppHeader } from './components/navigation/AppHeader';
import { PortalBreadcrumbs } from './components/navigation/PortalBreadcrumbs';
import { AdminModalsContainer } from './components/admin/AdminModalsContainer';
import { AdminComponentLibrary } from './components/admin/AdminComponentLibrary';
import { AdminConnectorsAndTopologyStudio } from './components/admin/topology/AdminConnectorsAndTopologyStudio';
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
  const [adminSubTab, setAdminSubTab] = useState<'ROUTES' | 'CONNECTORS' | 'COMPONENTS' | 'DLQ'>('ROUTES');
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
      totalRecords: 5000,
      processedRecords: 5000,
      successfulRecords: 5000,
      failedRecords: 0,
      startTime: new Date(Date.now() - 3600000).toISOString()
    },
    {
      jobId: 'job-103',
      fileName: 'transactions.csv',
      status: 'FAILED',
      totalRecords: 1200,
      processedRecords: 450,
      successfulRecords: 400,
      failedRecords: 50,
      startTime: new Date(Date.now() - 7200000).toISOString()
    }
  ]);

  // DLQ Errors State
  const [dlqErrors, setDlqErrors] = useState<DlqErrorItem[]>([
    {
      errorId: 2041,
      jobId: 'job-101',
      batchId: 'batch-001',
      sequenceNumber: 14,
      stepName: 'DYNAMIC_VALIDATOR',
      errorCode: 'INVALID_EMAIL_SYNTAX',
      errorMessage: 'Email fails RFC 5322 syntax regex',
      rawPayload: '{"id": 14, "email": "bad-user@tempmail.com"}'
    },
    {
      errorId: 2042,
      jobId: 'job-103',
      batchId: 'batch-002',
      sequenceNumber: 99,
      stepName: 'DYNAMIC_VALIDATOR',
      errorCode: 'INVALID_AMOUNT',
      errorMessage: 'Amount cannot be negative (-45.00)',
      rawPayload: '{"id": 99, "amount": -45.00}'
    }
  ]);

  // Admin Studio State
  const [routes, setRoutes] = useState<RouteConfigData[]>([
    {
      routeId: 'customer-master-onboarding',
      name: 'Customer Master Onboarding',
      status: 'ACTIVE',
      sourceEndpoint: 'file://data/inbox/customer-master-onboarding?include=.*\\.csv',
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-kyc-01',
      processorInstanceId: 'proc-customer-enricher',
      writerInstanceId: 'writer-audit-csv',
      batchSize: 500,
      parallelConsumers: 8
    },
    {
      routeId: 'order-fulfillment-stream',
      name: 'Order Fulfillment Stream',
      status: 'ACTIVE',
      sourceEndpoint: 'file://data/inbox/order-fulfillment-stream?include=.*\\.csv',
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-order-schema',
      processorInstanceId: 'proc-tax-calc',
      writerInstanceId: 'writer-audit-csv',
      batchSize: 250,
      parallelConsumers: 16
    },
    {
      routeId: 'financial-reconciliation',
      name: 'Financial Reconciliation',
      status: 'PAUSED',
      sourceEndpoint: 'file://data/inbox/financial-reconciliation?include=.*\\.csv',
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-order-schema',
      processorInstanceId: 'proc-tax-calc',
      writerInstanceId: 'writer-audit-csv',
      batchSize: 1000,
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
    },
    {
      instanceId: 'splitter-csv-univocity',
      componentType: 'SPLITTER',
      name: 'Streaming CSV Splitter',
      description: 'Univocity streaming CSV parser with virtual thread chunking and zero-copy buffering',
      executionMode: 'CODE_SNIPPET',
      language: 'JAVA',
      sourceCode: '// Univocity CSV Splitter\npublic List<Record> split(InputStream in, int chunkSize) {\n    return UnivocityParser.parseChunks(in, chunkSize, \',\');\n}',
      sampleTestPayload: '{"chunkSize": 500, "delimiter": ",", "hasHeader": true}'
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
  const [topologyStudioMode, setTopologyStudioMode] = useState<'EDIT' | 'VIEW'>('EDIT');

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
      {/* Extracted Header & Telemetry Bar */}
      <AppHeader
        theme={theme}
        onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'USER') {
            setActiveWorkspaceRouteId(null);
          }
          setUserInspectingJobId(null);
        }}
        activeProcessingCount={activeProcessingCount}
        dlqErrorCount={dlqErrors.length}
      />

      {/* Extracted Breadcrumb Navigation Trail */}
      <PortalBreadcrumbs
        activeTab={activeTab}
        activeWorkspaceRouteId={activeWorkspaceRouteId}
        activeRouteName={activeRoute?.name}
        adminSubTab={adminSubTab}
        onNavigateHome={() => {
          setActiveTab('USER');
          setActiveWorkspaceRouteId(null);
          setUserInspectingJobId(null);
        }}
        onNavigateRouteCatalog={() => setActiveWorkspaceRouteId(null)}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 24px' }}>
        {/* User Portal View */}
        {activeTab === 'USER' && (
          <div>
            {activeWorkspaceRouteId ? (
              <ProcessWorkspace
                route={processRoutes.find(r => r.id === activeWorkspaceRouteId) || processRoutes[0]}
                jobs={(() => {
                  const allJobs = [...processJobs];
                  const seen = new Set(allJobs.map(j => j.id));
                  for (const j of jobs) {
                    if (!seen.has(j.jobId)) {
                      allJobs.push({
                        id: j.jobId,
                        processId: j.processId || activeWorkspaceRouteId,
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
                      });
                      seen.add(j.jobId);
                    }
                  }
                  return allJobs;
                })()}
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
            ) : userInspectingJobId ? (
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
                  data-testid="admin-subtab-connectors"
                  onClick={() => setAdminSubTab('CONNECTORS')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '15px',
                    fontWeight: adminSubTab === 'CONNECTORS' ? 700 : 500,
                    color: adminSubTab === 'CONNECTORS' ? 'var(--primary, #2563eb)' : 'var(--text-muted, #64748b)',
                    borderBottom: adminSubTab === 'CONNECTORS' ? '2px solid var(--primary, #2563eb)' : '2px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <GitMerge size={16} /> Route DAG Studio
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
                  <Code2 size={16} /> <span>Node Library</span><span style={{ display: 'none' }}>Component Library</span>
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
                <button
                  onClick={() => setActiveModal('WIZARD')}
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
                  <Plus size={14} /> New Node
                </button>
              )}

              {adminSubTab === 'ROUTES' && (
                <button
                  data-testid="open-topology-studio-header-btn"
                  onClick={() => {
                    setTopologyStudioMode('EDIT');
                    setAdminSubTab('CONNECTORS');
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
                  <GitMerge size={14} /> Open Route Topology DAG
                </button>
              )}
            </div>

            {/* Dynamic Route Studio */}
            {adminSubTab === 'ROUTES' && (
              <AdminRouteStudio
                routes={routes}
                onToggleStatus={handleToggleRoute}
                onEditRoute={(route) => {
                  setActiveWorkspaceRouteId(route.routeId);
                  setTopologyStudioMode('EDIT');
                  setAdminSubTab('CONNECTORS');
                }}
                onCreateRoute={() => {
                  setTopologyStudioMode('EDIT');
                  setAdminSubTab('CONNECTORS');
                }}
                onViewWorkspace={(routeId) => {
                  setActiveWorkspaceRouteId(routeId);
                  setActiveTab('USER');
                }}
                onInspectComponent={(compInstanceId) => {
                  const found = components.find(c => c.instanceId === compInstanceId);
                  if (found) {
                    setEditingComponent(found);
                    setActiveModal('EDITOR');
                  }
                }}
                onDesignTopology={(routeId) => {
                  setActiveWorkspaceRouteId(routeId);
                  setTopologyStudioMode('EDIT');
                  setAdminSubTab('CONNECTORS');
                }}
              />
            )}

            {/* Dynamic Connectors & Route Topology DAG Canvas */}
            {adminSubTab === 'CONNECTORS' && (
              <AdminConnectorsAndTopologyStudio
                routes={processRoutes}
                selectedRouteId={activeWorkspaceRouteId || undefined}
                onSelectRoute={(id) => setActiveWorkspaceRouteId(id)}
                initialMode={topologyStudioMode}
              />
            )}

            {/* Component Library Cards with Process Linkage */}
            {adminSubTab === 'COMPONENTS' && (
              <AdminComponentLibrary
                components={components}
                routes={routes}
                onEditComponent={(comp) => {
                  setEditingComponent(comp);
                  setActiveModal('EDITOR');
                }}
                onCreateComponent={() => setActiveModal('WIZARD')}
              />
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

      {/* Extracted Modal Dialog Overlays Container */}
      <AdminModalsContainer
        activeModal={activeModal}
        editingComponent={editingComponent}
        editingRoute={editingRoute}
        routes={routes}
        onSaveComponent={handleSaveComponent}
        onSavePipeline={handleSavePipeline}
        onUploadSubmit={handleUploadSubmit}
        onCloseModal={() => setActiveModal('NONE')}
        onClearEditingComponent={() => setEditingComponent(undefined)}
        onClearEditingRoute={() => setEditingRoute(null)}
      />
    </div>
  );
};

export default App;
