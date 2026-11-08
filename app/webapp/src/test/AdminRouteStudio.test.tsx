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

  it('triggers onEditRoute callback with selected route data when Edit button is clicked', () => {
    let editedRoute: any = null;
    render(
      <AdminRouteStudio
        routes={mockRoutes}
        onToggleStatus={() => {}}
        onEditRoute={(route) => { editedRoute = route; }}
        onCreateRoute={() => {}}
      />
    );

    const editBtn = screen.getByTestId('edit-route-btn-csv-customer-ingest');
    expect(editBtn).toBeInTheDocument();
    expect(editBtn).toHaveTextContent('Edit');
    fireEvent.click(editBtn);

    expect(editedRoute).not.toBeNull();
    expect(editedRoute.routeId).toBe('csv-customer-ingest');
    expect(editedRoute.name).toBe('Customer CSV Ingestion Pipeline');
  });

  it('renders the File Housekeeping panel and enforces 90 days retention ceiling', async () => {
    render(
      <AdminRouteStudio
        routes={mockRoutes}
        onToggleStatus={() => {}}
        onEditRoute={() => {}}
        onCreateRoute={() => {}}
      />
    );

    expect(screen.getAllByText(/File Housekeeping & Retention/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/\(Max ceiling: 90 days \/ 3 months\)/i)[0]).toBeInTheDocument();

    const input = screen.getByTestId('retention-input-csv-customer-ingest') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('30');

    // Attempt to set to 120 -> should clamp to 90
    fireEvent.change(input, { target: { value: '120' } });
    expect(input.value).toBe('90');

    // Attempt to set to -5 -> should clamp to 1
    fireEvent.change(input, { target: { value: '-5' } });
    expect(input.value).toBe('1');
  });

  it('triggers on-demand housekeeping and renders the purged execution report', async () => {
    render(
      <AdminRouteStudio
        routes={mockRoutes}
        onToggleStatus={() => {}}
        onEditRoute={() => {}}
        onCreateRoute={() => {}}
      />
    );

    const runBtn = screen.getByTestId('run-housekeeping-btn-csv-customer-ingest');
    expect(runBtn).toBeInTheDocument();
    fireEvent.click(runBtn);

    // After async mock resolution, the report is displayed
    const reportBanner = await screen.findByTestId('housekeeping-report-csv-customer-ingest');
    expect(reportBanner).toBeInTheDocument();
    expect(reportBanner).toHaveTextContent(/Purged/i);
    expect(reportBanner).toHaveTextContent(/jobs/i);
  });
});


