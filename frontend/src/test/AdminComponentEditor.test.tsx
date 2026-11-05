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
});

