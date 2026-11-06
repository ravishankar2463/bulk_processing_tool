import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AdminComponentEditor } from '../components/admin/AdminComponentEditor';

describe('AdminComponentEditor Component', () => {
  const mockComponent = {
    instanceId: 'val-kyc-01',
    componentType: 'VALIDATOR',
    name: 'KYC Email Validator',
    description: 'Validates customer emails against pattern',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: 'if (!record.containsKey("email")) return ValidationResult.invalid("NO_EMAIL", "No email"); return ValidationResult.valid();',
    sampleTestPayload: '{"id": 1, "email": "alice@test.com"}'
  };

  it('renders editor fields populated with existing component data', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('Direct Component Editor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('KYC Email Validator')).toBeInTheDocument();
    expect(screen.getByDisplayValue('val-kyc-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockComponent.sourceCode)).toBeInTheDocument();
  });

  it('calls onSave with updated source code when save button is clicked', () => {
    let savedData: any = null;
    render(
      <AdminComponentEditor
        initialData={mockComponent}
        onSave={(data) => { savedData = data; }}
        onCancel={() => {}}
      />
    );

    const textarea = screen.getByDisplayValue(mockComponent.sourceCode);
    fireEvent.change(textarea, { target: { value: '// updated logic\nreturn ValidationResult.valid();' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    expect(savedData).not.toBeNull();
    expect(savedData.sourceCode).toContain('// updated logic');
  });

  it('renders starter templates and populates source code when a template is selected', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    const templateSelect = screen.getByTestId('template-selector-dropdown');
    expect(templateSelect).toBeInTheDocument();

    // Select Email RFC 5322 regex validation template
    fireEvent.change(templateSelect, { target: { value: 'val-email-rfc' } });

    const codeTextarea = screen.getByLabelText('Source Code (Java 21 / Janino)') as HTMLTextAreaElement;
    expect(codeTextarea.value).toContain('RFC 5322 Email Syntax Check');
    expect(codeTextarea.value).toContain('DynamicValidatorScript.ValidationResult.invalid');
  });

  it('toggles interactive API documentation drawer and navigates subtabs', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    const toggleDocsBtn = screen.getByTestId('toggle-api-docs-btn');
    expect(toggleDocsBtn).toBeInTheDocument();

    // Drawer should initially be closed
    expect(screen.queryByTestId('component-api-docs-drawer')).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(toggleDocsBtn);
    expect(screen.getByTestId('component-api-docs-drawer')).toBeInTheDocument();

    // Default tab is In-Scope Variables
    expect(screen.getByTestId('doc-content-variables')).toBeInTheDocument();
    expect(screen.getByText('Janino Virtual Thread Execution Scope')).toBeInTheDocument();

    // Switch to Class Contracts tab
    fireEvent.click(screen.getByTestId('doc-tab-contracts'));
    expect(screen.getByTestId('doc-content-contracts')).toBeInTheDocument();
    expect(screen.getByText('ValidationResult Class Contract')).toBeInTheDocument();

    // Switch to Security Sandbox Rules tab
    fireEvent.click(screen.getByTestId('doc-tab-security'));
    expect(screen.getByTestId('doc-content-security')).toBeInTheDocument();
    expect(screen.getByText('Security Sandbox & Loom Virtual Thread Constraints')).toBeInTheDocument();
  });

  it('inserts quick snippets into source code when quick snippet button is clicked', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    const quickSnippetBtn = screen.getByTestId('quick-snippet-snip-valid');
    fireEvent.click(quickSnippetBtn);

    const codeTextarea = screen.getByLabelText('Source Code (Java 21 / Janino)') as HTMLTextAreaElement;
    expect(codeTextarea.value).toContain('ValidationResult.valid()');
  });

  it('renders enclosing method signature header, parameter chips, and footer framing', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    expect(screen.getByTestId('method-signature-header-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('method-signature-footer-chrome')).toBeInTheDocument();
    expect(screen.getByText('Java 21 · Loom Virtual Thread')).toBeInTheDocument();
    expect(screen.getByText('validate')).toBeInTheDocument();
    expect(screen.getByText('// End of validate() method body')).toBeInTheDocument();
  });

  it('resets to guided starter code when Starter Code button is clicked', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    const resetStarterBtn = screen.getByTestId('reset-starter-code-btn');
    expect(resetStarterBtn).toBeInTheDocument();

    fireEvent.click(resetStarterBtn);

    const codeTextarea = screen.getByLabelText('Source Code (Java 21 / Janino)') as HTMLTextAreaElement;
    expect(codeTextarea.value).toContain('Mandatory attribute check');
    expect(codeTextarea.value).toContain('MISSING_EMAIL');
  });

  it('toggles complete compiled Java class preview and switches back', () => {
    render(<AdminComponentEditor initialData={mockComponent} onSave={() => {}} onCancel={() => {}} />);

    const toggleClassBtn = screen.getByTestId('toggle-class-preview-btn');
    expect(toggleClassBtn).toBeInTheDocument();

    // Open class preview
    fireEvent.click(toggleClassBtn);
    expect(screen.getByTestId('full-class-preview-surface')).toBeInTheDocument();
    expect(screen.getByText(/public class DynamicComponentSnippet implements DynamicValidatorScript/)).toBeInTheDocument();

    // Toggle back to method body
    fireEvent.click(toggleClassBtn);
    expect(screen.queryByTestId('full-class-preview-surface')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Source Code (Java 21 / Janino)')).toBeInTheDocument();
  });
});
