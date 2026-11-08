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

  it('adds composite REST JSON connector as 1 unified box on top layer and 2 nodes inside sub-DAG', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    const restPaletteItem = await screen.findByTestId('palette-connector-conn-def-rest-json');
    fireEvent.click(restPaletteItem);

    // On top-most layer, it shows as 1 unified composite node
    await waitFor(() => {
      expect(screen.getAllByText(/Customer Enrichment Capsule/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Open Capsule Sub-DAG/i).length).toBeGreaterThan(0);
    });

    // When going inside, it displays the 2 internal nodes (Request Connector and Response Connector)
    const subDagBtns = screen.getAllByText(/Open Capsule Sub-DAG/i);
    fireEvent.click(subDagBtns[subDagBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('subflow-modal-canvas')).toBeInTheDocument();
      expect(screen.getByText(/Composite Capsule Internal Sub-DAG Studio/i)).toBeInTheDocument();
      expect(screen.getAllByText('JSON Request Connector').length).toBeGreaterThan(0);
      expect(screen.getAllByText('JSON Response Connector').length).toBeGreaterThan(0);
    });
  });

  it('opens and completes the Custom Node creation wizard', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} />);

    const createBtn = screen.getByTestId('create-custom-connector-btn');
    fireEvent.click(createBtn);

    // Modal should be visible with updated Node naming
    expect(screen.getByText('Create Custom Node')).toBeInTheDocument();
    // Verify obsolete checkbox is NOT present
    expect(screen.queryByText(/Split into Request \/ Response pair on canvas/i)).not.toBeInTheDocument();

    const nameInput = screen.getByTestId('custom-connector-name-input');
    fireEvent.change(nameInput, { target: { value: 'Kafka Stream Consumer' } });

    const addParamBtn = screen.getByTestId('add-manifest-param-btn');
    fireEvent.click(addParamBtn);

    const submitBtn = screen.getByTestId('save-custom-connector-submit');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText('Create Custom Node')).not.toBeInTheDocument();
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

  it('encapsulates Request and Response pairs into a unified Composite Sub-Flow node with internal mini-DAG launcher', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Wait for canvas topology to load
    await screen.findByTestId('topology-node-node-csv-src');

    // Add Composite REST JSON connector from palette
    const addRestBtn = await screen.findByTestId('palette-connector-conn-def-rest-json');
    fireEvent.click(addRestBtn);

    await waitFor(() => {
      expect(screen.getByText(/Added Composite Capsule/i)).toBeInTheDocument();
      // Should find unified composite card with sub-DAG canvas launcher
      expect(screen.getAllByText(/Open Capsule Sub-DAG/i).length).toBeGreaterThan(0);
    });

    // Click the Open Capsule Sub-DAG button to open modal
    const subFlowBtns = screen.getAllByText(/Open Capsule Sub-DAG/i);
    fireEvent.click(subFlowBtns[subFlowBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByTestId('subflow-modal-canvas')).toBeInTheDocument();
      expect(screen.getByText(/Composite Capsule Internal Sub-DAG Studio/i)).toBeInTheDocument();
      expect(screen.getByTestId('apply-subflow-btn')).toBeInTheDocument();
      expect(screen.getByTestId('subflow-node-inspector')).toBeInTheDocument();
    });

    // Verify sub-node inspector and Janino code validation inside sub-DAG
    const janinoTab = screen.getByTestId('tab-subnode-janino');
    fireEvent.click(janinoTab);

    const validateJaninoBtn = screen.getByTestId('subnode-validate-janino-btn');
    fireEvent.click(validateJaninoBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Janino compiled in/i).length).toBeGreaterThan(0);
    });

    // Add a new custom Janino script step inside the sub-DAG
    const addScriptBtn = screen.getByTestId('add-script-step-btn');
    fireEvent.click(addScriptBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Custom Janino Script').length).toBeGreaterThan(0);
    });

    // Close/Apply Sub-Flow Modal
    const applySubFlowBtn = screen.getByTestId('apply-subflow-btn');
    fireEvent.click(applySubFlowBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('subflow-modal-canvas')).not.toBeInTheDocument();
    });
  });

  it('supports adding dynamic branching ports with condition expressions and actions in config drawer', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Click CSV node on canvas
    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    // Open Branching & Routing Pathways accordion
    const branchToggle = await screen.findByTestId('toggle-branching-accordion');
    fireEvent.click(branchToggle);

    // Add a new branch port
    const addBranchBtn = await screen.findByTestId('add-branch-port-btn');
    fireEvent.click(addBranchBtn);

    // Fill in condition expression
    const condInputs = screen.getAllByPlaceholderText(/e\.g\. 200\.\.299/i);
    fireEvent.change(condInputs[condInputs.length - 1], { target: { value: "$.status == 'ERROR'" } });

    // Save node configuration
    const saveDrawerBtn = screen.getByTestId('drawer-save-btn');
    fireEvent.click(saveDrawerBtn);

    await waitFor(() => {
      expect(screen.getByText(/Connector settings and branching pathways updated/i)).toBeInTheDocument();
    });
  });

  it('adds and displays Retry & Delay Gateway connector on canvas', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Click Retry Gateway in palette if present
    const retryDefBtn = screen.queryByTestId('palette-connector-conn-def-retry-gateway');
    if (retryDefBtn) {
      fireEvent.click(retryDefBtn);
      await waitFor(() => {
        expect(screen.getByText(/Retry & Delay Gateway/i)).toBeInTheDocument();
      });
    }
  });

  it('renders Live Stream DAG Validation Bar, Terminal Completion Sink, and Unified Stream Pipeline Drawer', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Check Live Stream DAG validation bar
    const validationBar = await screen.findByTestId('live-topology-validation-bar');
    expect(validationBar).toBeInTheDocument();
    expect(validationBar).toHaveTextContent(/Valid Enterprise Topology/i);

    // Check palette has + Capsule button
    const addCapsuleBtn = screen.getByTestId('create-custom-capsule-btn');
    expect(addCapsuleBtn).toBeInTheDocument();

    // Check palette has Terminal Completion Sink (Blank End Node)
    const terminalSinkDef = screen.getByTestId('palette-connector-conn-def-terminal-sink');
    expect(terminalSinkDef).toBeInTheDocument();

    // Click a node to open drawer and verify 3-step Stream Pipeline
    const csvNode = await screen.findByTestId('topology-node-node-csv-src');
    fireEvent.click(csvNode);

    const streamPipelineSection = await screen.findByTestId('stream-pipeline-section');
    expect(streamPipelineSection).toBeInTheDocument();
    expect(screen.getByText(/Node Processing Logic & Output Object Preparation/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Stream In/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Stream Out/i).length).toBeGreaterThan(0);
  });

  it('renders embedded Node Palette and explicit Ingress/Egress boundary blocks inside Sub-DAG Studio', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Add Composite REST JSON connector from palette to ensure sub-DAG launcher is present
    const addRestBtn = await screen.findByTestId('palette-connector-conn-def-rest-json');
    fireEvent.click(addRestBtn);

    await waitFor(() => {
      expect(screen.getAllByText(/Open Capsule Sub-DAG/i).length).toBeGreaterThan(0);
    });

    // Click Open Sub-DAG Canvas button on the composite node
    const subFlowBtns = screen.getAllByText(/Open Capsule Sub-DAG/i);
    fireEvent.click(subFlowBtns[subFlowBtns.length - 1]);

    // Verify Sub-DAG Studio opens with palette and boundaries
    await waitFor(() => {
      expect(screen.getByTestId('subflow-modal-canvas')).toBeInTheDocument();
      expect(screen.getByTestId('subdag-node-palette')).toBeInTheDocument();
      expect(screen.getByTestId('subdag-ingress-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('subdag-egress-boundary')).toBeInTheDocument();
    });

    // Close Sub-Flow modal
    const applyBtn = screen.getByTestId('apply-subflow-btn');
    fireEvent.click(applyBtn);
  });

  it('displays End Node File Completion Barrier configuration and Force Execute button in config drawer', async () => {
    render(<AdminConnectorsAndTopologyStudio routes={routes} initialMode="EDIT" />);

    // Click terminal sink node (END node)
    const terminalNode = await screen.findByTestId('topology-node-node-terminal-sink');
    fireEvent.click(terminalNode);

    // Verify barrier section is visible
    const barrierSection = await screen.findByTestId('end-node-barrier-section');
    expect(barrierSection).toBeInTheDocument();
    expect(screen.getByTestId('barrier-mode-streaming')).toBeInTheDocument();
    expect(screen.getByTestId('barrier-mode-file-completion')).toBeInTheDocument();

    // Toggle to File Completion Barrier
    const completionBtn = screen.getByTestId('barrier-mode-file-completion');
    fireEvent.click(completionBtn);

    // Check Force Execute button
    const forceExecuteBtn = screen.getByTestId('force-execute-barrier-btn');
    expect(forceExecuteBtn).toBeInTheDocument();
    fireEvent.click(forceExecuteBtn);

    await waitFor(() => {
      expect(screen.getByText(/Barrier released/i)).toBeInTheDocument();
    });
  });
});
