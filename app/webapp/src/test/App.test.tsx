import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('App Root Application Portal', () => {
  it('renders portal header and defaults to User Portal tab', async () => {
    render(<App />);

    expect(screen.getByText('Enterprise Bulk Processor')).toBeInTheDocument();
    expect(screen.getByText('User Portal')).toBeInTheDocument();
    expect(screen.getByText('Admin Studio')).toBeInTheDocument();
    expect(screen.getByText('Live Execution Dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('process-catalog-container')).toBeInTheDocument();
    });
  });

  it('switches to Admin Studio when tab is clicked', async () => {
    render(<App />);

    fireEvent.click(screen.getByText('Admin Studio'));

    expect(screen.getAllByText('Dynamic Route Studio').length).toBeGreaterThan(0);
    expect(screen.getByText('Component Library')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Component Library')).toBeInTheDocument();
    });
  });

  it('routes to Admin Studio screen even when currently viewing a route workspace in User Portal', async () => {
    render(<App />);

    // 1. Wait for route catalog cards to load
    await waitFor(() => {
      expect(screen.getByTestId('process-catalog-container')).toBeInTheDocument();
    });

    // 2. Click on a route to enter the Process Workspace
    const viewWorkspaceBtn = screen.getByTestId('view-workspace-btn-customer-master-onboarding');
    expect(viewWorkspaceBtn).toBeInTheDocument();
    fireEvent.click(viewWorkspaceBtn);

    // 3. Confirm we are inside the Route Workspace
    expect(screen.getByText(/Process Workspace: Customer Master Onboarding/i)).toBeInTheDocument();

    // 4. Click on Admin Studio in header
    const adminBtn = screen.getByText('Admin Studio');
    fireEvent.click(adminBtn);

    // 5. Must route immediately to Admin Studio and show its views
    expect(screen.getAllByText('Dynamic Route Studio').length).toBeGreaterThan(0);
    expect(screen.getByText('Component Library')).toBeInTheDocument();
    expect(screen.getByText('DLQ Error Console')).toBeInTheDocument();

    // 6. Click on User Portal in header to return
    const userPortalBtn = screen.getByText('User Portal');
    fireEvent.click(userPortalBtn);

    // 7. Returns cleanly to User Portal
    expect(screen.getByText('Live Execution Dashboard')).toBeInTheDocument();
  });
});
