import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminPipelineWizard } from '../components/admin/AdminPipelineWizard';

describe('AdminPipelineWizard Component', () => {
  it('renders Step 1 for pipeline basics and route selection', () => {
    render(<AdminPipelineWizard onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('End-to-End Pipeline Assembly Wizard')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Pipeline Route & Input Format')).toBeInTheDocument();
    expect(screen.getByText('Next: Choose Splitter')).toBeInTheDocument();
  });

  it('navigates through steps to assemble pipeline components', () => {
    render(<AdminPipelineWizard onSave={() => {}} onCancel={() => {}} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText('Next: Choose Splitter'));
    expect(screen.getByText('Step 2: Record Splitter')).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText('Next: Validation Chain'));
    expect(screen.getByText('Step 3: Validation Chain')).toBeInTheDocument();

    // Step 3 -> Step 4
    fireEvent.click(screen.getByText('Next: Batch Processing'));
    expect(screen.getByText('Step 4: Batch Processing')).toBeInTheDocument();
  });
});
