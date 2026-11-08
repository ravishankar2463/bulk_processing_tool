import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { NonEditableRouteDagStream } from '../components/admin/topology/NonEditableRouteDagStream';

describe('NonEditableRouteDagStream Component', () => {
  it('renders stream role badges for START, MIDDLE, and END nodes', async () => {
    render(<NonEditableRouteDagStream routeId="customer-master-onboarding" />);

    await waitFor(() => {
      expect(screen.getByText('START • SOURCE')).toBeInTheDocument();
      expect(screen.getByText('END • TERMINAL')).toBeInTheDocument();
    });

    const middleBadges = screen.getAllByText('MIDDLE • PIPE');
    expect(middleBadges.length).toBeGreaterThan(0);
  });

  it('renders Non-Editable Stream DAG title and node count', async () => {
    render(<NonEditableRouteDagStream routeId="customer-master-onboarding" />);

    await waitFor(() => {
      expect(screen.getByText('Non-Editable Stream DAG')).toBeInTheDocument();
      expect(screen.getByText(/Nodes • Directed Flow/i)).toBeInTheDocument();
    });
  });

  it('triggers onEditDAG when Edit DAG button is clicked', async () => {
    const handleEditDAG = vi.fn();
    render(
      <NonEditableRouteDagStream
        routeId="customer-master-onboarding"
        onEditDAG={handleEditDAG}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('edit-dag-action-btn-customer-master-onboarding')).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId('edit-dag-action-btn-customer-master-onboarding');
    fireEvent.click(editBtn);

    expect(handleEditDAG).toHaveBeenCalledTimes(1);
  });

  it('triggers onInspectNode when a node card is clicked', async () => {
    const handleInspectNode = vi.fn();
    render(
      <NonEditableRouteDagStream
        routeId="customer-master-onboarding"
        onInspectNode={handleInspectNode}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('CSV Ingestion Connector')).toBeInTheDocument();
    });

    const csvNode = screen.getByText('CSV Ingestion Connector');
    fireEvent.click(csvNode);

    expect(handleInspectNode).toHaveBeenCalledTimes(1);
  });
});
