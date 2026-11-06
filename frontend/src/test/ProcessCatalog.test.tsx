import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ProcessCatalog } from '../components/catalog/ProcessCatalog';
import { ProcessRoute } from '../types/process';

describe('ProcessCatalog Component (Tier 1)', () => {
  const mockRoutes: ProcessRoute[] = [
    {
      id: 'customer-master-onboarding',
      name: 'Customer Master Onboarding',
      description: 'Streamed high-volume customer entity verification, KYC enrichment, and audit ledger persistence.',
      status: 'ACTIVE',
      health: 'HEALTHY',
      activeFilesInFlight: 3,
      aggregateThroughputRecordsPerSec: 14200,
      successRatePercent: 99.8,
      pipelineSteps: [
        {
          id: 'splitter',
          name: 'Univocity CSV Splitter',
          type: 'SPLITTER',
          parameters: { batchSize: 500 },
          fieldMappings: [],
          errorPolicy: 'QUARANTINE_RECORD',
          concurrency: 32
        }
      ]
    },
    {
      id: 'order-fulfillment-stream',
      name: 'Order Fulfillment Stream',
      description: 'Real-time multi-item order batch decomposition, tax calculation, and ERP synchronization.',
      status: 'PAUSED',
      health: 'DEGRADED',
      activeFilesInFlight: 1,
      aggregateThroughputRecordsPerSec: 8500,
      successRatePercent: 94.2,
      pipelineSteps: []
    },
    {
      id: 'financial-reconciliation-ledger',
      name: 'Financial Reconciliation Ledger',
      description: 'End-of-day multi-currency transaction pairing, balance verification, and ledger posting.',
      status: 'ACTIVE',
      health: 'HEALTHY',
      activeFilesInFlight: 0,
      aggregateThroughputRecordsPerSec: 19800,
      successRatePercent: 100.0,
      pipelineSteps: []
    }
  ];

  it('renders process catalog header and route cards with health and status badges', () => {
    render(<ProcessCatalog routes={mockRoutes} onSelectRoute={() => {}} />);

    expect(screen.getByText('Enterprise Process & Route Catalog')).toBeInTheDocument();
    expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    expect(screen.getByText('Order Fulfillment Stream')).toBeInTheDocument();
    expect(screen.getByText('Financial Reconciliation Ledger')).toBeInTheDocument();

    expect(screen.getByTestId('status-badge-customer-master-onboarding')).toHaveTextContent('ACTIVE');
    expect(screen.getByTestId('health-badge-customer-master-onboarding')).toHaveTextContent('HEALTHY');
    expect(screen.getByTestId('status-badge-order-fulfillment-stream')).toHaveTextContent('PAUSED');
    expect(screen.getByTestId('health-badge-order-fulfillment-stream')).toHaveTextContent('DEGRADED');
  });

  it('displays active files, throughput, and success rate with tabular numerals', () => {
    render(<ProcessCatalog routes={mockRoutes} onSelectRoute={() => {}} />);

    const activeFilesEl = screen.getByTestId('active-files-customer-master-onboarding');
    expect(activeFilesEl).toHaveTextContent('3');

    const throughputEl = screen.getByTestId('throughput-customer-master-onboarding');
    expect(throughputEl).toHaveTextContent('14,200 rec/sec');

    const successRateEl = screen.getByTestId('success-rate-customer-master-onboarding');
    expect(successRateEl).toHaveTextContent('99.8%');
  });

  it('triggers onSelectRoute when View Workspace button is clicked', () => {
    const handleSelectRoute = vi.fn();
    render(<ProcessCatalog routes={mockRoutes} onSelectRoute={handleSelectRoute} />);

    const viewBtn = screen.getByTestId('view-workspace-btn-customer-master-onboarding');
    fireEvent.click(viewBtn);

    expect(handleSelectRoute).toHaveBeenCalledWith('customer-master-onboarding');
  });

  it('triggers onPauseRoute and onStartRoute when route action buttons are clicked', () => {
    const handleStart = vi.fn();
    const handlePause = vi.fn();

    render(
      <ProcessCatalog 
        routes={mockRoutes} 
        onSelectRoute={() => {}}
        onStartRoute={handleStart}
        onPauseRoute={handlePause}
      />
    );

    // Active route has Pause button
    const pauseBtn = screen.getByTestId('pause-route-btn-customer-master-onboarding');
    fireEvent.click(pauseBtn);
    expect(handlePause).toHaveBeenCalledWith('customer-master-onboarding');

    // Paused route has Start button
    const startBtn = screen.getByTestId('start-route-btn-order-fulfillment-stream');
    fireEvent.click(startBtn);
    expect(handleStart).toHaveBeenCalledWith('order-fulfillment-stream');
  });

  it('fetches routes autonomously from client when routes prop is omitted', async () => {
    render(<ProcessCatalog onSelectRoute={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    });
  });
});
