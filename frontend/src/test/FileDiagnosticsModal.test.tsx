import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { FileDiagnosticsModal } from '../components/diagnostics/FileDiagnosticsModal';
import { FileDiagnosticsData } from '../types/process';

describe('FileDiagnosticsModal Component (Tier 3)', () => {
  const mockDiagnostics: FileDiagnosticsData = {
    jobId: 'job-cmo-001',
    metadata: {
      sizeBytes: 4219904,
      encoding: 'UTF-8',
      delimiter: ',',
      rowCount: 10000,
      checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      loomThread: 'virtual-worker-101-loom-01'
    },
    stageLatencies: [
      { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 142000, percentOfTotal: 15.0, status: 'SUCCESS' },
      { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 290000, percentOfTotal: 30.0, status: 'SUCCESS' },
      { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 420000, percentOfTotal: 44.0, status: 'SUCCESS' },
      { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 105000, percentOfTotal: 11.0, status: 'SUCCESS' }
    ],
    batchChunks: [
      { chunkIndex: 0, recordCount: 500, durationMicros: 78000, partitionId: 'partition-p0', status: 'DONE' },
      { chunkIndex: 1, recordCount: 500, durationMicros: 82000, partitionId: 'partition-p1', status: 'DONE' },
      { chunkIndex: 2, recordCount: 500, durationMicros: 79000, partitionId: 'partition-p2', status: 'DONE' }
    ],
    errorRecords: [
      {
        recordId: 'rec-0014',
        lineNumber: 14,
        errorCode: 'INVALID_TAX_ID',
        errorMessage: 'Tax identification number failed mod-11 checksum validation',
        rawPayload: '{"c_id": "14", "tax_id": "XX-999-00", "country": "US"}',
        schemaTuple: {
          customerId: '14',
          taxId: 'XX-999-00',
          country: 'US',
          errorField: 'tax_id'
        }
      },
      {
        recordId: 'rec-0089',
        lineNumber: 89,
        errorCode: 'MISSING_MANDATORY_FIELD',
        errorMessage: 'Mandatory field "postalCode" is null or blank',
        rawPayload: '{"c_id": "89", "name": "Global Logistics", "country": "DE"}',
        schemaTuple: {
          customerId: '89',
          name: 'Global Logistics',
          country: 'DE',
          errorField: 'postalCode'
        }
      }
    ]
  };

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <FileDiagnosticsModal
        isOpen={false}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders file metadata panel (file size, encoding, delimiter, row count, checksum, Loom thread)', () => {
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Deep File Diagnostics/i)).toBeInTheDocument();
    expect(screen.getByTestId('meta-size')).toHaveTextContent('4.02 MB');
    expect(screen.getByTestId('meta-encoding')).toHaveTextContent('UTF-8');
    expect(screen.getByTestId('meta-delimiter')).toHaveTextContent(',');
    expect(screen.getByTestId('meta-row-count')).toHaveTextContent('10,000');
    expect(screen.getByTestId('meta-loom-thread')).toHaveTextContent('virtual-worker-101-loom-01');
    expect(screen.getByTestId('meta-checksum')).toHaveTextContent(mockDiagnostics.metadata.checksum);
  });

  it('renders stage latency waterfall visualization with microsecond timings and percentage bars', () => {
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    expect(screen.getByText(/Pipeline Latency Waterfall/i)).toBeInTheDocument();
    expect(screen.getByText('Streaming CSV Splitter')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Schema Validator')).toBeInTheDocument();

    expect(screen.getByTestId('waterfall-duration-splitter')).toHaveTextContent('142,000 µs');
    expect(screen.getByTestId('waterfall-percent-splitter')).toHaveTextContent('15.0%');
    expect(screen.getByTestId('waterfall-duration-validator')).toHaveTextContent('290,000 µs');
    expect(screen.getByTestId('waterfall-percent-validator')).toHaveTextContent('30.0%');

    const splitterFill = screen.getByTestId('waterfall-fill-splitter');
    expect(splitterFill).toHaveStyle({ width: '15%' });
  });

  it('renders batch chunk distribution cards', () => {
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Batch Chunk Distribution')).toBeInTheDocument();
    expect(screen.getByText(/Chunk #0/i)).toBeInTheDocument();
    expect(screen.getByText(/Chunk #1/i)).toBeInTheDocument();
    expect(screen.getByText(/Chunk #2/i)).toBeInTheDocument();
  });

  it('supports 4-facet error inspector: Headroom context compression, Schema Tuple view, Raw JSON view, and CSV Export', () => {
    const handleExportCsv = vi.fn();
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
        onExportCsv={handleExportCsv}
      />
    );

    // Initial state: Headroom toggle is unchecked, schema tuple view active
    const headroomCheckbox = screen.getByTestId('headroom-toggle-checkbox') as HTMLInputElement;
    expect(headroomCheckbox.checked).toBe(false);

    // Toggle Headroom on
    fireEvent.click(headroomCheckbox);
    expect(headroomCheckbox.checked).toBe(true);

    // Verify Headroom savings banner appears
    const savingsBanner = screen.getByTestId('headroom-savings-banner');
    expect(savingsBanner).toHaveTextContent(/Token Reduction/i);
    expect(savingsBanner).toHaveTextContent(/Structural Deduplication/i);

    // Schema Tuple tab displays error records
    expect(screen.getByText('INVALID_TAX_ID')).toBeInTheDocument();
    expect(screen.getByText('Tax identification number failed mod-11 checksum validation')).toBeInTheDocument();
    expect(screen.getByText('MISSING_MANDATORY_FIELD')).toBeInTheDocument();

    // Switch to Raw JSON tab
    const rawJsonTab = screen.getByTestId('tab-raw-json');
    fireEvent.click(rawJsonTab);

    expect(screen.getByTestId('raw-json-content')).toBeInTheDocument();
    expect(screen.getByTestId('raw-json-content').textContent).toContain('INVALID_TAX_ID');

    // Export CSV button
    const exportBtn = screen.getByTestId('btn-export-errors-csv');
    fireEvent.click(exportBtn);
    expect(handleExportCsv).toHaveBeenCalled();
  });

  it('triggers onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByTestId('close-diagnostics-btn');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalled();
  });

  it('renders pagination controls and supports page size tuning in the Lineage Table', () => {
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    // Verify pagination controls are rendered
    expect(screen.getByTestId('lineage-pagination-controls')).toBeInTheDocument();
    expect(screen.getByTestId('lineage-current-page-indicator')).toHaveTextContent('1 / 1');

    // Change page size
    const pageSizeSelect = screen.getByTestId('lineage-page-size-select') as HTMLSelectElement;
    expect(pageSizeSelect).toBeInTheDocument();
    fireEvent.change(pageSizeSelect, { target: { value: '10' } });
    expect(pageSizeSelect.value).toBe('10');
  });

  it('applies hardware-accelerated layer styles on slide-out drawer', () => {
    render(
      <FileDiagnosticsModal
        isOpen={true}
        diagnostics={mockDiagnostics}
        onClose={() => {}}
      />
    );

    const drawer = screen.getByTestId('file-diagnostics-modal');
    expect(drawer.style.willChange).toBe('transform');
    expect(drawer.style.borderRadius).toBe('16px');
  });
});
