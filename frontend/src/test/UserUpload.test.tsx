import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserUpload } from '../components/user/UserUpload';

describe('UserUpload Component', () => {
  const mockRoutes = [
    { routeId: 'csv-customer-ingest', name: 'Customer Ingestion' },
    { routeId: 'csv-order-stream', name: 'Order Stream' }
  ];

  it('renders file upload dropzone and route selector', () => {
    render(<UserUpload availableRoutes={mockRoutes} onUpload={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('Upload CSV File')).toBeInTheDocument();
    expect(screen.getByText('Customer Ingestion')).toBeInTheDocument();
    expect(screen.getByText('Order Stream')).toBeInTheDocument();
  });

  it('allows file selection and calls onUpload when submitted', () => {
    let uploadedFile: File | null = null;
    let selectedRoute: string = '';

    render(
      <UserUpload
        availableRoutes={mockRoutes}
        onUpload={(file, routeId) => {
          uploadedFile = file;
          selectedRoute = routeId;
        }}
        onCancel={() => {}}
      />
    );

    const file = new File(['id,name,email\n1,Alice,alice@example.com'], 'customers.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/select file/i);

    fireEvent.change(input, { target: { files: [file] } });

    const submitBtn = screen.getByText('Start Processing');
    fireEvent.click(submitBtn);

    expect(uploadedFile).not.toBeNull();
    expect((uploadedFile as any)?.name).toBe('customers.csv');
    expect(selectedRoute).toBe('csv-customer-ingest');
  });
});
