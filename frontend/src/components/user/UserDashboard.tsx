import React from 'react';
import { PlayCircle, CheckCircle2, AlertTriangle, Download, PlusCircle, RefreshCw } from 'lucide-react';

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
}

interface Props {
  jobs: UserJob[];
  onDownloadReport: (jobId: string) => void;
  onUploadNew: () => void;
  onRefresh?: () => void;
}

export const UserDashboard: React.FC<Props> = ({
  jobs,
  onDownloadReport,
  onUploadNew,
  onRefresh
}) => {
  const calculatePercent = (processed: number, total: number): string => {
    if (!total || total === 0) return '0.0%';
    const pct = (processed / total) * 100;
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>
            Live Execution Dashboard
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Real-time streaming status of asynchronous bulk processing jobs
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          )}
          <button
            onClick={onUploadNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <PlusCircle size={15} /> Upload CSV
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}
        >
          <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '16px' }}>
            No bulk processing jobs have been launched yet.
          </p>
          <button
            onClick={onUploadNew}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Upload your first CSV
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {jobs.map((job) => {
            const pctString = calculatePercent(job.processedRecords, job.totalRecords);
            const pctNum = job.totalRecords > 0 ? (job.processedRecords / job.totalRecords) * 100 : 0;
            const isCompleted = job.status === 'COMPLETED';
            const isFailed = job.status === 'FAILED';

            return (
              <div
                key={job.jobId}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 600, fontSize: '16px', color: '#0f172a' }}>
                      {job.fileName}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: isCompleted ? '#dcfce7' : isFailed ? '#fee2e2' : '#dbeafe',
                        color: isCompleted ? '#166534' : isFailed ? '#991b1b' : '#1e40af'
                      }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Job ID: <code style={{ color: '#0f172a' }}>{job.jobId}</code>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>
                      {job.processedRecords.toLocaleString()} of {job.totalRecords.toLocaleString()} records processed
                    </span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{pctString}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(pctNum, 100)}%`,
                        height: '100%',
                        background: isCompleted ? '#10b981' : isFailed ? '#ef4444' : '#3b82f6',
                        transition: 'width 0.3s ease-in-out'
                      }}
                    />
                  </div>
                </div>

                {/* Metrics and Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span style={{ color: '#16a34a' }}>
                      ✓ <strong>{job.successfulRecords.toLocaleString()}</strong> success
                    </span>
                    <span style={{ color: job.failedRecords > 0 ? '#dc2626' : '#64748b' }}>
                      ✗ <strong>{job.failedRecords.toLocaleString()}</strong> failed
                    </span>
                  </div>

                  {isCompleted && (
                    <button
                      onClick={() => onDownloadReport(job.jobId)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#0f172a',
                        cursor: 'pointer'
                      }}
                    >
                      <Download size={14} /> Download Report
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
