/**
 * E2E Test Fixtures & Type Contracts
 * Strictly derived from PROJECT.md and TEST_INFRA.md interface contracts.
 */

export interface PipelineStepConfig {
  id: 'splitter' | 'validator' | 'processor' | 'sink';
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  fieldMappings: Array<{ source: string; target: string; transform?: string }>;
  errorPolicy: 'FAIL_FAST' | 'QUARANTINE_RECORD';
  concurrency: number;
}

export interface ProcessRoute {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'DEGRADED';
  health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  activeFilesInFlight: number;
  aggregateThroughputRecordsPerSec: number;
  successRatePercent: number;
  pipelineSteps: PipelineStepConfig[];
}

export interface FileExecutionJob {
  id: string;
  processId: string;
  fileName: string;
  fileSizeBytes: number;
  stage: 'INGESTING' | 'SPLITTING' | 'IN_FLIGHT' | 'SINKING' | 'DONE';
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'FAILED' | 'COMPLETED';
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  submittedAt: string;
  completedAt?: string;
  checksumSha256: string;
  detectedEncoding: string;
  detectedDelimiter: string;
  loomThreadAllocation: string;
}

export interface StageLatency {
  stepId: string;
  stepName: string;
  durationMicros: number;
  percentOfTotal: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface BatchChunk {
  chunkIndex: number;
  recordCount: number;
  durationMicros: number;
  partitionId: string;
  status: 'DONE' | 'PROCESSING' | 'FAILED';
}

export interface ErrorRecord {
  recordId: string;
  lineNumber: number;
  errorCode: string;
  errorMessage: string;
  rawPayload: string;
  schemaTuple: Record<string, string>;
}

export interface FileMetadata {
  sizeBytes: number;
  encoding: string;
  delimiter: string;
  rowCount: number;
  checksum: string;
  loomThread: string;
}

export interface FileDiagnosticsData {
  jobId: string;
  metadata: FileMetadata;
  stageLatencies: StageLatency[];
  batchChunks: BatchChunk[];
  errorRecords: ErrorRecord[];
}

export const defaultPipelineSteps: PipelineStepConfig[] = [
  {
    id: 'splitter',
    name: 'Univocity CSV Stream Splitter',
    type: 'CSV_STREAM_SPLITTER',
    parameters: { chunkSize: 2500, delimiter: ',', quoteChar: '"' },
    fieldMappings: [
      { source: 'raw_cust_id', target: 'customerId' },
      { source: 'raw_full_name', target: 'customerName' }
    ],
    errorPolicy: 'QUARANTINE_RECORD',
    concurrency: 16
  },
  {
    id: 'validator',
    name: 'Enterprise Schema & KYC Validator',
    type: 'SCHEMA_VALIDATOR',
    parameters: { strictMode: true, allowEmptyEmail: false, kycRuleSet: 'v2026' },
    fieldMappings: [
      { source: 'customerId', target: 'validatedCustomerId' },
      { source: 'email', target: 'validatedEmail', transform: 'LOWERCASE_TRIM' }
    ],
    errorPolicy: 'QUARANTINE_RECORD',
    concurrency: 32
  },
  {
    id: 'processor',
    name: 'Credit Risk & Loyalty Tier Enricher',
    type: 'ENRICHER',
    parameters: { enrichmentSource: 'CORE_BANKING_CACHE', timeoutMs: 150 },
    fieldMappings: [
      { source: 'validatedCustomerId', target: 'accountNumber' },
      { source: 'loyaltyPoints', target: 'tierLevel', transform: 'TIER_MAPPING' }
    ],
    errorPolicy: 'QUARANTINE_RECORD',
    concurrency: 64
  },
  {
    id: 'sink',
    name: 'Parquet S3 & Audit Sink',
    type: 'SINK_WRITER',
    parameters: { targetBucket: 's3://bulk-archive-eu-central-1', compression: 'SNAPPY' },
    fieldMappings: [
      { source: '*', target: '*' }
    ],
    errorPolicy: 'FAIL_FAST',
    concurrency: 8
  }
];

export const preSeededRoutes: ProcessRoute[] = [
  {
    id: 'route-cust-onboarding',
    name: 'Customer Master Onboarding',
    description: 'High-throughput KYC ingestion pipeline for global retail customers',
    status: 'ACTIVE',
    health: 'HEALTHY',
    activeFilesInFlight: 3,
    aggregateThroughputRecordsPerSec: 12500,
    successRatePercent: 99.8,
    pipelineSteps: defaultPipelineSteps
  },
  {
    id: 'route-order-fulfillment',
    name: 'Order Fulfillment Stream',
    description: 'Event-driven multi-region e-commerce and B2B orders stream',
    status: 'ACTIVE',
    health: 'DEGRADED',
    activeFilesInFlight: 7,
    aggregateThroughputRecordsPerSec: 6200,
    successRatePercent: 94.5,
    pipelineSteps: defaultPipelineSteps.map(s => s.id === 'validator' ? { ...s, errorPolicy: 'QUARANTINE_RECORD' as const } : s)
  },
  {
    id: 'route-fin-reconciliation',
    name: 'Financial Reconciliation',
    description: 'End-of-day general ledger balancing and cross-border settlement audit',
    status: 'PAUSED',
    health: 'CRITICAL',
    activeFilesInFlight: 1,
    aggregateThroughputRecordsPerSec: 1450,
    successRatePercent: 89.2,
    pipelineSteps: defaultPipelineSteps.map(s => ({ ...s, errorPolicy: 'FAIL_FAST' as const }))
  }
];

export const preSeededJobs: FileExecutionJob[] = [
  {
    id: 'job-101',
    processId: 'route-cust-onboarding',
    fileName: 'customers_eu_20261105.csv',
    fileSizeBytes: 14857600,
    stage: 'IN_FLIGHT',
    status: 'RUNNING',
    totalRecords: 100000,
    processedRecords: 65000,
    failedRecords: 130,
    submittedAt: '2026-11-05T18:00:00Z',
    checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'VirtualThread[#1042,loom-worker-4]'
  },
  {
    id: 'job-102',
    processId: 'route-cust-onboarding',
    fileName: 'apac_enterprise_accounts.csv',
    fileSizeBytes: 24500120,
    stage: 'INGESTING',
    status: 'QUEUED',
    totalRecords: 50000,
    processedRecords: 0,
    failedRecords: 0,
    submittedAt: '2026-11-05T18:15:00Z',
    checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'VirtualThread[#1088,loom-worker-1]'
  },
  {
    id: 'job-103',
    processId: 'route-cust-onboarding',
    fileName: 'us_northwest_migration.csv',
    fileSizeBytes: 8900000,
    stage: 'SPLITTING',
    status: 'RUNNING',
    totalRecords: 20000,
    processedRecords: 4000,
    failedRecords: 0,
    submittedAt: '2026-11-05T18:20:00Z',
    checksumSha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'VirtualThread[#1105,loom-worker-7]'
  },
  {
    id: 'job-104',
    processId: 'route-cust-onboarding',
    fileName: 'latam_partners_legacy.csv',
    fileSizeBytes: 3200400,
    stage: 'SINKING',
    status: 'RUNNING',
    totalRecords: 15000,
    processedRecords: 14850,
    failedRecords: 15,
    submittedAt: '2026-11-05T17:45:00Z',
    checksumSha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    detectedEncoding: 'ISO-8859-1',
    detectedDelimiter: ';',
    loomThreadAllocation: 'VirtualThread[#1012,loom-worker-3]'
  },
  {
    id: 'job-105',
    processId: 'route-cust-onboarding',
    fileName: 'onboarding_batch_archive_01.csv',
    fileSizeBytes: 52400000,
    stage: 'DONE',
    status: 'COMPLETED',
    totalRecords: 250000,
    processedRecords: 250000,
    failedRecords: 48,
    submittedAt: '2026-11-05T16:00:00Z',
    completedAt: '2026-11-05T16:12:30Z',
    checksumSha256: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'VirtualThread[#982,loom-worker-8]'
  },
  {
    id: 'job-106',
    processId: 'route-order-fulfillment',
    fileName: 'stalled_black_friday_orders.csv',
    fileSizeBytes: 18400000,
    stage: 'IN_FLIGHT',
    status: 'PAUSED',
    totalRecords: 80000,
    processedRecords: 32000,
    failedRecords: 440,
    submittedAt: '2026-11-05T17:30:00Z',
    checksumSha256: '1b4f0e985197199f820004630f33136acb6ac60e9ab11fa41cd95d48b29791ce',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: '|',
    loomThreadAllocation: 'VirtualThread[#1055,loom-worker-5]'
  },
  {
    id: 'job-107',
    processId: 'route-fin-reconciliation',
    fileName: 'fx_hedging_anomalies.tsv',
    fileSizeBytes: 4200000,
    stage: 'SINKING',
    status: 'FAILED',
    totalRecords: 12000,
    processedRecords: 10600,
    failedRecords: 1400,
    submittedAt: '2026-11-05T18:10:00Z',
    checksumSha256: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: '\t',
    loomThreadAllocation: 'VirtualThread[#1099,loom-worker-6]'
  }
];

export const mockDiagnosticsData: FileDiagnosticsData = {
  jobId: 'job-101',
  metadata: {
    sizeBytes: 14857600,
    encoding: 'UTF-8',
    delimiter: ',',
    rowCount: 100000,
    checksum: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    loomThread: 'VirtualThread[#1042,loom-worker-4]'
  },
  stageLatencies: [
    { stepId: 'splitter', stepName: 'Splitter', durationMicros: 12400, percentOfTotal: 10.5, status: 'SUCCESS' },
    { stepId: 'validator', stepName: 'Validator', durationMicros: 34800, percentOfTotal: 29.5, status: 'SUCCESS' },
    { stepId: 'processor', stepName: 'Enricher', durationMicros: 52600, percentOfTotal: 44.6, status: 'SUCCESS' },
    { stepId: 'sink', stepName: 'Report Sink', durationMicros: 18200, percentOfTotal: 15.4, status: 'SUCCESS' }
  ],
  batchChunks: [
    { chunkIndex: 0, recordCount: 25000, durationMicros: 29500, partitionId: 'partition-0', status: 'DONE' },
    { chunkIndex: 1, recordCount: 25000, durationMicros: 30100, partitionId: 'partition-1', status: 'DONE' },
    { chunkIndex: 2, recordCount: 25000, durationMicros: 29200, partitionId: 'partition-2', status: 'PROCESSING' },
    { chunkIndex: 3, recordCount: 25000, durationMicros: 29200, partitionId: 'partition-3', status: 'PROCESSING' }
  ],
  errorRecords: [
    {
      recordId: 'REC-101-0042',
      lineNumber: 42,
      errorCode: 'ERR_MISSING_EMAIL',
      errorMessage: 'Mandatory field email is null or empty on KYC record',
      rawPayload: '{"id": "CUST-42", "fullName": "Alice Smith", "email": "", "country": "DE", "tier": "RETAIL"}',
      schemaTuple: { id: 'CUST-42', fullName: 'Alice Smith', email: '', country: 'DE', tier: 'RETAIL' }
    },
    {
      recordId: 'REC-101-0156',
      lineNumber: 156,
      errorCode: 'ERR_INVALID_DOMAIN',
      errorMessage: 'Email domain @disposablemail.org rejected by AML policy',
      rawPayload: '{"id": "CUST-156", "fullName": "Bob Jones", "email": "bob@disposablemail.org", "country": "FR", "tier": "RETAIL"}',
      schemaTuple: { id: 'CUST-156', fullName: 'Bob Jones', email: 'bob@disposablemail.org', country: 'FR', tier: 'RETAIL' }
    },
    {
      recordId: 'REC-101-0289',
      lineNumber: 289,
      errorCode: 'ERR_INVALID_DOMAIN',
      errorMessage: 'Email domain @temporaryinbox.com rejected by AML policy',
      rawPayload: '{"id": "CUST-289", "fullName": "Charlie Day", "email": "charlie@temporaryinbox.com", "country": "DE", "tier": "RETAIL"}',
      schemaTuple: { id: 'CUST-289', fullName: 'Charlie Day', email: 'charlie@temporaryinbox.com', country: 'DE', tier: 'RETAIL' }
    },
    {
      recordId: 'REC-101-0312',
      lineNumber: 312,
      errorCode: 'ERR_TAX_ID_FORMAT',
      errorMessage: 'Tax identification number does not conform to ISO-7064 check',
      rawPayload: '{"id": "CUST-312", "fullName": "Danielle Miller", "email": "danielle@corp.net", "country": "US", "tier": "ENTERPRISE"}',
      schemaTuple: { id: 'CUST-312', fullName: 'Danielle Miller', email: 'danielle@corp.net', country: 'US', tier: 'ENTERPRISE' }
    },
    {
      recordId: 'REC-101-0498',
      lineNumber: 498,
      errorCode: 'ERR_INVALID_DOMAIN',
      errorMessage: 'Email domain @tempmail.net rejected by AML policy',
      rawPayload: '{"id": "CUST-498", "fullName": "Edward King", "email": "ed@tempmail.net", "country": "GB", "tier": "RETAIL"}',
      schemaTuple: { id: 'CUST-498', fullName: 'Edward King', email: 'ed@tempmail.net', country: 'GB', tier: 'RETAIL' }
    }
  ]
};

