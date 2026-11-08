import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  Play, 
  Pause, 
  RotateCcw, 
  XCircle, 
  FileText, 
  AlertTriangle, 
  UploadCloud, 
  Table, 
  LayoutGrid,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { 
  ProcessRoute, 
  PipelineStepConfig, 
  FileExecutionJob, 
  JobStage, 
  StepId,
  getRouteThroughput
} from '../../types/process';
import { StepConfigDrawer } from './StepConfigDrawer';
import { 
  pauseJob as apiPauseJob, 
  resumeJob as apiResumeJob, 
  retryJob as apiRetryJob, 
  cancelJob as apiCancelJob,
  batchUploadFiles as apiBatchUpload,
  matchProcessRoute
} from '../../services/apiClient';

// --- Visual Step Pipeline Component ---

export interface VisualStepPipelineProps {
  steps: ReadonlyArray<PipelineStepConfig> | PipelineStepConfig[];
  activeStepId?: string | null;
  onStepClick: (stepId: PipelineStepConfig['id']) => void;
}

export const VisualStepPipeline: React.FC<VisualStepPipelineProps> = ({
  steps,
  activeStepId,
  onStepClick
}) => {
  return (
    <div 
      data-testid="visual-step-pipeline" 
      className="liquid-glass-card"
      style={{ 
        margin: '20px 0', 
        padding: '16px 20px', 
        borderRadius: '14px',
        border: '1px solid var(--glass-border)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Visual Step Pipeline (Click Stage to Configure)
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Apache Camel EIP Streaming Stages
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {steps.map((step, idx) => {
          const isSelected = activeStepId === step.id;
          return (
            <React.Fragment key={step.id}>
              <button
                data-testid={`pipeline-step-${step.id}`}
                onClick={() => onStepClick(step.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  minWidth: '160px',
                  boxShadow: isSelected ? '0 4px 12px rgba(37,99,235,0.2)' : 'var(--shadow-sm)',
                  transition: 'all var(--transition-spring)'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Stage {idx + 1}: {step.id}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', margin: '3px 0' }}>
                  {step.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Policy: <span data-testid={`step-policy-${step.id}`} style={{ fontWeight: 600, color: step.errorPolicy === 'FAIL_FAST' ? 'var(--danger)' : 'var(--primary)' }}>{step.errorPolicy}</span> · Concurrency: <span data-testid={`step-concurrency-${step.id}`} className="tabular-nums" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{step.concurrency}</span>
                </div>
              </button>
              {idx < steps.length - 1 && (
                <span data-testid={`pipeline-connector-${idx}`} style={{ color: 'var(--text-subtle)', fontWeight: 700, fontSize: '16px' }}>
                  ➔
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// --- Process-Targeted Batch Ingestion Dropzone ---

export interface BatchDropzoneProps {
  onFilesUploaded: (files: File[]) => void;
  disabled?: boolean;
}

export const BatchDropzone: React.FC<BatchDropzoneProps> = ({
  onFilesUploaded,
  disabled
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesUploaded(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesUploaded(Array.from(e.target.files));
    }
  };

  return (
    <div
      data-testid="batch-dropzone-container"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className="liquid-glass-card"
      style={{
        margin: '20px 0',
        padding: '24px',
        border: isDragOver ? '2px dashed var(--primary)' : '2px dashed var(--border-hover)',
        borderRadius: '14px',
        background: isDragOver ? 'var(--primary-light)' : 'var(--glass-subtle)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-spring)'
      }}
    >
      <input
        data-testid="batch-dropzone-input"
        type="file"
        multiple
        onChange={handleFileInput}
        disabled={disabled}
        style={{ display: 'none' }}
        id="batch-file-selector"
      />
      <label htmlFor="batch-file-selector" style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'block' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '10px', borderRadius: '50%' }}>
            <UploadCloud size={24} />
          </div>
        </div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
          Process-Targeted Multi-File Ingestion Dropzone
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          Drag and drop batch files (CSV, TSV, Parquet) or click to browse
        </p>
      </label>
    </div>
  );
};

// --- Multi-File Execution Queue Component ---

export interface ExecutionQueueProps {
  jobs: ReadonlyArray<FileExecutionJob> | FileExecutionJob[];
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
  onPauseJob: (jobId: string) => void;
  onResumeJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onDownloadReport: (jobId: string) => void;
  onInspectErrors: (jobId: string) => void;
}

export const ExecutionQueue: React.FC<ExecutionQueueProps> = ({
  jobs,
  viewMode,
  onViewModeChange,
  onPauseJob,
  onResumeJob,
  onRetryJob,
  onCancelJob,
  onDownloadReport,
  onInspectErrors
}) => {
  const STAGES: ReadonlyArray<JobStage> = ['INGESTING', 'SPLITTING', 'IN_FLIGHT', 'SINKING', 'DONE'];

  return (
    <div data-testid="execution-queue-container" style={{ margin: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            Multi-File Execution Queue
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {jobs.length} files tracked in process queue
          </span>
        </div>

        <div data-testid="queue-view-toggle" style={{ display: 'flex', gap: '4px', background: 'var(--bg-card-subtle)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            data-testid="view-table-btn"
            onClick={() => onViewModeChange('table')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'table' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'table' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Table size={13} /> Table View
          </button>
          <button
            data-testid="view-card-btn"
            onClick={() => onViewModeChange('card')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: viewMode === 'card' ? 'var(--primary)' : 'transparent',
              color: viewMode === 'card' ? '#ffffff' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <LayoutGrid size={13} /> Card View
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div data-testid="execution-queue-table-view" className="liquid-glass-card" style={{ overflowX: 'auto', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead style={{ background: 'var(--bg-card-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>File Name</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Stage Progression</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Records Progress</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Failures</th>
                <th style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const percent = job.totalRecords === 0 ? 0 : Math.round((job.processedRecords / job.totalRecords) * 100);
                const isRunning = job.status === 'RUNNING';
                const isPaused = job.status === 'PAUSED';
                const isCompleted = job.status === 'COMPLETED';
                const isFailed = job.status === 'FAILED';

                return (
                  <tr key={job.id} data-testid={`job-row-${job.id}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      <button
                        data-testid={`file-name-click-${job.id}`}
                        onClick={() => onInspectErrors(job.id)}
                        title="Click to view file batches, records, and step summary"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--primary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          textDecoration: 'underline',
                          textUnderlineOffset: '2px'
                        }}
                      >
                        {job.fileName}
                      </button>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }} className="tabular-nums">
                        {(job.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB · {job.detectedDelimiter} · {job.detectedEncoding}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div data-testid={`job-stage-${job.id}`} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {STAGES.map((s, idx) => {
                          const isCurrent = job.stage === s;
                          const isPast = STAGES.indexOf(job.stage) > idx;
                          return (
                            <span
                              key={s}
                              data-testid={`stage-indicator-${job.id}-${s}`}
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isCurrent ? 'var(--primary)' : isPast ? 'var(--success-bg)' : 'var(--bg-card-subtle)',
                                color: isCurrent ? '#ffffff' : isPast ? 'var(--success-text)' : 'var(--text-subtle)',
                                fontWeight: isCurrent ? 700 : 500,
                                border: isPast ? '1px solid var(--success-border)' : '1px solid transparent'
                              }}
                            >
                              {s}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div data-testid={`job-progress-${job.id}`} className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-main)' }}>
                        {percent}% ({job.processedRecords.toLocaleString('en-US')} / {job.totalRecords.toLocaleString('en-US')})
                      </div>
                      <div style={{ width: '120px', height: '6px', background: 'var(--bg-card-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: isCompleted ? 'var(--success)' : 'var(--primary)' }} />
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span 
                        data-testid={`job-failures-${job.id}`} 
                        className="tabular-nums" 
                        style={{ color: job.failedRecords > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: job.failedRecords > 0 ? 700 : 500 }}
                      >
                        {job.failedRecords} errors
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span 
                        data-testid={`job-status-${job.id}`} 
                        style={{ 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: isRunning ? 'var(--primary-light)' : isCompleted ? 'var(--success-bg)' : isPaused ? 'var(--warning-bg)' : 'var(--danger-bg)', 
                          color: isRunning ? 'var(--primary)' : isCompleted ? 'var(--success-text)' : isPaused ? 'var(--warning-text)' : 'var(--danger-text)',
                          border: `1px solid ${isRunning ? 'var(--primary-border)' : isCompleted ? 'var(--success-border)' : isPaused ? 'var(--warning-border)' : 'var(--danger-border)'}`
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {isRunning && (
                          <button 
                            data-testid={`btn-pause-${job.id}`} 
                            onClick={() => onPauseJob(job.id)} 
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}
                          >
                            Pause
                          </button>
                        )}
                        {isPaused && (
                          <button 
                            data-testid={`btn-resume-${job.id}`} 
                            onClick={() => onResumeJob(job.id)} 
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--success-border)', background: 'var(--success-bg)', color: 'var(--success-text)', cursor: 'pointer' }}
                          >
                            Resume
                          </button>
                        )}
                        {(isFailed || job.failedRecords > 0) && (
                          <button 
                            data-testid={`btn-retry-${job.id}`} 
                            onClick={() => onRetryJob(job.id)} 
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--warning-border)', background: 'var(--warning-bg)', color: 'var(--warning-text)', cursor: 'pointer' }}
                          >
                            Retry
                          </button>
                        )}
                        {!isCompleted && (
                          <button 
                            data-testid={`btn-cancel-${job.id}`} 
                            onClick={() => onCancelJob(job.id)} 
                            style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--danger-border)', background: 'var(--danger-bg)', color: 'var(--danger-text)', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        )}
                        <button 
                          data-testid={`btn-report-${job.id}`} 
                          onClick={() => onDownloadReport(job.id)} 
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}
                        >
                          Download Report
                        </button>
                        <button 
                          data-testid={`btn-inspect-${job.id}`} 
                          onClick={() => onInspectErrors(job.id)} 
                          style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Inspect Errors
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div data-testid="execution-queue-card-view" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {jobs.map((job) => {
            const percent = job.totalRecords === 0 ? 0 : Math.round((job.processedRecords / job.totalRecords) * 100);
            const isRunning = job.status === 'RUNNING';
            const isPaused = job.status === 'PAUSED';
            const isCompleted = job.status === 'COMPLETED';
            const isFailed = job.status === 'FAILED';

            return (
              <div 
                key={job.id} 
                data-testid={`job-card-${job.id}`} 
                className="liquid-glass-card"
                style={{ 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid var(--glass-border)', 
                  background: 'var(--bg-card)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span data-testid={`card-job-stage-${job.id}`} style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary)' }}>
                      {job.stage}
                    </span>
                    <span data-testid={`card-job-status-${job.id}`} style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: isRunning ? 'var(--primary-light)' : isCompleted ? 'var(--success-bg)' : isPaused ? 'var(--warning-bg)' : 'var(--danger-bg)', color: isRunning ? 'var(--primary)' : isCompleted ? 'var(--success-text)' : isPaused ? 'var(--warning-text)' : 'var(--danger-text)' }}>
                      {job.status}
                    </span>
                  </div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
                    <button
                      data-testid={`card-file-name-click-${job.id}`}
                      onClick={() => onInspectErrors(job.id)}
                      title="Click to view file batches, records, and step summary"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontWeight: 700,
                        fontSize: '15px',
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        textDecoration: 'underline',
                        textUnderlineOffset: '2px'
                      }}
                    >
                      {job.fileName}
                    </button>
                  </h4>
                  <div data-testid={`card-job-progress-${job.id}`} className="tabular-nums" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Progress: {percent}% ({job.processedRecords.toLocaleString('en-US')} / {job.totalRecords.toLocaleString('en-US')})
                  </div>
                  <div data-testid={`card-job-failures-${job.id}`} className="tabular-nums" style={{ fontSize: '12px', color: job.failedRecords > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600, marginBottom: '12px' }}>
                    Failures: {job.failedRecords}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  {isRunning && (
                    <button data-testid={`card-btn-pause-${job.id}`} onClick={() => onPauseJob(job.id)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}>
                      Pause
                    </button>
                  )}
                  {isPaused && (
                    <button data-testid={`card-btn-resume-${job.id}`} onClick={() => onResumeJob(job.id)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--success-border)', background: 'var(--success-bg)', color: 'var(--success-text)', cursor: 'pointer' }}>
                      Resume
                    </button>
                  )}
                  {(isFailed || job.failedRecords > 0) && (
                    <button data-testid={`card-btn-retry-${job.id}`} onClick={() => onRetryJob(job.id)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--warning-border)', background: 'var(--warning-bg)', color: 'var(--warning-text)', cursor: 'pointer' }}>
                      Retry
                    </button>
                  )}
                  <button data-testid={`card-btn-report-${job.id}`} onClick={() => onDownloadReport(job.id)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Report
                  </button>
                  <button data-testid={`card-btn-inspect-${job.id}`} onClick={() => onInspectErrors(job.id)} style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--primary-light)', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
                    Inspect
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Main ProcessWorkspace Container ---

export interface ProcessWorkspaceProps {
  route: ProcessRoute;
  jobs: ReadonlyArray<FileExecutionJob> | FileExecutionJob[];
  onBackToCatalog: () => void;
  onUpdateStep?: (updatedStep: PipelineStepConfig) => void;
  onUploadBatch?: (files: File[]) => void;
  onJobAction?: (action: 'PAUSE' | 'RESUME' | 'RETRY' | 'CANCEL' | 'DOWNLOAD_REPORT', jobId: string) => void;
  onInspectFile?: (jobId: string) => void;
}

export const ProcessWorkspace: React.FC<ProcessWorkspaceProps> = ({
  route,
  jobs,
  onBackToCatalog,
  onUpdateStep = () => {},
  onUploadBatch = () => {},
  onJobAction = () => {},
  onInspectFile = () => {}
}) => {
  const [activeStepId, setActiveStepId] = useState<PipelineStepConfig['id'] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [queueViewMode, setQueueViewMode] = useState<'table' | 'card'>('table');

  const selectedStep = route.pipelineSteps.find(s => s.id === activeStepId) || null;

  const handleStepClick = (stepId: PipelineStepConfig['id']) => {
    setActiveStepId(stepId);
    setIsDrawerOpen(true);
  };

  const matchingJobs = jobs.filter(j => matchProcessRoute(j.processId, route.id, j.id, j.fileName));
  const relevantJobs = matchingJobs.length > 0 ? matchingJobs : jobs;

  return (
    <div 
      data-testid="process-workspace-container" 
      className="liquid-glass-card"
      style={{ 
        padding: '24px', 
        minHeight: '80vh', 
        borderRadius: '16px',
        border: '1px solid var(--glass-border)'
      }}
    >
      {/* Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button
            data-testid="back-to-catalog-btn"
            onClick={onBackToCatalog}
            style={{ 
              border: 'none', 
              background: 'none', 
              color: 'var(--primary)', 
              fontWeight: 600, 
              fontSize: '13px', 
              cursor: 'pointer', 
              marginBottom: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0
            }}
          >
            <ArrowLeft size={14} /> Back to Route Catalog
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
              Process Workspace: {route.name}
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-card-subtle)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
              Route ID: {route.id}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            {route.description}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ background: 'var(--bg-card)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Throughput</div>
            <span className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
              {getRouteThroughput(route).toLocaleString('en-US')} rec/sec
            </span>
          </div>
          <span 
            style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              padding: '4px 10px', 
              borderRadius: '6px', 
              background: route.health === 'HEALTHY' ? 'var(--success-bg)' : 'var(--warning-bg)', 
              color: route.health === 'HEALTHY' ? 'var(--success-text)' : 'var(--warning-text)',
              border: `1px solid ${route.health === 'HEALTHY' ? 'var(--success-border)' : 'var(--warning-border)'}`
            }}
          >
            {route.health}
          </span>
        </div>
      </div>

      {/* Visual Step Pipeline (Splitter -> Validator -> Enricher -> Sink) */}
      <VisualStepPipeline
        steps={route.pipelineSteps}
        activeStepId={activeStepId}
        onStepClick={handleStepClick}
      />

      {/* Process-Targeted Multi-File Ingestion Dropzone */}
      <BatchDropzone onFilesUploaded={onUploadBatch} />

      {/* Multi-File Execution Queue */}
      <ExecutionQueue
        jobs={relevantJobs}
        viewMode={queueViewMode}
        onViewModeChange={setQueueViewMode}
        onPauseJob={(id) => onJobAction('PAUSE', id)}
        onResumeJob={(id) => onJobAction('RESUME', id)}
        onRetryJob={(id) => onJobAction('RETRY', id)}
        onCancelJob={(id) => onJobAction('CANCEL', id)}
        onDownloadReport={(id) => onJobAction('DOWNLOAD_REPORT', id)}
        onInspectErrors={onInspectFile}
      />

      {/* Interactive Click-to-Configure Side Drawer */}
      <StepConfigDrawer
        isOpen={isDrawerOpen}
        step={selectedStep}
        onClose={() => setIsDrawerOpen(false)}
        onSave={onUpdateStep}
      />
    </div>
  );
};

export default ProcessWorkspace;
