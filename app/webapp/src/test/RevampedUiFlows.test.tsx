import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../App';

describe('Revamped UI Architecture & Liquid Glass Workflow Verification', () => {
  it('toggles dual-theme between Light Frost and Dark Glass smoothly', async () => {
    render(<App />);

    // Top Telemetry Bar shows Theme Switcher
    const themeToggleBtn = screen.getByLabelText('Toggle Liquid Glass Theme');
    expect(themeToggleBtn).toBeInTheDocument();
    expect(themeToggleBtn).toHaveTextContent('Dark Glass');

    // Click to switch to Dark Glass
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(themeToggleBtn).toHaveTextContent('Light Frost');

    // Click again to switch back to Light Frost
    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    expect(themeToggleBtn).toHaveTextContent('Dark Glass');
  });

  it('renders interactive hierarchical breadcrumbs across user navigation', async () => {
    render(<App />);

    // Default: Home > Route Catalog
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Route Catalog')).toBeInTheDocument();

    // Select Customer Master Onboarding to navigate into Tier 2 Process Workspace
    await waitFor(() => {
      expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
    });

    const viewWorkspaceBtns = screen.getAllByText('View Workspace');
    fireEvent.click(viewWorkspaceBtns[0]);

    // Breadcrumb updates to include route workspace name
    await waitFor(() => {
      expect(screen.getByText(/Customer Master Onboarding \(Workspace\)/i)).toBeInTheDocument();
    });

    // Navigate back to Catalog using breadcrumb
    fireEvent.click(screen.getByText('Route Catalog'));
    await waitFor(() => {
      expect(screen.getByText('Enterprise Process & Route Catalog')).toBeInTheDocument();
    });
  });

  it('connects Admin Studio routes with Component Library and displays usage count badges', async () => {
    render(<App />);

    // Switch to Admin Studio
    fireEvent.click(screen.getByText('Admin Studio'));
    expect(screen.getAllByText('Dynamic Route Studio').length).toBeGreaterThan(0);
    expect(screen.getByText('Component Library')).toBeInTheDocument();
    expect(screen.getByText('DLQ Error Console')).toBeInTheDocument();

    // Switch to Component Library
    fireEvent.click(screen.getByText('Component Library'));

    // Verify component presence and "Used in N route(s)" badges
    await waitFor(() => {
      expect(screen.getByText('Customer KYC Email Validator')).toBeInTheDocument();
      const usedInBadges = screen.getAllByText(/Used in \d+ route\(s\)/i);
      expect(usedInBadges.length).toBeGreaterThan(0);
    });
  });

  it('connects DLQ Console with deep File Diagnostics slide-out drawer', async () => {
    render(<App />);

    // Switch to Admin Studio -> DLQ Console
    fireEvent.click(screen.getByText('Admin Studio'));
    fireEvent.click(screen.getByText('DLQ Error Console'));

    // Check quarantined records
    expect(screen.getByText('Dead Letter Queue (DLQ) Console')).toBeInTheDocument();

    // Click first Job ID link to inspect file diagnostics drawer
    const jobLinks = screen.getAllByText('job-101');
    fireEvent.click(jobLinks[0]);

    // Slide-out drawer opens
    await waitFor(() => {
      expect(screen.getByTestId('file-diagnostics-modal')).toBeInTheDocument();
      expect(screen.getByText('Deep File Diagnostics: job-101')).toBeInTheDocument();
    });

    // Close drawer
    fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
    await waitFor(() => {
      expect(screen.queryByTestId('file-diagnostics-modal')).not.toBeInTheDocument();
    });
  });
});
