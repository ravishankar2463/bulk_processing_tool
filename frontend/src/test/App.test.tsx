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
});
