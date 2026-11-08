import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { 
  ProcessCatalog, 
  VisualStepPipeline, 
  StepConfigDrawer, 
  ExecutionQueue, 
  BatchDropzone, 
  FileDiagnosticsModal,
  FullAppHarness
} from './testHarness';
import { 
  preSeededRoutes, 
  preSeededJobs, 
  mockDiagnosticsData, 
  defaultPipelineSteps,
  ProcessRoute,
  PipelineStepConfig,
  FileExecutionJob
} from './fixtures';

describe('Tier 1: Feature Coverage E2E Suite', () => {

  // =========================================================================
  // 1. Tier 1 Catalog: Pre-seeded Routes (>=5 tests)
  // =========================================================================
  describe('Feature 1: Pre-seeded Enterprise Routes', () => {
    it('renders Customer Master Onboarding with correct description and ID', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByText('Customer Master Onboarding')).toBeInTheDocument();
      expect(screen.getByText(/High-throughput KYC ingestion pipeline/i)).toBeInTheDocument();
      expect(screen.getByTestId('route-card-route-cust-onboarding')).toBeInTheDocument();
    });

    it('renders Order Fulfillment Stream with correct description and ID', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByText('Order Fulfillment Stream')).toBeInTheDocument();
      expect(screen.getByText(/Event-driven multi-region e-commerce/i)).toBeInTheDocument();
      expect(screen.getByTestId('route-card-route-order-fulfillment')).toBeInTheDocument();
    });

    it('renders Financial Reconciliation with correct description and ID', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByText('Financial Reconciliation')).toBeInTheDocument();
      expect(screen.getByText(/general ledger balancing and cross-border settlement/i)).toBeInTheDocument();
      expect(screen.getByTestId('route-card-route-fin-reconciliation')).toBeInTheDocument();
    });

    it('displays total count of configured routes matching pre-seeded list', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const countEl = screen.getByTestId('catalog-routes-count');
      expect(countEl).toHaveTextContent('3 Configured Routes');
    });

    it('renders individual route cards with unique testids for all 3 routes', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      preSeededRoutes.forEach(route => {
        expect(screen.getByTestId(`route-card-${route.id}`)).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // 2. Tier 1 Catalog: Health & Status Indicators (>=5 tests)
  // =========================================================================
  describe('Feature 2: Route Health & Status Indicators', () => {
    it('displays ACTIVE status badge for active routes', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const badge = screen.getByTestId('status-badge-route-cust-onboarding');
      expect(badge).toHaveTextContent('ACTIVE');
    });

    it('displays PAUSED status badge for paused routes', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const badge = screen.getByTestId('status-badge-route-fin-reconciliation');
      expect(badge).toHaveTextContent('PAUSED');
    });

    it('displays HEALTHY badge for healthy route', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const badge = screen.getByTestId('health-badge-route-cust-onboarding');
      expect(badge).toHaveTextContent('HEALTHY');
    });

    it('displays DEGRADED badge for degraded route', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const badge = screen.getByTestId('health-badge-route-order-fulfillment');
      expect(badge).toHaveTextContent('DEGRADED');
    });

    it('displays CRITICAL badge for critical health route', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const badge = screen.getByTestId('health-badge-route-fin-reconciliation');
      expect(badge).toHaveTextContent('CRITICAL');
    });
  });

  // =========================================================================
  // 3. Tier 1 Catalog: Active Files in Flight (>=5 tests)
  // =========================================================================
  describe('Feature 3: Active Files in Flight Metrics', () => {
    it('displays exact active files in flight for Customer Master Onboarding', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-cust-onboarding')).toHaveTextContent('3');
    });

    it('displays exact active files in flight for Order Fulfillment Stream', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-order-fulfillment')).toHaveTextContent('7');
    });

    it('displays exact active files in flight for Financial Reconciliation', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-fin-reconciliation')).toHaveTextContent('1');
    });

    it('formats file in flight count with tabular numerals class', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const el = screen.getByTestId('active-files-route-cust-onboarding');
      expect(el.className).toContain('tabular-nums');
    });

    it('updates active files metric dynamically when route data changes', () => {
      const updatedRoutes: ProcessRoute[] = preSeededRoutes.map(r => 
        r.id === 'route-cust-onboarding' ? { ...r, activeFilesInFlight: 15 } : r
      );
      render(<ProcessCatalog routes={updatedRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('active-files-route-cust-onboarding')).toHaveTextContent('15');
    });
  });

  // =========================================================================
  // 4. Tier 1 Catalog: Aggregate Throughput & Success Rate (>=5 tests)
  // =========================================================================
  describe('Feature 4: Aggregate Throughput & Success Rate', () => {
    it('displays throughput in records per second with comma formatting', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('throughput-route-cust-onboarding')).toHaveTextContent('12,500 rec/sec');
    });

    it('applies tabular-nums CSS styling to throughput numbers for stable rendering', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const el = screen.getByTestId('throughput-route-cust-onboarding');
      expect(el.className).toContain('tabular-nums');
    });

    it('displays percentage success rate formatted to one decimal place', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('success-rate-route-cust-onboarding')).toHaveTextContent('99.8%');
      expect(screen.getByTestId('success-rate-route-order-fulfillment')).toHaveTextContent('94.5%');
      expect(screen.getByTestId('success-rate-route-fin-reconciliation')).toHaveTextContent('89.2%');
    });

    it('applies tabular-nums styling to success rate percentages', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const el = screen.getByTestId('success-rate-route-cust-onboarding');
      expect(el.className).toContain('tabular-nums');
    });

    it('renders pipeline steps count indicator within route card metrics', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('steps-count-route-cust-onboarding')).toHaveTextContent('4 Steps');
    });
  });

  // =========================================================================
  // 5. Tier 1 Catalog: Quick Route Actions (>=5 tests)
  // =========================================================================
  describe('Feature 5: Quick Route Actions', () => {
    it('renders Pause Route button for active route and calls onPauseRoute with routeId', () => {
      const onPause = vi.fn();
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={onPause} />);
      const pauseBtn = screen.getByTestId('pause-route-btn-route-cust-onboarding');
      fireEvent.click(pauseBtn);
      expect(onPause).toHaveBeenCalledWith('route-cust-onboarding');
    });

    it('renders Start Route button for paused route and calls onStartRoute with routeId', () => {
      const onStart = vi.fn();
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={onStart} onPauseRoute={() => {}} />);
      const startBtn = screen.getByTestId('start-route-btn-route-fin-reconciliation');
      fireEvent.click(startBtn);
      expect(onStart).toHaveBeenCalledWith('route-fin-reconciliation');
    });

    it('renders View Workspace button for every route card', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      preSeededRoutes.forEach(route => {
        expect(screen.getByTestId(`view-workspace-btn-${route.id}`)).toBeInTheDocument();
      });
    });

    it('invokes onSelectRoute when View Workspace button is clicked', () => {
      const onSelect = vi.fn();
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={onSelect} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      fireEvent.click(screen.getByTestId('view-workspace-btn-route-order-fulfillment'));
      expect(onSelect).toHaveBeenCalledWith('route-order-fulfillment');
    });

    it('renders quick action buttons with distinct accessible labels', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getAllByText('Pause Route').length).toBe(2); // Two active routes
      expect(screen.getAllByText('Start Route').length).toBe(1); // One paused route
    });
  });

  // =========================================================================
  // 6. Tier 2 Workspace: Visual Step Pipeline (>=5 tests)
  // =========================================================================
  describe('Feature 6: Visual Step Pipeline', () => {
    it('renders all 4 stages in sequence: Splitter, Validator, Enricher, Sink', () => {
      render(<VisualStepPipeline steps={defaultPipelineSteps} onStepClick={() => {}} />);
      expect(screen.getByTestId('pipeline-step-splitter')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-step-validator')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-step-processor')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-step-sink')).toBeInTheDocument();
    });

    it('displays visual connectors between consecutive pipeline stages', () => {
      render(<VisualStepPipeline steps={defaultPipelineSteps} onStepClick={() => {}} />);
      expect(screen.getByTestId('pipeline-connector-0')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-connector-1')).toBeInTheDocument();
      expect(screen.getByTestId('pipeline-connector-2')).toBeInTheDocument();
    });

    it('displays current error policy on each pipeline step button', () => {
      render(<VisualStepPipeline steps={defaultPipelineSteps} onStepClick={() => {}} />);
      expect(screen.getByTestId('step-policy-splitter')).toHaveTextContent('QUARANTINE_RECORD');
      expect(screen.getByTestId('step-policy-sink')).toHaveTextContent('FAIL_FAST');
    });

    it('displays concurrency virtual thread allocation on each step button', () => {
      render(<VisualStepPipeline steps={defaultPipelineSteps} onStepClick={() => {}} />);
      expect(screen.getByTestId('step-concurrency-splitter')).toHaveTextContent('16');
      expect(screen.getByTestId('step-concurrency-validator')).toHaveTextContent('32');
      expect(screen.getByTestId('step-concurrency-processor')).toHaveTextContent('64');
      expect(screen.getByTestId('step-concurrency-sink')).toHaveTextContent('8');
    });

    it('invokes onStepClick with step id when any pipeline stage button is clicked', () => {
      const onStepClick = vi.fn();
      render(<VisualStepPipeline steps={defaultPipelineSteps} onStepClick={onStepClick} />);
      fireEvent.click(screen.getByTestId('pipeline-step-validator'));
      expect(onStepClick).toHaveBeenCalledWith('validator');
    });
  });

  // =========================================================================
  // 7. Tier 2 Workspace: Step Configuration Drawer (>=5 tests)
  // =========================================================================
  describe('Feature 7: Interactive Step Configuration Drawer', () => {
    it('opens side drawer with step name and ID when stage is selected', () => {
      const step = defaultPipelineSteps[1]; // validator
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={() => {}} />);
      expect(screen.getByTestId('step-config-drawer')).toBeInTheDocument();
      expect(screen.getByText(/Configure Step: Enterprise Schema & KYC Validator/i)).toBeInTheDocument();
    });

    it('allows tuning Loom virtual thread concurrency', () => {
      const step = defaultPipelineSteps[1];
      const onSave = vi.fn();
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={onSave} />);
      const input = screen.getByTestId('drawer-concurrency-input') as HTMLInputElement;
      expect(input.value).toBe('32');
      fireEvent.change(input, { target: { value: '64' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ concurrency: 64 }));
    });

    it('allows switching error handling policy between QUARANTINE_RECORD and FAIL_FAST', () => {
      const step = defaultPipelineSteps[1];
      const onSave = vi.fn();
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={onSave} />);
      const select = screen.getByTestId('drawer-error-policy-select');
      fireEvent.change(select, { target: { value: 'FAIL_FAST' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ errorPolicy: 'FAIL_FAST' }));
    });

    it('allows editing batch chunk size parameter', () => {
      const step = defaultPipelineSteps[0]; // splitter with chunkSize 2500
      const onSave = vi.fn();
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={onSave} />);
      const input = screen.getByTestId('drawer-batch-size-input');
      fireEvent.change(input, { target: { value: '5000' } });
      fireEvent.click(screen.getByTestId('drawer-save-btn'));
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        parameters: expect.objectContaining({ batchSize: 5000 })
      }));
    });

    it('renders configured field mappings table with source and target fields', () => {
      const step = defaultPipelineSteps[1];
      render(<StepConfigDrawer isOpen={true} step={step} onClose={() => {}} onSave={() => {}} />);
      const mappingsList = screen.getByTestId('drawer-field-mappings-list');
      expect(mappingsList).toHaveTextContent('customerId');
      expect(mappingsList).toHaveTextContent('validatedCustomerId');
      expect(mappingsList).toHaveTextContent('email');
      expect(mappingsList).toHaveTextContent('validatedEmail (LOWERCASE_TRIM)');
    });
  });

  // =========================================================================
  // 8. Tier 2 Workspace: Dual Table & Card View Switcher (>=5 tests)
  // =========================================================================
  describe('Feature 8: Multi-File Execution Queue Dual Views', () => {
    it('renders execution queue header with total file count', () => {
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByText('Multi-File Execution Queue')).toBeInTheDocument();
      expect(screen.getByText('7 files tracked in process queue')).toBeInTheDocument();
    });

    it('defaults to Table View showing table container and rows', () => {
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('execution-queue-table-view')).toBeInTheDocument();
      expect(screen.queryByTestId('execution-queue-card-view')).not.toBeInTheDocument();
    });

    it('switches to Card View when Card View button is toggled', () => {
      const onModeChange = vi.fn();
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="table"
          onViewModeChange={onModeChange}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      fireEvent.click(screen.getByTestId('view-card-btn'));
      expect(onModeChange).toHaveBeenCalledWith('card');
    });

    it('renders Card View layout when viewMode is card', () => {
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="card"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('execution-queue-card-view')).toBeInTheDocument();
      expect(screen.queryByTestId('execution-queue-table-view')).not.toBeInTheDocument();
      expect(screen.getByTestId('job-card-job-101')).toBeInTheDocument();
    });

    it('preserves job files and status across both table and card views', () => {
      render(
        <ExecutionQueue
          jobs={preSeededJobs}
          viewMode="card"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByText('customers_eu_20261105.csv')).toBeInTheDocument();
      expect(screen.getByText('apac_enterprise_accounts.csv')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 9. Tier 2 Workspace: 5-Stage Progression Indicators (>=5 tests)
  // =========================================================================
  describe('Feature 9: 5-Stage File Progression Indicators', () => {
    it('renders all 5 stages in progression indicator: INGESTING, SPLITTING, IN_FLIGHT, SINKING, DONE', () => {
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('stage-indicator-job-101-INGESTING')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-job-101-SPLITTING')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-job-101-IN_FLIGHT')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-job-101-SINKING')).toBeInTheDocument();
      expect(screen.getByTestId('stage-indicator-job-101-DONE')).toBeInTheDocument();
    });

    it('highlights INGESTING stage when file is queued', () => {
      const job = preSeededJobs.find(j => j.stage === 'INGESTING')!;
      render(
        <ExecutionQueue
          jobs={[job]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const indicator = screen.getByTestId(`stage-indicator-${job.id}-INGESTING`);
      expect(indicator).toHaveTextContent('INGESTING');
    });

    it('highlights SPLITTING stage when file is actively splitting chunks', () => {
      const job = preSeededJobs.find(j => j.stage === 'SPLITTING')!;
      render(
        <ExecutionQueue
          jobs={[job]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId(`stage-indicator-${job.id}-SPLITTING`)).toBeInTheDocument();
    });

    it('highlights IN_FLIGHT stage for jobs currently in stream execution', () => {
      const job = preSeededJobs.find(j => j.stage === 'IN_FLIGHT')!;
      render(
        <ExecutionQueue
          jobs={[job]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId(`stage-indicator-${job.id}-IN_FLIGHT`)).toBeInTheDocument();
    });

    it('highlights DONE stage for completed jobs', () => {
      const job = preSeededJobs.find(j => j.stage === 'DONE')!;
      render(
        <ExecutionQueue
          jobs={[job]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId(`stage-indicator-${job.id}-DONE`)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 10. Tier 2 Workspace: Record Progress & Failure Counters (>=5 tests)
  // =========================================================================
  describe('Feature 10: Record Progress & Failure Counters', () => {
    it('renders percentage progress with tabular numerals', () => {
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const progressEl = screen.getByTestId('job-progress-job-101');
      expect(progressEl).toHaveTextContent('65%');
      expect(progressEl.className).toContain('tabular-nums');
    });

    it('displays processed records vs total records count', () => {
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('job-progress-job-101')).toHaveTextContent('65,000 / 100,000');
    });

    it('renders failure counter with error counts', () => {
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('job-failures-job-101')).toHaveTextContent('130 errors');
    });

    it('renders 0 errors when job has no failures', () => {
      const job = preSeededJobs.find(j => j.failedRecords === 0)!;
      render(
        <ExecutionQueue
          jobs={[job]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId(`job-failures-${job.id}`)).toHaveTextContent('0 errors');
    });

    it('displays progress and failures in Card View accurately', () => {
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="card"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      expect(screen.getByTestId('card-job-progress-job-101')).toHaveTextContent('Progress: 65%');
      expect(screen.getByTestId('card-job-failures-job-101')).toHaveTextContent('Failures: 130');
    });
  });

  // =========================================================================
  // 11. Tier 2 Workspace: Per-File Action Controls (>=5 tests)
  // =========================================================================
  describe('Feature 11: Per-File Execution Controls', () => {
    it('renders Pause action for running jobs and invokes onPauseJob', () => {
      const onPause = vi.fn();
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={onPause}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const pauseBtn = screen.getByTestId('btn-pause-job-101');
      fireEvent.click(pauseBtn);
      expect(onPause).toHaveBeenCalledWith('job-101');
    });

    it('renders Resume action for paused jobs and invokes onResumeJob', () => {
      const onResume = vi.fn();
      const pausedJob = preSeededJobs.find(j => j.status === 'PAUSED')!;
      render(
        <ExecutionQueue
          jobs={[pausedJob]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={onResume}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const resumeBtn = screen.getByTestId(`btn-resume-${pausedJob.id}`);
      fireEvent.click(resumeBtn);
      expect(onResume).toHaveBeenCalledWith(pausedJob.id);
    });

    it('renders Retry action for failed jobs and invokes onRetryJob', () => {
      const onRetry = vi.fn();
      const failedJob = preSeededJobs.find(j => j.status === 'FAILED')!;
      render(
        <ExecutionQueue
          jobs={[failedJob]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={onRetry}
          onCancelJob={() => {}}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const retryBtn = screen.getByTestId(`btn-retry-${failedJob.id}`);
      fireEvent.click(retryBtn);
      expect(onRetry).toHaveBeenCalledWith(failedJob.id);
    });

    it('renders Cancel action for incomplete jobs and invokes onCancelJob', () => {
      const onCancel = vi.fn();
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={onCancel}
          onDownloadReport={() => {}}
          onInspectErrors={() => {}}
        />
      );
      const cancelBtn = screen.getByTestId('btn-cancel-job-101');
      fireEvent.click(cancelBtn);
      expect(onCancel).toHaveBeenCalledWith('job-101');
    });

    it('renders Download Report and Inspect Errors buttons', () => {
      const onDownload = vi.fn();
      const onInspect = vi.fn();
      render(
        <ExecutionQueue
          jobs={[preSeededJobs[0]]}
          viewMode="table"
          onViewModeChange={() => {}}
          onPauseJob={() => {}}
          onResumeJob={() => {}}
          onRetryJob={() => {}}
          onCancelJob={() => {}}
          onDownloadReport={onDownload}
          onInspectErrors={onInspect}
        />
      );
      fireEvent.click(screen.getByTestId('btn-report-job-101'));
      expect(onDownload).toHaveBeenCalledWith('job-101');

      fireEvent.click(screen.getByTestId('btn-inspect-job-101'));
      expect(onInspect).toHaveBeenCalledWith('job-101');
    });
  });

  // =========================================================================
  // 12. Tier 2 Workspace: Process-Targeted Batch Dropzone (>=5 tests)
  // =========================================================================
  describe('Feature 12: Process-Targeted Multi-File Ingestion Dropzone', () => {
    it('renders dropzone container with descriptive instructions', () => {
      render(<BatchDropzone onFilesUploaded={() => {}} />);
      expect(screen.getByTestId('batch-dropzone-container')).toBeInTheDocument();
      expect(screen.getByText('Process-Targeted Multi-File Ingestion Dropzone')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop batch files/i)).toBeInTheDocument();
    });

    it('provides file input with multiple file selection support', () => {
      render(<BatchDropzone onFilesUploaded={() => {}} />);
      const input = screen.getByTestId('batch-dropzone-input') as HTMLInputElement;
      expect(input.type).toBe('file');
      expect(input.multiple).toBe(true);
    });

    it('handles dragover and dragleave visual state changes', () => {
      render(<BatchDropzone onFilesUploaded={() => {}} />);
      const dropzone = screen.getByTestId('batch-dropzone-container');
      fireEvent.dragOver(dropzone);
      fireEvent.dragLeave(dropzone);
      expect(dropzone).toBeInTheDocument();
    });

    it('handles drop event and propagates uploaded File objects to callback', () => {
      const onFiles = vi.fn();
      render(<BatchDropzone onFilesUploaded={onFiles} />);
      const dropzone = screen.getByTestId('batch-dropzone-container');
      const testFile = new File(['id,name\n1,Test'], 'batch_01.csv', { type: 'text/csv' });
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [testFile]
        }
      });
      expect(onFiles).toHaveBeenCalledWith([testFile]);
    });

    it('handles native file input change event with multiple files', () => {
      const onFiles = vi.fn();
      render(<BatchDropzone onFilesUploaded={onFiles} />);
      const input = screen.getByTestId('batch-dropzone-input');
      const file1 = new File(['a'], 'f1.csv', { type: 'text/csv' });
      const file2 = new File(['b'], 'f2.csv', { type: 'text/csv' });
      fireEvent.change(input, {
        target: { files: [file1, file2] }
      });
      expect(onFiles).toHaveBeenCalledWith([file1, file2]);
    });
  });

  // =========================================================================
  // 13. Tier 3 File Diagnostics: Metadata Panel (>=5 tests)
  // =========================================================================
  describe('Feature 13: File Metadata Panel', () => {
    it('displays formatted file size in MB with tabular numerals', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const sizeEl = screen.getByTestId('meta-size');
      expect(sizeEl).toHaveTextContent('14.17 MB');
      expect(sizeEl.className).toContain('tabular-nums');
    });

    it('displays detected character encoding (e.g. UTF-8)', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('meta-encoding')).toHaveTextContent('UTF-8');
    });

    it('displays detected field delimiter (e.g. comma, tab, pipe)', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('meta-delimiter')).toHaveTextContent(',');
    });

    it('displays total row count with comma thousands formatting', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const rowCountEl = screen.getByTestId('meta-row-count');
      expect(rowCountEl).toHaveTextContent('100,000');
      expect(rowCountEl.className).toContain('tabular-nums');
    });

    it('displays SHA-256 checksum and Loom virtual thread allocation', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('meta-checksum')).toHaveTextContent('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
      expect(screen.getByTestId('meta-loom-thread')).toHaveTextContent('VirtualThread[#1042,loom-worker-4]');
    });
  });

  // =========================================================================
  // 14. Tier 3 File Diagnostics: Latency Waterfall (>=5 tests)
  // =========================================================================
  describe('Feature 14: Latency Waterfall Visualization', () => {
    it('renders timing breakdown for all pipeline steps with step names', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText('Splitter')).toBeInTheDocument();
      expect(screen.getByText('Validator')).toBeInTheDocument();
      expect(screen.getByText('Enricher')).toBeInTheDocument();
      expect(screen.getByText('Report Sink')).toBeInTheDocument();
    });

    it('displays microsecond duration with tabular numerals', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const splitterDuration = screen.getByTestId('waterfall-duration-splitter');
      expect(splitterDuration).toHaveTextContent('12,400 µs');
      expect(splitterDuration.className).toContain('tabular-nums');
    });

    it('displays percentage of total pipeline latency per step', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('waterfall-percent-splitter')).toHaveTextContent('10.5%');
      expect(screen.getByTestId('waterfall-percent-processor')).toHaveTextContent('44.6%');
    });

    it('renders visual waterfall bar with percentage width', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const fillBar = screen.getByTestId('waterfall-fill-validator');
      expect(fillBar.style.width).toBe('29.5%');
    });

    it('renders waterfall elements inside dedicated container testid', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('diagnostics-latency-waterfall')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 15. Tier 3 File Diagnostics: Batch Chunk Distribution (>=5 tests)
  // =========================================================================
  describe('Feature 15: Batch Chunk Distribution Metrics', () => {
    it('renders partition cards for all batch chunks', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('chunk-card-0')).toBeInTheDocument();
      expect(screen.getByTestId('chunk-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('chunk-card-2')).toBeInTheDocument();
      expect(screen.getByTestId('chunk-card-3')).toBeInTheDocument();
    });

    it('displays chunk index and partition identifier for each chunk', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText('Chunk #0 (partition-0)')).toBeInTheDocument();
      expect(screen.getByText('Chunk #1 (partition-1)')).toBeInTheDocument();
    });

    it('displays chunk record count with tabular numerals', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('chunk-card-0')).toHaveTextContent('Records: 25,000');
    });

    it('displays chunk execution latency in microseconds', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('chunk-card-0')).toHaveTextContent('Duration: 29,500 µs');
    });

    it('displays chunk execution status (DONE, PROCESSING)', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('chunk-card-0')).toHaveTextContent('DONE');
      expect(screen.getByTestId('chunk-card-2')).toHaveTextContent('PROCESSING');
    });
  });

  // =========================================================================
  // 16. Tier 3 File Diagnostics: Headroom Context Compression (>=5 tests)
  // =========================================================================
  describe('Feature 16: Headroom Context Compression (-74%)', () => {
    it('renders Headroom compression toggle checkbox', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('headroom-toggle-checkbox')).toBeInTheDocument();
      expect(screen.getByText(/Headroom Compression \(-74% tokens\)/i)).toBeInTheDocument();
    });

    it('is unchecked by default showing uncompressed error view', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const checkbox = screen.getByTestId('headroom-toggle-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      expect(screen.queryByTestId('headroom-savings-banner')).not.toBeInTheDocument();
    });

    it('displays token reduction savings banner when toggled on', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const checkbox = screen.getByTestId('headroom-toggle-checkbox');
      fireEvent.click(checkbox);
      expect(screen.getByTestId('headroom-savings-banner')).toBeInTheDocument();
      expect(screen.getByText(/Structural Deduplication Active/i)).toBeInTheDocument();
    });

    it('achieves substantial token reduction savings on repetitive record payload', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      fireEvent.click(screen.getByTestId('headroom-toggle-checkbox'));
      const savingsPct = screen.getByTestId('headroom-savings-pct');
      expect(savingsPct.textContent).toMatch(/-\d+% Token Reduction/);
    });

    it('displays compressed schema-indexed output in raw JSON terminal when toggled', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      fireEvent.click(screen.getByTestId('headroom-toggle-checkbox'));
      fireEvent.click(screen.getByTestId('tab-raw-json'));
      const terminalContent = screen.getByTestId('raw-json-content');
      expect(terminalContent.textContent).toContain('_headroom');
      expect(terminalContent.textContent).toContain('schema');
    });
  });

  // =========================================================================
  // 17. Tier 3 File Diagnostics: Schema Tuple View (>=5 tests)
  // =========================================================================
  describe('Feature 17: Schema Tuple View', () => {
    it('renders Schema Tuple View table tab by default', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('schema-tuple-view-table')).toBeInTheDocument();
    });

    it('renders table headers for Record ID, Line, Error Code, Error Message, Schema Values', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText('Record ID')).toBeInTheDocument();
      expect(screen.getByText('Line')).toBeInTheDocument();
      expect(screen.getByText('Error Code')).toBeInTheDocument();
      expect(screen.getByText('Error Message')).toBeInTheDocument();
      expect(screen.getByText('Schema Values')).toBeInTheDocument();
    });

    it('renders record IDs and line numbers for each failed record', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText('REC-101-0042')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('REC-101-0156')).toBeInTheDocument();
    });

    it('renders error codes with highlighted styling', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText('ERR_MISSING_EMAIL')).toBeInTheDocument();
      expect(screen.getAllByText('ERR_INVALID_DOMAIN').length).toBeGreaterThan(0);
      expect(screen.getByText('ERR_TAX_ID_FORMAT')).toBeInTheDocument();
    });

    it('renders structured schema tuple dictionary for each record', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Danielle Miller/i)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 18. Tier 3 File Diagnostics: Raw JSON Terminal & CSV Export (>=5 tests)
  // =========================================================================
  describe('Feature 18: Raw JSON Terminal & CSV Export', () => {
    it('switches to Raw JSON Terminal when tab is clicked', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      fireEvent.click(screen.getByTestId('tab-raw-json'));
      expect(screen.getByTestId('raw-json-terminal')).toBeInTheDocument();
      expect(screen.queryByTestId('schema-tuple-view-table')).not.toBeInTheDocument();
    });

    it('renders formatted JSON in monospace dark code block', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      fireEvent.click(screen.getByTestId('tab-raw-json'));
      const codeBlock = screen.getByTestId('raw-json-content');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock.textContent).toContain('ERR_MISSING_EMAIL');
    });

    it('renders Export CSV button in diagnostics header', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      expect(screen.getByTestId('btn-export-errors-csv')).toBeInTheDocument();
    });

    it('invokes CSV export handler when Export CSV button is clicked', () => {
      const onExport = vi.fn();
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} onExportCsv={onExport} />);
      fireEvent.click(screen.getByTestId('btn-export-errors-csv'));
      expect(onExport).toHaveBeenCalled();
    });

    it('closes modal when close button is clicked', () => {
      const onClose = vi.fn();
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={onClose} />);
      fireEvent.click(screen.getByTestId('close-diagnostics-btn'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 19. UI Craft: Concentric Radii Geometry & Tabular Numerals (>=5 tests)
  // =========================================================================
  describe('Feature 19: UI Craft & Design Tokens', () => {
    it('catalog container satisfies concentric radii formula: R_outer = R_inner + padding', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const container = screen.getByTestId('process-catalog-container');
      // R_outer: 16px, padding: 12px, inner: 4px -> 4 + 12 = 16
      expect(container.style.borderRadius).toBe('16px');
      expect(container.style.padding).toBe('12px');
    });

    it('diagnostics modal satisfies concentric radii formula: R_outer = R_inner + padding', () => {
      render(<FileDiagnosticsModal isOpen={true} diagnostics={mockDiagnosticsData} onClose={() => {}} />);
      const modal = screen.getByTestId('file-diagnostics-modal');
      expect(modal.style.borderRadius).toBe('16px');
      expect(modal.style.padding).toBe('24px');
    });

    it('applies tabular-nums class to numerical metric fields to prevent layout jitter', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      expect(screen.getByTestId('throughput-route-cust-onboarding').className).toContain('tabular-nums');
      expect(screen.getByTestId('success-rate-route-cust-onboarding').className).toContain('tabular-nums');
      expect(screen.getByTestId('active-files-route-cust-onboarding').className).toContain('tabular-nums');
    });

    it('applies subtle layered shadow styling to container elements', () => {
      render(<ProcessCatalog routes={preSeededRoutes} onSelectRoute={() => {}} onStartRoute={() => {}} onPauseRoute={() => {}} />);
      const container = screen.getByTestId('process-catalog-container');
      expect(container.style.boxShadow).toBeTruthy();
    });

    it('renders full app harness without console errors or layout crashes', () => {
      render(<FullAppHarness />);
      expect(screen.getByTestId('enterprise-bulk-processor-app')).toBeInTheDocument();
      expect(screen.getByText('Enterprise Bulk Processing Hub')).toBeInTheDocument();
    });
  });

});

