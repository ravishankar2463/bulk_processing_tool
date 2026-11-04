import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile && selectedRoute) {
      onUpload(selectedFile, selectedRoute);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 6px', color: '#0f172a' }}>
          Upload CSV File
        </h2>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Select a file and target processing route for asynchronous bulk execution
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
            Target Processing Pipeline
          </label>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
          >
            {availableRoutes.map((r) => (
              <option key={r.routeId} value={r.routeId}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="csv-file-input" style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '6px' }}>
            Select File (CSV)
          </label>
          <div
            style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '8px',
              padding: '28px',
              textAlign: 'center',
              background: '#f8fafc',
              cursor: 'pointer'
            }}
          >
            <UploadCloud size={32} color="#64748b" style={{ margin: '0 auto 10px' }} />
            <input
              id="csv-file-input"
              aria-label="Select file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'block', margin: '0 auto', fontSize: '13px' }}
            />
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b' }}>
              Supports large files up to several Gigabytes processed iteratively via Univocity Parsers.
            </p>
          </div>
        </div>

        {/* CSV Preview */}
        {previewRows.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Pre-flight Sample Preview (First {previewRows.length - 1} Records)
            </div>
            <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {previewRows[0].map((header, idx) => (
                      <th key={idx} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#1e293b' }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(1).map((row, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} style={{ padding: '6px 12px', color: '#334155' }}>
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

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile}
            style={{
              padding: '8px 20px',
              background: selectedFile ? '#2563eb' : '#94a3b8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: selectedFile ? 'pointer' : 'not-allowed'
            }}
          >
            Start Processing
          </button>
        </div>
      </form>
    </div>
  );
};
