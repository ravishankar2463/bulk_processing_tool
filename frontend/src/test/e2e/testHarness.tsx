import React, { useState } from 'react';
import { 
  ProcessRoute, 
  PipelineStepConfig, 
  FileExecutionJob,
  FileDiagnosticsData 
} from '../../types/process';
import { 
  preSeededRoutes, 
  preSeededJobs, 
  mockDiagnosticsData 
} from './fixtures';
import { ProcessCatalog, ProcessCatalogProps } from '../../components/catalog/ProcessCatalog';
import { 
  VisualStepPipeline, 
  VisualStepPipelineProps, 
  BatchDropzone, 
  BatchDropzoneProps, 
  ExecutionQueue, 
  ExecutionQueueProps, 
  ProcessWorkspace, 
  ProcessWorkspaceProps 
} from '../../components/workspace/ProcessWorkspace';
import { StepConfigDrawer, StepConfigDrawerProps } from '../../components/workspace/StepConfigDrawer';
import { FileDiagnosticsModal, FileDiagnosticsModalProps } from '../../components/diagnostics/FileDiagnosticsModal';

// Re-export real production components and their prop types
export {
  ProcessCatalog,
  VisualStepPipeline,
  StepConfigDrawer,
  BatchDropzone,
  ExecutionQueue,
  FileDiagnosticsModal,
  ProcessWorkspace
};

export type {
  ProcessCatalogProps,
  VisualStepPipelineProps,
  StepConfigDrawerProps,
  BatchDropzoneProps,
  ExecutionQueueProps,
  FileDiagnosticsModalProps,
  ProcessWorkspaceProps
};

// --- Full End-to-End Application Harness ---

export const FullAppHarness: React.FC = () => {
  const [routes, setRoutes] = useState<ProcessRoute[]>(preSeededRoutes as unknown as ProcessRoute[]);
  const [jobs, setJobs] = useState<FileExecutionJob[]>(preSeededJobs as unknown as FileExecutionJob[]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [diagnosticsJobId, setDiagnosticsJobId] = useState<string | null>(null);

  const activeRoute = routes.find(r => r.id === activeRouteId);
  const currentDiagnostics = diagnosticsJobId
    ? ({ ...mockDiagnosticsData, jobId: diagnosticsJobId } as unknown as FileDiagnosticsData)
    : null;

  const handleStartRoute = (routeId: string) => {
    setRoutes(routes.map(r => r.id === routeId ? { ...r, status: 'ACTIVE', health: 'HEALTHY' } : r));
  };

  const handlePauseRoute = (routeId: string) => {
    setRoutes(routes.map(r => r.id === routeId ? { ...r, status: 'PAUSED' } : r));
  };

  const handleUpdateStep = (updatedStep: PipelineStepConfig) => {
    if (!activeRouteId) return;
    setRoutes(routes.map(r => {
      if (r.id === activeRouteId) {
        return {
          ...r,
          pipelineSteps: r.pipelineSteps.map(s => s.id === updatedStep.id ? updatedStep : s)
        };
      }
      return r;
    }));
  };

  const handleUploadBatch = (files: File[]) => {
    if (!activeRouteId) return;
    const newJobs: FileExecutionJob[] = files.map((file, i) => ({
      id: `job-upload-${Date.now()}-${i}`,
      processId: activeRouteId,
      fileName: file.name,
      fileSizeBytes: file.size || 5000000,
      stage: 'INGESTING',
      status: 'QUEUED',
      totalRecords: 10000,
      processedRecords: 0,
      failedRecords: 0,
      submittedAt: new Date().toISOString(),
      checksumSha256: 'mock-sha256-uploaded-file',
      detectedEncoding: 'UTF-8',
      detectedDelimiter: ',',
      loomThreadAllocation: 'VirtualThread[#upload-worker]'
    }));
    setJobs([...newJobs, ...jobs]);
  };

  const handleJobAction = (action: 'PAUSE' | 'RESUME' | 'RETRY' | 'CANCEL' | 'DOWNLOAD_REPORT', jobId: string) => {
    if (action === 'PAUSE') {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'PAUSED' } : j));
    } else if (action === 'RESUME') {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'RUNNING' } : j));
    } else if (action === 'RETRY') {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'RUNNING', failedRecords: 0, stage: 'IN_FLIGHT' } : j));
    } else if (action === 'CANCEL') {
      setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'FAILED' } : j));
    }
  };

  return (
    <div data-testid="enterprise-bulk-processor-app" style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      <header style={{ background: '#0f172a', color: '#ffffff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Enterprise Bulk Processing Hub</h1>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Java 21 Loom Virtual Threads · Apache Camel</span>
      </header>

      <main style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 16px' }}>
        {activeRoute ? (
          <ProcessWorkspace
            route={activeRoute}
            jobs={jobs}
            onBackToCatalog={() => setActiveRouteId(null)}
            onUpdateStep={handleUpdateStep}
            onUploadBatch={handleUploadBatch}
            onJobAction={handleJobAction}
            onInspectFile={(jobId) => setDiagnosticsJobId(jobId)}
          />
        ) : (
          <ProcessCatalog
            routes={routes}
            onSelectRoute={(id) => setActiveRouteId(id)}
            onStartRoute={handleStartRoute}
            onPauseRoute={handlePauseRoute}
          />
        )}
      </main>

      <FileDiagnosticsModal
        isOpen={diagnosticsJobId !== null}
        diagnostics={currentDiagnostics}
        onClose={() => setDiagnosticsJobId(null)}
      />
    </div>
  );
};
