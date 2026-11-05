import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminRouteStudio } from '../components/admin/AdminRouteStudio';

describe('AdminRouteStudio Component', () => {
  const mockRoutes = [
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
  ];

  it('renders all route cards and their bound component identifiers', () => {
    render(<AdminRouteStudio routes={mockRoutes} onToggleStatus={() => {}} onEditRoute={() => {}} onCreateRoute={() => {}} />);

    expect(screen.getByText('Dynamic Route Studio')).toBeInTheDocument();
    expect(screen.getByText('Customer CSV Ingestion Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Order Processing Stream')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('PAUSED')).toBeInTheDocument();
  });

  it('triggers onToggleStatus callback when Pause/Resume button is clicked', () => {
    let toggledRouteId = '';
    render(
      <AdminRouteStudio
        routes={mockRoutes}
        onToggleStatus={(routeId) => { toggledRouteId = routeId; }}
        onEditRoute={() => {}}
        onCreateRoute={() => {}}
      />
    );

    const pauseBtn = screen.getByText('Pause Route');
    fireEvent.click(pauseBtn);

    expect(toggledRouteId).toBe('csv-customer-ingest');
  });
});

