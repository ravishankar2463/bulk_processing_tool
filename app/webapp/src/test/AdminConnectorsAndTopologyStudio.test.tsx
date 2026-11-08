import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AdminConnectorsAndTopologyStudio } from '../components/admin/topology/AdminConnectorsAndTopologyStudio';
import { ProcessRoute } from '../types/process';
import { MOCK_ROUTES } from '../services/mockFixtures';

describe('AdminConnectorsAndTopologyStudio Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const routes: ProcessRoute[] = MOCK_ROUTES;

  it('renders the Topology Studio header, route picker, and canvas', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    expect(screen.getByText('Route Connectors & Topology Designer')).toBeInTheDocument();
    expect(screen.getByTestId('topology-route-select')).toBeInTheDocument();
    expect(screen.getByTestId('topology-canvas-viewport')).toBeInTheDocument();
    expect(screen.getByText('Stream Palette')).toBeInTheDocument();
  });

  it('switches between Connectors and Components tabs in the palette', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const compTab = screen.getByTestId('palette-tab-components');
    fireEvent.click(compTab);

    await waitFor(() => {
      expect(screen.getByText('Registered Pipeline Components')).toBeInTheDocument();
    });

    const connTab = screen.getByTestId('palette-tab-connectors');
    fireEvent.click(connTab);

    await waitFor(() => {
      expect(screen.getByText('Standard Connectors')).toBeInTheDocument();
    });
  });

  it('opens configuration drawer when a connector node is clicked', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    // Click node on canvas via testid
    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    // Configuration drawer should open
    await waitFor(() => {
      expect(screen.getByTestId('connector-config-drawer')).toBeInTheDocument();
      expect(screen.getByText('CSV Source')).toBeInTheDocument();
      expect(screen.getByText('CSV Fields & Datatypes')).toBeInTheDocument();
    });
  });

  it('supports selecting S3 Location Upload as CSV Source and entering S3 URI', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    const sourceSelect = await screen.findByTestId('csv-source-type-select');
    fireEvent.change(sourceSelect, { target: { value: 'S3_BUCKET' } });

    // S3 Location URI input should appear
    await waitFor(() => {
      expect(screen.getByTestId('csv-s3-uri-input')).toBeInTheDocument();
    });

    const s3Input = screen.getByTestId('csv-s3-uri-input');
    fireEvent.change(s3Input, { target: { value: 's3://enterprise-bulk-lake/inbox/*.csv' } });
    expect((s3Input as HTMLInputElement).value).toBe('s3://enterprise-bulk-lake/inbox/*.csv');
  });

  it('adds and removes CSV fields dynamically using the + Add Field button', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    const addFieldBtn = await screen.findByTestId('add-csv-field-btn');
    fireEvent.click(addFieldBtn);

    // New field row should appear
    await waitFor(() => {
      const fieldInputs = screen.getAllByPlaceholderText('field_name');
      expect(fieldInputs.length).toBeGreaterThan(0);
    });

    // Delete a field
    const deleteBtns = screen.getAllByTitle('Delete Field');
    const initialCount = deleteBtns.length;
    fireEvent.click(deleteBtns[0]);

    await waitFor(() => {
      const updatedDeleteBtns = screen.getAllByTitle('Delete Field');
      expect(updatedDeleteBtns.length).toBe(initialCount - 1);
    });
  });

  it('adds composite REST JSON connector with paired Request & Response nodes', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const restPaletteItem = await screen.findByTestId('palette-connector-conn-def-rest-json');
    fireEvent.click(restPaletteItem);

    await waitFor(() => {
      expect(screen.getAllByText('JSON Request Connector').length).toBeGreaterThan(0);
      expect(screen.getAllByText('JSON Response Connector').length).toBeGreaterThan(0);
    });
  });

  it('opens and completes the Custom Connector creation wizard', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const createBtn = screen.getByTestId('create-custom-connector-btn');
    fireEvent.click(createBtn);

    // Modal should be visible
    expect(screen.getByText('Create Custom Connector')).toBeInTheDocument();

    const nameInput = screen.getByTestId('custom-connector-name-input');
    fireEvent.change(nameInput, { target: { value: 'Kafka Stream Consumer' } });

    const addParamBtn = screen.getByTestId('add-manifest-param-btn');
    fireEvent.click(addParamBtn);

    const submitBtn = screen.getByTestId('save-custom-connector-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create Custom Connector')).not.toBeInTheDocument();
    });
  });

  it('opens the interactive dry-run sandbox and runs test simulation', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    const dryRunBtn = await screen.findByTestId('drawer-dry-run-btn');
    fireEvent.click(dryRunBtn);

    // Sandbox modal should open
    await waitFor(() => {
      expect(screen.getByText('Interactive Connector Dry-Run')).toBeInTheDocument();
      expect(screen.getByTestId('dry-run-sample-input')).toBeInTheDocument();
    });

    const executeBtn = screen.getByTestId('execute-dry-run-btn');
    fireEvent.click(executeBtn);

    await waitFor(() => {
      expect(screen.getByText('Simulation Succeeded')).toBeInTheDocument();
      expect(screen.getByText('Duration:')).toBeInTheDocument();
    });
  });

  it('triggers graph validation and save actions', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const validateBtn = screen.getByTestId('validate-topology-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid/i)).toBeInTheDocument();
    });

    const saveBtn = screen.getByTestId('save-topology-btn');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/saved/i)).toBeInTheDocument();
    });
  });

  it('supports toggling between Non-Editable View Mode and Editable DAG Mode', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="VIEW" />);

    // In VIEW mode, the non-editable notice banner is displayed
    expect(screen.getByText(/Non-Editable DAG Stream View/i)).toBeInTheDocument();
    expect(screen.queryByTestId('validate-topology-btn')).not.toBeInTheDocument();

    // Click switch to edit mode
    const switchToEditBtn = screen.getByTestId('mode-toggle-edit');
    fireEvent.click(switchToEditBtn);

    await waitFor(() => {
      expect(screen.getByTestId('validate-topology-btn')).toBeInTheDocument();
      expect(screen.getByTestId('save-topology-btn')).toBeInTheDocument();
    });

    // Toggle back to VIEW mode
    const switchToViewBtn = screen.getByTestId('mode-toggle-view');
    fireEvent.click(switchToViewBtn);

    await waitFor(() => {
      expect(screen.getByText(/Non-Editable DAG Stream View/i)).toBeInTheDocument();
      expect(screen.queryByTestId('save-topology-btn')).not.toBeInTheDocument();
    });
  });

  it('filters connectors by stream role (START, MIDDLE, END) in palette', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Filter to START only
    const startFilter = screen.getByTestId('filter-role-start');
    fireEvent.click(startFilter);

    await waitFor(() => {
      // CSV Source Connector should be visible
      expect(screen.getByTestId('palette-connector-conn-def-csv')).toBeInTheDocument();
      // DB Sink should NOT be visible
      expect(screen.queryByTestId('palette-connector-conn-def-db-sink')).not.toBeInTheDocument();
    });

    // Filter to END only
    const endFilter = screen.getByTestId('filter-role-end');
    fireEvent.click(endFilter);

    await waitFor(() => {
      // DB Sink Connector should be visible
      expect(screen.getByTestId('palette-connector-conn-def-db-sink')).toBeInTheDocument();
      // CSV Source should NOT be visible
      expect(screen.queryByTestId('palette-connector-conn-def-csv')).not.toBeInTheDocument();
    });

    // Reset to ALL
    const allFilter = screen.getByTestId('filter-role-all');
    fireEvent.click(allFilter);

    await waitFor(() => {
      expect(screen.getByTestId('palette-connector-conn-def-csv')).toBeInTheDocument();
      expect(screen.getByTestId('palette-connector-conn-def-db-sink')).toBeInTheDocument();
    });
  });

  it('supports Janino custom code hook editing and validation in connector drawer', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    // Toggle custom code hook accordion
    const toggleBtn = await screen.findByTestId('toggle-code-hook-accordion');
    fireEvent.click(toggleBtn);

    // Starter template button
    const preReqBtn = await screen.findByTestId('template-pre-request');
    fireEvent.click(preReqBtn);

    const textarea = screen.getByTestId('custom-code-textarea') as HTMLTextAreaElement;
    expect(textarea.value).toContain('Pre-Request Payload');

    // Click validate code
    const validateBtn = screen.getByTestId('validate-script-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Syntax Valid/i)).toBeInTheDocument();
    });
  });

  it('supports authoring custom connectors with embedded Janino scripts in wizard modal', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    const openWizardBtn = screen.getByTestId('create-custom-connector-btn');
    fireEvent.click(openWizardBtn);

    const nameInput = await screen.findByTestId('custom-connector-name-input');
    fireEvent.change(nameInput, { target: { value: 'Scripted Kafka Stream' } });

    // Toggle custom script checkbox
    const scriptCheckbox = screen.getByTestId('toggle-custom-script-checkbox');
    fireEvent.click(scriptCheckbox);

    // Validate code in wizard
    const validateBtn = screen.getByTestId('wizard-validate-script-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Syntax Valid/i)).toBeInTheDocument();
    });
  });

  it('supports opening dedicated full-screen Custom Code Studio modal from drawer and applying changes', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    // Click [Full Studio] button in drawer header
    const fullStudioBtn = await screen.findByTestId('expand-code-studio-btn');
    fireEvent.click(fullStudioBtn);

    // Modal dialog should open
    await waitFor(() => {
      expect(screen.getByText('Java 21 / Janino Script Studio')).toBeInTheDocument();
      expect(screen.getByTestId('studio-modal-validate-btn')).toBeInTheDocument();
      expect(screen.getByTestId('studio-modal-apply-btn')).toBeInTheDocument();
    });

    // Validate in Studio modal
    const validateBtn = screen.getByTestId('studio-modal-validate-btn');
    fireEvent.click(validateBtn);

    await waitFor(() => {
      expect(screen.getByText(/Syntax Valid/i)).toBeInTheDocument();
    });

    // Apply and close modal
    const applyBtn = screen.getByTestId('studio-modal-apply-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(screen.queryByText('Java 21 / Janino Script Studio')).not.toBeInTheDocument();
    });
  });
});
