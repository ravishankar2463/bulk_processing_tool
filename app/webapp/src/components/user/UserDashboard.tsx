import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Download, 
  PlusCircle, 
  RefreshCw, 
  Activity, 
  Layers, 
  Search, 
  FileSpreadsheet, 
  AlertOctagon,
  TrendingUp,
  Cpu,
  Eye
} from 'lucide-react';
import { ProcessCatalog } from '../catalog/ProcessCatalog';
import { ProcessRoute } from '../../types/process';

export interface UserJob {
  jobId: string;
  fileName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  startTime: string;
  errorMessage?: string;
  processId?: string;
}

interface Props {
  jobs: UserJob[];
  onDownloadReport: (jobId: string) => void;
  onUploadNew: () => void;
  onRefresh?: () => void;
  onInspectErrors?: (jobId: string) => void;
  onSelectRoute?: (routeId: string) => void;
  routes?: ProcessRoute[];
}

export const UserDashboard: React.FC<Props> = ({
  jobs,
  onDownloadReport,
  onUploadNew,
  onRefresh,
  onInspectErrors,
  onSelectRoute,
  routes
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('ALL');

  const calculatePercent = (processed: number, total: number): string => {
    if (!total || total === 0) return '0.0%';
    const pct = (processed / total) * 100;
    return `${pct.toFixed(1)}%`;
  };

  // Aggregate metrics for operational summary
  const totalJobs = jobs.length;
  const activeProcessing = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length;
  const totalProcessedSum = jobs.reduce((acc, j) => acc + (j.processedRecords || 0), 0);
  const totalFailedSum = jobs.reduce((acc, j) => acc + (j.failedRecords || 0), 0);
  const overallSuccessRate = totalProcessedSum > 0 
    ? (((totalProcessedSum - totalFailedSum) / totalProcessedSum) * 100).toFixed(1)
    : '100.0';

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.fileName.toLowerCase().includes(filterQuery.toLowerCase()) ||
                          job.jobId.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' ? true : job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)', letterSpacing: '-0.02em' }}>
              Live Execution Dashboard
            </h2>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 600, 
              background: 'var(--primary-light, #eff6ff)', 
              color: 'var(--primary, #1d4ed8)', 
              padding: '2px 8px', 
              borderRadius: '999px',
              border: '1px solid var(--border-subtle, #bfdbfe)'
            }}>
              SSE Stream Active
            </span>
          </div>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            Real-time streaming status of asynchronous bulk processing jobs across processes and files
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--bg-card, #ffffff)',
                color: 'var(--text-main, #334155)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
              }}
            >
              <RefreshCw size={13} /> Refresh
            </button>
          )}
          <button
            onClick={onUploadNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
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
            <PlusCircle size={15} /> Upload CSV
          </button>
        </div>
      </div>

      {/* Operational KPI Metric Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '14px', 
        marginBottom: '24px' 
      }}>
        <div 
          className="liquid-glass-card"
          style={{ 
            background: 'var(--glass-card, #ffffff)', 
            border: '1px solid var(--glass-border, #e2e8f0)', 
            borderRadius: '12px', 
            padding: '16px 18px',
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Ingestion</span>
            <div style={{ background: 'var(--primary-light, #dbeafe)', color: 'var(--primary, #1e40af)', padding: '4px', borderRadius: '6px' }}>
              <Activity size={14} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
              {activeProcessing}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>of {totalJobs} jobs running</span>
          </div>
        </div>

        <div 
          className="liquid-glass-card"
          style={{ 
            background: 'var(--glass-card, #ffffff)', 
            border: '1px solid var(--glass-border, #e2e8f0)', 
            borderRadius: '12px', 
            padding: '16px 18px',
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Processed</span>
            <div style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px', borderRadius: '6px' }}>
              <TrendingUp size={14} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
              {totalProcessedSum.toLocaleString()}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>records</span>
          </div>
        </div>

        <div 
          className="liquid-glass-card"
          style={{ 
            background: 'var(--glass-card, #ffffff)', 
            border: '1px solid var(--glass-border, #e2e8f0)', 
            borderRadius: '12px', 
            padding: '16px 18px',
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Success Rate</span>
            <div style={{ background: 'var(--success-bg, #dcfce7)', color: 'var(--success, #166534)', padding: '4px', borderRadius: '6px' }}>
              <CheckCircle2 size={14} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success, #059669)' }} className="tabular-nums">
              {overallSuccessRate}%
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{totalFailedSum} failed</span>
          </div>
        </div>

        <div 
          className="liquid-glass-card"
          style={{ 
            background: 'var(--glass-card, #ffffff)', 
            border: '1px solid var(--glass-border, #e2e8f0)', 
            borderRadius: '12px', 
            padding: '16px 18px',
            boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Batches</span>
            <div style={{ background: '#fef3c7', color: '#92400e', padding: '4px', borderRadius: '6px' }}>
              <Layers size={14} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
              {jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING').length}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>in flight</span>
          </div>
        </div>
      </div>

      {/* Tier 1: Process & Route Catalog */}
      <div style={{ marginBottom: '24px' }}>
        <ProcessCatalog
          routes={routes}
          onSelectRoute={onSelectRoute}
        />
      </div>

      {/* Filter and Search Bar */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px', 
        flexWrap: 'wrap', 
        gap: '12px' 
      }}>
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card-subtle, #f1f5f9)', padding: '3px', borderRadius: '8px' }}>
          {(['ALL', 'PROCESSING', 'COMPLETED', 'FAILED'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              style={{
                border: 'none',
                background: statusFilter === tab ? 'var(--bg-card, #ffffff)' : 'transparent',
                color: statusFilter === tab ? 'var(--text-main, #0f172a)' : 'var(--text-muted, #64748b)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: statusFilter === tab ? 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.05))' : 'none'
              }}
            >
              {tab === 'ALL' ? 'All Jobs' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search by file or Job ID..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 12px 7px 32px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Job Execution List */}
      {filteredJobs.length === 0 ? (
        <div
          className="liquid-glass-card"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: 'var(--glass-card, #ffffff)',
            borderRadius: '12px',
            border: '1px dashed var(--border-subtle, #cbd5e1)'
          }}
        >
          <Layers size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
            No matching jobs found
          </h3>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '13px', marginBottom: '16px' }}>
            {filterQuery ? 'No jobs match your filter criteria.' : 'No bulk processing jobs have been launched yet.'}
          </p>
          <button
            onClick={onUploadNew}
            style={{
              padding: '8px 16px',
              background: 'var(--primary, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Upload your first CSV
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredJobs.map((job) => {
            const pctString = calculatePercent(job.processedRecords, job.totalRecords);
            const pctNum = job.totalRecords > 0 ? (job.processedRecords / job.totalRecords) * 100 : 0;
            const isCompleted = job.status === 'COMPLETED';
            const isFailed = job.status === 'FAILED';
            const isProcessing = job.status === 'PROCESSING' || job.status === 'PENDING';

            return (
              <div
                key={job.jobId}
                className="liquid-glass-card"
                style={{
                  background: 'var(--glass-card, #ffffff)',
                  border: '1px solid var(--glass-border, #e2e8f0)',
                  borderRadius: '14px',
                  padding: '20px',
                  boxShadow: 'var(--shadow-card, 0 1px 3px rgba(15,23,42,0.04))',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Job Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      onClick={() => onInspectErrors && onInspectErrors(job.jobId)}
                      title="Inspect file lineage, batches, and records"
                      style={{
                        background: isCompleted ? 'var(--success-bg, #ecfdf5)' : isFailed ? 'var(--danger-bg, #fef2f2)' : 'var(--primary-light, #eff6ff)',
                        color: isCompleted ? 'var(--success, #059669)' : isFailed ? 'var(--danger, #dc2626)' : 'var(--primary, #2563eb)',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: onInspectErrors ? 'pointer' : 'default'
                      }}
                    >
                      <FileSpreadsheet size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          data-testid={`file-name-click-${job.jobId}`}
                          onClick={() => onInspectErrors && onInspectErrors(job.jobId)}
                          title="Click to view file batches, records, step summary, and failures"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            fontWeight: 600,
                            fontSize: '15px',
                            color: 'var(--primary, #2563eb)',
                            cursor: onInspectErrors ? 'pointer' : 'default',
                            textAlign: 'left',
                            display: 'inline-flex',
                            alignItems: 'center',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px'
                          }}
                        >
                          {job.fileName}
                        </button>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            background: isCompleted ? 'var(--success-bg, #dcfce7)' : isFailed ? 'var(--danger-bg, #fee2e2)' : 'var(--primary-light, #dbeafe)',
                            color: isCompleted ? 'var(--success-text, #166534)' : isFailed ? 'var(--danger-text, #991b1b)' : 'var(--primary, #1e40af)',
                            border: `1px solid ${isCompleted ? 'var(--success-border, #bbf7d0)' : 'var(--danger-border, #fecaca)'}`
                          }}
                        >
                          {isProcessing && <span className="pulsing-dot" style={{ background: 'var(--primary, #2563eb)' }} />}
                          {job.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                        Job ID: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main, #334155)', background: 'var(--bg-card-subtle, #f1f5f9)', padding: '1px 5px', borderRadius: '4px' }}>{job.jobId}</code>
                        {job.startTime && (
                          <span style={{ marginLeft: '10px' }}>
                            Started: {new Date(job.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }} className="tabular-nums">
                      {pctString}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                      {job.processedRecords.toLocaleString()} / {job.totalRecords.toLocaleString()} records
                    </div>
                  </div>
                </div>

                {/* Progress Bar with layered geometry */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-card-subtle, #f1f5f9)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(pctNum, 100)}%`,
                        height: '100%',
                        background: isCompleted 
                          ? 'var(--success, #10b981)' 
                          : isFailed 
                          ? 'var(--danger, #ef4444)' 
                          : 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
                        borderRadius: '999px',
                        transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                    />
                  </div>
                </div>

                {/* Metrics and Action Strip */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  paddingTop: '12px', 
                  borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--success, #16a34a)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ <strong>{job.successfulRecords.toLocaleString()}</strong> success
                    </span>
                    <span style={{ color: job.failedRecords > 0 ? 'var(--danger, #dc2626)' : 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✗ <strong>{job.failedRecords.toLocaleString()}</strong> failed
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {onInspectErrors && (
                      <button
                        onClick={() => onInspectErrors(job.jobId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          background: job.failedRecords > 0 ? 'var(--danger-bg, #fef2f2)' : 'var(--bg-card, #ffffff)',
                          border: `1px solid ${job.failedRecords > 0 ? 'var(--danger-border, #fecaca)' : 'var(--border-subtle, #cbd5e1)'}`,
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: job.failedRecords > 0 ? 'var(--danger, #dc2626)' : 'var(--text-main, #0f172a)',
                          cursor: 'pointer'
                        }}
                      >
                        {job.failedRecords > 0 ? (
                          <>
                            <AlertOctagon size={13} /> Inspect {job.failedRecords} Error(s)
                          </>
                        ) : (
                          <>
                            <Eye size={13} /> Inspect File
                          </>
                        )}
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={() => onDownloadReport(job.jobId)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 14px',
                          background: 'var(--bg-card, #ffffff)',
                          border: '1px solid var(--border-subtle, #cbd5e1)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--text-main, #0f172a)',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
                        }}
                      >
                        <Download size={14} /> Download Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
