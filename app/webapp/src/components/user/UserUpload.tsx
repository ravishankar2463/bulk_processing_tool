import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Layers, X, FileSpreadsheet, ArrowRight } from 'lucide-react';

export interface RouteOption {
  routeId: string;
  name: string;
}

interface Props {
  availableRoutes: RouteOption[];
  onUpload: (file: File, routeId: string) => void;
  onCancel: () => void;
}

export const UserUpload: React.FC<Props> = ({
  availableRoutes,
  onUpload,
  onCancel
}) => {
  const [selectedRoute, setSelectedRoute] = useState<string>(
    availableRoutes[0]?.routeId || ''
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setSelectedFile(file);
    // Read first 10 rows for preflight preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 11);
        const parsed = lines.map((line) => line.split(','));
        setPreviewRows(parsed);
      }
    };
    reader.readAsText(file.slice(0, 20480)); // read first 20KB
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile && selectedRoute) {
      onUpload(selectedFile, selectedRoute);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{
      maxWidth: '820px',
      margin: '0 auto',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
      overflow: 'hidden'
    }}>
      {/* Modal Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #f1f5f9',
        background: '#f8fafc'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: '#dbeafe', color: '#2563eb', padding: '8px', borderRadius: '8px' }}>
            <UploadCloud size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Upload CSV File
            </h2>
            <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>
              Select a file and target processing route for asynchronous bulk execution
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px'
          }}
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
        {/* Pipeline Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="pipeline-route-select" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Target Processing Pipeline
          </label>
          <select
            id="pipeline-route-select"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '14px',
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            {availableRoutes.map((r) => (
              <option key={r.routeId} value={r.routeId}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* File Drag and Drop Zone with click affordance */}
        <div style={{ marginBottom: '22px' }}>
          <label htmlFor="csv-file-input" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Select File (CSV)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Click to browse or drop CSV file"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragOver ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '32px 24px',
              textAlign: 'center',
              background: isDragOver ? '#eff6ff' : selectedFile ? '#f0fdf4' : '#f8fafc',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: selectedFile ? '#dcfce7' : '#e0e7ff',
              color: selectedFile ? '#16a34a' : '#4338ca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              {selectedFile ? <FileSpreadsheet size={24} /> : <UploadCloud size={24} />}
            </div>

            {selectedFile ? (
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
                  Size: {formatFileSize(selectedFile.size)} · Ready for Loom streaming
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: '#1e293b' }}>
                  Drag & drop your CSV file here, or click to browse
                </div>
                <p style={{ margin: '6px 0 12px', fontSize: '12px', color: '#64748b' }}>
                  Supports large files up to several Gigabytes processed iteratively via Univocity Parsers.
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              id="csv-file-input"
              aria-label="Select file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{
                display: 'block',
                margin: '12px auto 0',
                fontSize: '12px',
                color: '#475569'
              }}
            />
          </div>
        </div>

        {/* Pre-flight Preview Table */}
        {previewRows.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Pre-flight Sample Preview (First {previewRows.length - 1} Records)
              </span>
              <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
                Delimiter: comma (,)
              </span>
            </div>
            <div style={{ 
              overflowX: 'auto', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              maxHeight: '220px', 
              background: '#ffffff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {previewRows[0].map((header, idx) => (
                      <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#1e293b' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '6px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '9px 18px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile}
            style={{
              padding: '9px 22px',
              background: selectedFile ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: selectedFile ? 'pointer' : 'not-allowed',
              boxShadow: selectedFile ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
            }}
          >
            Start Processing
          </button>
        </div>
      </form>
    </div>
  );
};
