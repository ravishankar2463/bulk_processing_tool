import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { UserErrorInspector } from '../components/user/UserErrorInspector';

describe('UserErrorInspector Component', () => {
  const mockErrors = [
    {
      errorId: 501,
      jobId: 'job-err-101',
      sequenceNumber: 14,
      stepName: 'DYNAMIC_VALIDATOR',
      errorCode: 'MISSING_FIELD',
      errorMessage: "Field 'email' is mandatory",
      rawPayload: '{"id": 14, "name": "No Email User"}'
    }
  ];

  it('renders drill-down error rows and allows CSV export of failed records', () => {
    let exported = false;
    render(
      <UserErrorInspector
        jobId="job-err-101"
        errors={mockErrors}
        onExportErrorCsv={() => { exported = true; }}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Error Inspector: job-err-101')).toBeInTheDocument();
    expect(screen.getByText("Field 'email' is mandatory")).toBeInTheDocument();
    expect(screen.getByText('Row 14')).toBeInTheDocument();

    const exportBtn = screen.getByText('Export Failed Rows (CSV)');
    fireEvent.click(exportBtn);

    expect(exported).toBe(true);
  });
});

