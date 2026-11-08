import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminComponentLibrary } from '../components/admin/AdminComponentLibrary';
import { ComponentInstanceData } from '../components/admin/AdminComponentWizard';
import { RouteConfigData } from '../components/admin/AdminRouteStudio';

const mockComponents: ComponentInstanceData[] = [
  {
    instanceId: 'val-kyc-01',
    componentType: 'VALIDATOR',
    name: 'Customer KYC Email Validator',
    description: 'Ensures email domain and formatting matches compliance standards',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Java 21 Validation Script\nif (!record.containsKey("email")) {\n    return ValidationResult.invalid("MISSING_EMAIL", "Email required");\n}\nreturn ValidationResult.valid();',
    sampleTestPayload: '{"id": 101, "email": "test@example.com"}'
  },
  {
    instanceId: 'proc-customer-enricher',
    componentType: 'BATCH_PROCESSOR',
    name: 'Customer Tier Enricher',
    description: 'Calculates loyalty points and assigns bronze/silver/gold tier',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Java 21 Batch Processor Script\njava.util.Map result = new java.util.HashMap(record);\nresult.put("tier", "GOLD");\nreturn result;',
    sampleTestPayload: '{"id": 101, "spend": 5000}'
  },
  {
    instanceId: 'splitter-csv-univocity',
    componentType: 'SPLITTER',
    name: 'Streaming CSV Splitter',
    description: 'Univocity streaming CSV parser with virtual thread chunking',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Univocity CSV Splitter\npublic List<Record> split(InputStream in, int chunkSize) {\n    return UnivocityParser.parseChunks(in, chunkSize, \',\');\n}',
    sampleTestPayload: '{"chunkSize": 500, "delimiter": ","}'
  },
  {
    instanceId: 'writer-audit-csv',
    componentType: 'REPORT_WRITER',
    name: 'Audit CSV & Ledger Sink',
    description: 'Appends processed records into immutable audit log storage',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Audit Ledger Sink\npublic void sink(List<Record> batch) {\n    AuditLogger.writeImmutable(batch, "s3://audit-vault/");\n}',
    sampleTestPayload: '{"batchSize": 500}'
  }
];

const mockRoutes: RouteConfigData[] = [
  {
    routeId: 'customer-master-onboarding',
    name: 'Customer Master Onboarding',
    status: 'ACTIVE',
    sourceEndpoint: 's3://inbound/customers/',
    splitterInstanceId: 'splitter-csv-univocity',
    validatorInstanceId: 'val-kyc-01',
    processorInstanceId: 'proc-customer-enricher',
    writerInstanceId: 'writer-audit-csv',
    batchSize: 500,
    parallelConsumers: 4
  },
  {
    routeId: 'order-fulfillment-stream',
    name: 'Order Fulfillment Stream',
    status: 'ACTIVE',
    sourceEndpoint: 's3://inbound/orders/',
    splitterInstanceId: 'splitter-csv-univocity',
    validatorInstanceId: 'val-kyc-01',
    processorInstanceId: 'proc-customer-enricher',
    writerInstanceId: 'writer-audit-csv',
    batchSize: 1000,
    parallelConsumers: 8
  }
];

describe('AdminComponentLibrary Component Redesign', () => {
  beforeEach(() => {
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve())
      }
    });
  });

  it('renders all component cards with type badges and route linkages', () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    // Verify component names
    expect(screen.getByText('Customer KYC Email Validator')).toBeInTheDocument();
    expect(screen.getByText('Customer Tier Enricher')).toBeInTheDocument();
    expect(screen.getByText('Streaming CSV Splitter')).toBeInTheDocument();
    expect(screen.getByText('Audit CSV & Ledger Sink')).toBeInTheDocument();

    // Verify type differentiation badges
    expect(screen.getAllByText('VALIDATOR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('BATCH_PROCESSOR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SPLITTER').length).toBeGreaterThan(0);
    expect(screen.getAllByText('REPORT_WRITER').length).toBeGreaterThan(0);

    // Verify backward compatible "Used in N route(s)" text
    const usedInBadges = screen.getAllByText(/Used in \d+ route\(s\)/i);
    expect(usedInBadges.length).toBe(4);
    expect(screen.getAllByText('Used in 2 route(s)').length).toBe(4);
  });

  it('filters components when type filter tabs are selected', () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    // Click "Validators" tab
    const validatorTabs = screen.getAllByRole('button', { name: /validators/i });
    fireEvent.click(validatorTabs[0]);

    // Should only show Validator
    expect(screen.getByText('Customer KYC Email Validator')).toBeInTheDocument();
    expect(screen.queryByText('Streaming CSV Splitter')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer Tier Enricher')).not.toBeInTheDocument();

    // Click "Streaming Splitters" tab
    const splitterTabs = screen.getAllByRole('button', { name: /streaming splitters/i });
    fireEvent.click(splitterTabs[0]);

    // Should only show Splitter
    expect(screen.getByText('Streaming CSV Splitter')).toBeInTheDocument();
    expect(screen.queryByText('Customer KYC Email Validator')).not.toBeInTheDocument();
  });

  it('searches components by text in search input', () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    const searchInput = screen.getByPlaceholderText(/search components/i);
    fireEvent.change(searchInput, { target: { value: 'Univocity' } });

    expect(screen.getByText('Streaming CSV Splitter')).toBeInTheDocument();
    expect(screen.queryByText('Customer KYC Email Validator')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer Tier Enricher')).not.toBeInTheDocument();
  });

  it('supports expanding and collapsing code previews', () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    // Toggle expand all
    const expandAllBtn = screen.getByRole('button', { name: /expand code/i });
    fireEvent.click(expandAllBtn);
    expect(screen.getByRole('button', { name: /collapse code/i })).toBeInTheDocument();
  });

  it('copies code to clipboard when Copy button is clicked', async () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    const copyButtons = screen.getAllByRole('button', { name: /copy/i });
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(screen.getAllByText('Copied!').length).toBeGreaterThan(0);
    });
  });

  it('opens ComponentInspectorModal when Inspect button is clicked', async () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    const inspectButtons = screen.getAllByRole('button', { name: /inspect/i });
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Dynamic Method Contract Framing/i)).toBeInTheDocument();
      expect(screen.getByText('Complete Java 21 Class')).toBeInTheDocument();
      expect(screen.getByText('Sample Test Payload')).toBeInTheDocument();
    });

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Dynamic Method Contract Framing/i)).not.toBeInTheDocument();
    });
  });

  it('triggers onEditComponent when Edit Code is clicked', () => {
    const onEdit = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={onEdit}
      />
    );

    // Filter to Validator to be deterministic
    const validatorTabs = screen.getAllByRole('button', { name: /validators/i });
    fireEvent.click(validatorTabs[0]);

    const editButtons = screen.getAllByRole('button', { name: /edit code/i });
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockComponents[0]);
  });

  it('renders and invokes onCreateComponent button when provided', () => {
    const onCreate = vi.fn();
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={vi.fn()}
        onCreateComponent={onCreate}
      />
    );

    const newBtn = screen.getByRole('button', { name: /new/i });
    expect(newBtn).toBeInTheDocument();
    fireEvent.click(newBtn);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('closes ComponentInspectorModal when Escape key is pressed', async () => {
    render(
      <AdminComponentLibrary
        components={mockComponents}
        routes={mockRoutes}
        onEditComponent={vi.fn()}
      />
    );

    const inspectButtons = screen.getAllByRole('button', { name: /inspect/i });
    fireEvent.click(inspectButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles division operator and comments in code syntax tokenizer safely without hanging', () => {
    const divisionSnippet: ComponentInstanceData = {
      instanceId: 'val-calc-div',
      componentType: 'VALIDATOR',
      name: 'Division Test Validator',
      description: 'Tests division operator / and block comments /* */',
      executionMode: 'CODE_SNIPPET',
      language: 'JAVA',
      sourceCode: '/* Multi-line comment */\nint avg = total / count;\nif (avg > 10) return true;\n// end of line',
      sampleTestPayload: '{}'
    };

    render(
      <AdminComponentLibrary
        components={[divisionSnippet]}
        routes={[]}
        onEditComponent={vi.fn()}
      />
    );

    expect(screen.getByText('Division Test Validator')).toBeInTheDocument();
  });

  it('sorts safely without throwing when components have null or undefined attributes', () => {
    const dirtyComponents: ComponentInstanceData[] = [
      {
        instanceId: 'comp-1',
        componentType: 'VALIDATOR',
        name: 'Alpha',
        description: '',
        executionMode: 'CODE_SNIPPET',
        language: 'JAVA',
        sourceCode: 'return null;',
        sampleTestPayload: '{}'
      },
      {
        instanceId: 'comp-2',
        componentType: (undefined as unknown as string),
        name: (undefined as unknown as string),
        description: '',
        executionMode: 'CODE_SNIPPET',
        language: 'JAVA',
        sourceCode: 'return null;',
        sampleTestPayload: '{}'
      }
    ];

    render(
      <AdminComponentLibrary
        components={dirtyComponents}
        routes={[]}
        onEditComponent={vi.fn()}
      />
    );

    // Change sort to Name
    const sortSelect = screen.getByDisplayValue('Most Routes Used');
    fireEvent.change(sortSelect, { target: { value: 'NAME_ASC' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();

    // Change sort to Type
    fireEvent.change(sortSelect, { target: { value: 'TYPE' } });
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
