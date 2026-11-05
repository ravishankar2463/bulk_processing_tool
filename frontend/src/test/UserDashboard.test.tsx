import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { UserDashboard } from '../components/user/UserDashboard';

describe('UserDashboard Component', () => {
  const mockJobs = [
    {
      jobId: 'job-101',
      fileName: 'customers.csv',
      status: 'PROCESSING',
      totalRecords: 10000,
      processedRecords: 6500,
      successfulRecords: 6480,
      failedRecords: 20,
      startTime: '2026-11-04T10:00:00Z'
    },
    {
      jobId: 'job-102',
      fileName: 'orders.csv',
      status: 'COMPLETED',
      totalRecords: 500,
      processedRecords: 500,
      successfulRecords: 500,
      failedRecords: 0,
      startTime: '2026-11-04T09:30:00Z'
    }
  ];

  it('renders live job cards with progress information', () => {
    render(<UserDashboard jobs={mockJobs} onDownloadReport={() => {}} onUploadNew={() => {}} />);

    expect(screen.getByText('Live Execution Dashboard')).toBeInTheDocument();
    expect(screen.getByText('customers.csv')).toBeInTheDocument();
    expect(screen.getByText('orders.csv')).toBeInTheDocument();
    expect(screen.getByText('65.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('displays report download button for completed jobs', () => {
    render(<UserDashboard jobs={mockJobs} onDownloadReport={() => {}} onUploadNew={() => {}} />);

    const downloadButtons = screen.getAllByText('Download Report');
    expect(downloadButtons.length).toBeGreaterThan(0);
  });
});

