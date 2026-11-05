import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminDlqConsole } from '../components/admin/AdminDlqConsole';

describe('AdminDlqConsole Component', () => {
  const mockErrors = [
    {
      errorId: 101,
      jobId: 'job-991',
      sequenceNumber: 42,
      stepName: 'EMAIL_VALIDATOR',
      errorCode: 'INVALID_DOMAIN',
      errorMessage: 'Domain not allowed in corporate policy',
      rawPayload: '{"id": 42, "email": "test@disallowed.com"}'
    },
    {
      errorId: 102,
      jobId: 'job-992',
      sequenceNumber: 88,
      stepName: 'TAX_PROCESSOR',
      errorCode: 'OUT_OF_BOUNDS',
      errorMessage: 'Calculation exceeded ceiling',
      rawPayload: '{"id": 88, "amount": 99999999}'
    }
  ];

  it('renders DLQ failed records table and error details', () => {
    render(<AdminDlqConsole errors={mockErrors} onResubmit={() => {}} onRefresh={() => {}} />);

    expect(screen.getByText('Dead Letter Queue (DLQ) Console')).toBeInTheDocument();
    expect(screen.getByText('job-991')).toBeInTheDocument();
    expect(screen.getByText('INVALID_DOMAIN')).toBeInTheDocument();
    expect(screen.getByText('job-992')).toBeInTheDocument();
  });

  it('triggers onResubmit callback when Resubmit button is clicked', () => {
    let resubmittedId: number | null = null;
    render(
      <AdminDlqConsole
        errors={mockErrors}
        onResubmit={(errorId) => { resubmittedId = errorId; }}
        onRefresh={() => {}}
      />
    );

    const resubmitButtons = screen.getAllByText('Resubmit Record');
    fireEvent.click(resubmitButtons[0]);

    expect(resubmittedId).toBe(101);
  });
});
