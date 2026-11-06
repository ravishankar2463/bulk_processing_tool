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

  it('pre-populates existing pipeline data and allows quick saving in edit mode', () => {
    let savedData: any = null;
    const initialRoute = {
      routeId: 'route-fin-recon',
      name: 'Financial Reconciliation Stream',
      status: 'ACTIVE',
      sourceEndpoint: 'file://data/inbox',
      splitterInstanceId: 'splitter-csv-univocity',
      validatorInstanceId: 'val-kyc-01',
      processorInstanceId: 'proc-tax-calc',
      writerInstanceId: 'writer-csv-summary',
      batchSize: 1000,
      parallelConsumers: 4
    };

    render(
      <AdminPipelineWizard
        initialData={initialRoute}
        onSave={(data) => { savedData = data; }}
        onCancel={() => {}}
      />
    );

    // Verify edit mode title and pre-filled name
    expect(screen.getByText(/Edit Pipeline Route: Financial Reconciliation Stream/i)).toBeInTheDocument();
    const nameInput = screen.getByTestId('pipeline-name-input') as HTMLInputElement;
    expect(nameInput.value).toBe('Financial Reconciliation Stream');

    // Modify route name
    fireEvent.change(nameInput, { target: { value: 'Financial Reconciliation Stream (Updated)' } });

    // Use Quick Save button directly from Step 1
    const quickSaveBtn = screen.getByTestId('quick-save-pipeline-btn');
    expect(quickSaveBtn).toBeInTheDocument();
    fireEvent.click(quickSaveBtn);

    expect(savedData).not.toBeNull();
    expect(savedData.processId).toBe('route-fin-recon');
    expect(savedData.name).toBe('Financial Reconciliation Stream (Updated)');
    expect(savedData.batchSize).toBe(1000);
  });

  it('allows jumping between steps directly using the step navigator bar', () => {
    render(<AdminPipelineWizard onSave={() => {}} onCancel={() => {}} />);

    // Click step 4 directly
    const step4Btn = screen.getByTestId('wizard-step-nav-4');
    fireEvent.click(step4Btn);
    expect(screen.getByText('Step 4: Batch Processing')).toBeInTheDocument();

    // Click step 1 directly
    const step1Btn = screen.getByTestId('wizard-step-nav-1');
    fireEvent.click(step1Btn);
    expect(screen.getByText('Step 1: Pipeline Route & Input Format')).toBeInTheDocument();
  });
});

