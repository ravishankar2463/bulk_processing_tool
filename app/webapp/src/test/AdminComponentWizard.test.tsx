import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminComponentWizard } from '../components/admin/AdminComponentWizard';

describe('AdminComponentWizard Component', () => {
  it('renders step 1 with component type selections', () => {
    render(<AdminComponentWizard onSave={() => {}} onCancel={() => {}} />);
    
    expect(screen.getByText('Step 1: Select Component Type')).toBeInTheDocument();
    expect(screen.getByText('Record Splitter')).toBeInTheDocument();
    expect(screen.getByText('Validator')).toBeInTheDocument();
    expect(screen.getByText('Batch Processor')).toBeInTheDocument();
    expect(screen.getByText('Report Writer')).toBeInTheDocument();
  });

  it('navigates to step 2 mode selection upon selecting a component', () => {
    render(<AdminComponentWizard onSave={() => {}} onCancel={() => {}} />);
    
    fireEvent.click(screen.getByText('Validator'));
    fireEvent.click(screen.getByText('Next: Choose Mode'));

    expect(screen.getByText('Step 2: Implementation Mode')).toBeInTheDocument();
    expect(screen.getByText('Declarative Form Builder')).toBeInTheDocument();
    expect(screen.getByText('Custom Code Snippet (Java)')).toBeInTheDocument();
  });

  it('allows entering code and running pre-flight sandbox test', async () => {
    const onSave = () => {};
    render(<AdminComponentWizard onSave={onSave} onCancel={() => {}} />);
    
    // Step 1
    fireEvent.click(screen.getByText('Validator'));
    fireEvent.click(screen.getByText('Next: Choose Mode'));
    
    // Step 2
    fireEvent.click(screen.getByText('Custom Code Snippet (Java)'));
    fireEvent.click(screen.getByText('Next: Configure Logic'));

    // Step 3 (Logic & Sandbox)
    expect(screen.getByText('Step 3: Editor & Sandbox Workspace')).toBeInTheDocument();
    expect(screen.getByText('Run Sandbox Test')).toBeInTheDocument();
  });

  it('provides starter templates and quick snippets in Step 3', () => {
    render(<AdminComponentWizard onSave={() => {}} onCancel={() => {}} />);
    
    // Navigate to Step 3
    fireEvent.click(screen.getByText('Validator'));
    fireEvent.click(screen.getByText('Next: Choose Mode'));
    fireEvent.click(screen.getByText('Custom Code Snippet (Java)'));
    fireEvent.click(screen.getByText('Next: Configure Logic'));

    // Verify Template Selector is present
    const templateSelect = screen.getByTestId('template-selector-dropdown');
    expect(templateSelect).toBeInTheDocument();

    // Select Amount Range template
    fireEvent.change(templateSelect, { target: { value: 'val-amount-range' } });

    const codeTextarea = screen.getByLabelText('Java Code Implementation') as HTMLTextAreaElement;
    expect(codeTextarea.value).toContain('Financial Amount Range Check');
    expect(codeTextarea.value).toContain('AMOUNT_EXCEEDS_LIMIT');

    // Verify Quick Snippets are present
    const invalidSnippetBtn = screen.getByTestId('quick-snippet-snip-invalid');
    expect(invalidSnippetBtn).toBeInTheDocument();
    fireEvent.click(invalidSnippetBtn);

    expect(codeTextarea.value).toContain('ValidationResult.invalid("ERROR_CODE"');
  });

  it('renders method signature framing and default starter code in Step 3', () => {
    render(<AdminComponentWizard onSave={() => {}} onCancel={() => {}} />);
    
    // Navigate to Step 3
    fireEvent.click(screen.getByText('Validator'));
    fireEvent.click(screen.getByText('Next: Choose Mode'));
    fireEvent.click(screen.getByText('Custom Code Snippet (Java)'));
    fireEvent.click(screen.getByText('Next: Configure Logic'));

    expect(screen.getByTestId('method-signature-header-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('method-signature-footer-chrome')).toBeInTheDocument();
    expect(screen.getByText('// End of validate() method body')).toBeInTheDocument();

    const codeTextarea = screen.getByLabelText('Java Code Implementation') as HTMLTextAreaElement;
    expect(codeTextarea.value).toContain('Mandatory attribute check');
    expect(codeTextarea.value).toContain('MISSING_EMAIL');
  });
});
