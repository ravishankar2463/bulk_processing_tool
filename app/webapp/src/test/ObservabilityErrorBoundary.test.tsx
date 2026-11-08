import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ObservabilityErrorBoundary } from '../components/observability/ObservabilityErrorBoundary';

const FaultyComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Explosive rendering fault');
  }
  return <div data-testid="safe-content">Safe Component Content</div>;
};

describe('ObservabilityErrorBoundary Component', () => {
  it('renders children normally when no exception occurs', () => {
    render(
      <ObservabilityErrorBoundary>
        <FaultyComponent shouldThrow={false} />
      </ObservabilityErrorBoundary>
    );

    expect(screen.getByTestId('safe-content')).toBeInTheDocument();
  });

  it('catches rendering errors and displays error boundary with trace ID and reload button', () => {
    // Suppress console.error in test output for caught error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ObservabilityErrorBoundary fallbackTitle="Custom View Failure">
        <FaultyComponent shouldThrow={true} />
      </ObservabilityErrorBoundary>
    );

    expect(screen.getByTestId('observability-error-boundary')).toBeInTheDocument();
    expect(screen.getByText('Custom View Failure')).toBeInTheDocument();
    expect(screen.getByText(/Explosive rendering fault/)).toBeInTheDocument();
    expect(screen.getByText(/Incident Trace ID:/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload View/i })).toBeInTheDocument();

    spy.mockRestore();
  });
});
