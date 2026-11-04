import React, { useState } from 'react';
import { Layers, ShieldCheck, Cpu, UploadCloud, Activity, Settings, Plus, Code2, Database } from 'lucide-react';
import { UserDashboard, UserJob } from './components/user/UserDashboard';
import { UserUpload, RouteOption } from './components/user/UserUpload';
import { AdminRouteStudio, RouteConfigData } from './components/admin/AdminRouteStudio';
import { AdminComponentWizard, ComponentInstanceData } from './components/admin/AdminComponentWizard';
import { AdminComponentEditor } from './components/admin/AdminComponentEditor';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'USER' | 'ADMIN'>('USER');
  const [adminSubTab, setAdminSubTab] = useState<'ROUTES' | 'COMPONENTS'>('ROUTES');

  // User Portal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
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

  const [activeModal, setActiveModal] = useState<'NONE' | 'WIZARD' | 'EDITOR' | 'UPLOAD'>('NONE');
  const [editingComponent, setEditingComponent] = useState<ComponentInstanceData | undefined>(undefined);

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
      startTime: new Date().toISOString()
    };
    setJobs([newJob, ...jobs]);
    setActiveModal('NONE');
  };

  const handleDownloadReport = (jobId: string) => {
    alert(`Downloading execution and error report for job ${jobId}...`);
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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Navigation Header */}
      <header style={{ background: '#0f172a', color: '#ffffff', padding: '0 24px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={20} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                Enterprise Bulk Processor
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Java 21 Project Loom · Apache Camel · Kafka
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('USER')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'USER' ? '#2563eb' : 'transparent',
                color: activeTab === 'USER' ? '#ffffff' : '#94a3b8',
                border: 'none'
              }}
            >
              <Activity size={16} /> User Portal
            </button>
            <button
              onClick={() => setActiveTab('ADMIN')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'ADMIN' ? '#2563eb' : 'transparent',
                color: activeTab === 'ADMIN' ? '#ffffff' : '#94a3b8',
                border: 'none'
              }}
            >
              <Settings size={16} /> Admin Studio
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '32px auto', padding: '0 24px' }}>
        {activeTab === 'USER' && (
          <div>
            <UserDashboard
              jobs={jobs}
              onDownloadReport={handleDownloadReport}
              onUploadNew={() => setActiveModal('UPLOAD')}
            />
          </div>
        )}

        {activeTab === 'ADMIN' && (
          <div>
            {/* Admin Subtabs */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  onClick={() => setAdminSubTab('ROUTES')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '15px',
                    fontWeight: adminSubTab === 'ROUTES' ? 700 : 500,
                    color: adminSubTab === 'ROUTES' ? '#2563eb' : '#64748b',
                    borderBottom: adminSubTab === 'ROUTES' ? '2px solid #2563eb' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Dynamic Route Studio
                </button>
                <button
                  onClick={() => setAdminSubTab('COMPONENTS')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '15px',
                    fontWeight: adminSubTab === 'COMPONENTS' ? 700 : 500,
                    color: adminSubTab === 'COMPONENTS' ? '#2563eb' : '#64748b',
                    borderBottom: adminSubTab === 'COMPONENTS' ? '2px solid #2563eb' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  Component Library
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer'
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      background: '#ffffff',
                      color: '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <Code2 size={14} /> Direct Code Editor
                  </button>
                </div>
              )}
            </div>

            {adminSubTab === 'ROUTES' && (
              <AdminRouteStudio
                routes={routes}
                onToggleStatus={handleToggleRoute}
                onEditRoute={() => {}}
                onCreateRoute={() => {}}
              />
            )}

            {adminSubTab === 'COMPONENTS' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
                {components.map((comp) => (
                  <div
                    key={comp.instanceId}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3' }}>
                          {comp.componentType}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {comp.language}
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
                        {comp.name}
                      </h4>
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                        {comp.description}
                      </p>
                      <pre style={{ margin: 0, padding: '8px', background: '#0f172a', color: '#94a3b8', borderRadius: '4px', fontSize: '11px', overflowX: 'auto', maxHeight: '70px' }}>
                        {comp.sourceCode}
                      </pre>
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingComponent(comp);
                          setActiveModal('EDITOR');
                        }}
                        style={{ padding: '6px 12px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Edit Code
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal Overlays */}
      {activeModal !== 'NONE' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
            overflowY: 'auto'
          }}
        >
          <div style={{ width: '100%', maxWidth: activeModal === 'UPLOAD' ? '650px' : '960px' }}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
