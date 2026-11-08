import {
  ProcessRoute,
  PipelineStepConfig,
  FileExecutionJob,
  JobStage,
  JobStatus,
  FileDiagnosticsData,
  BatchChunk,
  StageLatency,
  RecordErrorItem,
  ComponentInstance,
  ExecutionReportSummary,
  FileRecordItem,
  ConnectorDefinition,
  ConnectorInstance,
  RouteTopology,
  ConnectorDryRunRequest,
  ConnectorDryRunResult,
  ScriptValidationResult,
  SchemaParseResult,
  WsdlValidationResult,
  SoapEnvelopeGenerateResult,
  XPathExtractResult
} from '../types/process';

interface CustomImportMeta {
  env?: {
    VITE_API_URL?: string;
  };
}

const API_BASE = ((import.meta as unknown as CustomImportMeta).env?.VITE_API_URL) || '';

/**
 * Foundation Component Instances
 */
export const MOCK_COMPONENTS: ComponentInstance[] = [
  {
    instanceId: 'splitter-csv-univocity',
    componentType: 'SPLITTER',
    name: 'Streaming CSV Splitter',
    description: 'Univocity streaming CSV parser with virtual thread chunking and zero-copy buffering',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Univocity CSV Splitter\npublic List<Record> split(InputStream in, int chunkSize) {\n    return UnivocityParser.parseChunks(in, chunkSize, \',\');\n}',
    sampleTestPayload: '{"chunkSize": 500, "delimiter": ",", "hasHeader": true}',
    version: 1,
    boundProcessIds: ['customer-master-onboarding', 'order-fulfillment-stream', 'financial-reconciliation']
  },
  {
    instanceId: 'val-customer-kyc',
    componentType: 'VALIDATOR',
    name: 'Customer KYC Email & Domain Validator',
    description: 'Ensures email syntax conforms to RFC 5322 and corporate domain compliance policies',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Java 21 Validation Script\nif (!record.containsKey("email") || ((String)record.get("email")).isBlank()) {\n    return ValidationResult.invalid("MISSING_EMAIL", "Email required");\n}\nif (((String)record.get("email")).endsWith("@tempmail.com")) {\n    return ValidationResult.invalid("INVALID_DOMAIN", "Domain @tempmail.com rejected");\n}\nreturn ValidationResult.valid();',
    sampleTestPayload: '{"id": 101, "email": "test@example.com"}',
    version: 1,
    boundProcessIds: ['customer-master-onboarding']
  },
  {
    instanceId: 'val-order-schema',
    componentType: 'VALIDATOR',
    name: 'Order Amount & Currency Validator',
    description: 'Validates positive monetary amounts and active ISO currency codes',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Order Schema Validator\nif (!record.containsKey("amount") || Double.parseDouble(record.get("amount").toString()) <= 0) {\n    return ValidationResult.invalid("INVALID_AMOUNT", "Amount must be positive");\n}\nreturn ValidationResult.valid();',
    sampleTestPayload: '{"orderId": "ORD-991", "amount": 149.50, "currency": "USD"}',
    version: 1,
    boundProcessIds: ['order-fulfillment-stream']
  },
  {
    instanceId: 'proc-customer-enricher',
    componentType: 'BATCH_PROCESSOR',
    name: 'Customer Loyalty & Tier Enricher',
    description: 'Calculates loyalty points and assigns bronze/silver/gold tier with Loom virtual thread execution',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Java 21 Batch Processor Script\njava.util.Map result = new java.util.HashMap(record);\nresult.put("tier", "GOLD");\nresult.put("points", 5000);\nreturn result;',
    sampleTestPayload: '{"id": 101, "spend": 5000}',
    version: 1,
    boundProcessIds: ['customer-master-onboarding']
  },
  {
    instanceId: 'proc-tax-calc',
    componentType: 'BATCH_PROCESSOR',
    name: 'Regional Tax & VAT Calculator',
    description: 'Calculates regional sales tax and international VAT rates',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Tax & VAT Calculation\njava.util.Map result = new java.util.HashMap(record);\ndouble amount = Double.parseDouble(record.getOrDefault("amount", 0).toString());\nresult.put("tax", amount * 0.0825);\nresult.put("netTotal", amount * 1.0825);\nreturn result;',
    sampleTestPayload: '{"amount": 100.00, "region": "US-CA"}',
    version: 1,
    boundProcessIds: ['order-fulfillment-stream', 'financial-reconciliation']
  },
  {
    instanceId: 'writer-audit-csv',
    componentType: 'REPORT_WRITER',
    name: 'Audit CSV & Ledger Sink',
    description: 'Appends processed records into immutable audit log and general ledger storage',
    executionMode: 'CODE_SNIPPET',
    language: 'JAVA',
    sourceCode: '// Audit Ledger Sink\npublic void sink(List<Record> batch) {\n    AuditLogger.writeImmutable(batch, "s3://audit-vault/ledgers/");\n}',
    sampleTestPayload: '{"batchSize": 500, "sinkFormat": "CSV"}',
    version: 1,
    boundProcessIds: ['customer-master-onboarding', 'order-fulfillment-stream', 'financial-reconciliation']
  }
];

/**
 * Standard enterprise pipeline steps for pre-seeded routes.
 */
export const DEFAULT_PIPELINE_STEPS: ReadonlyArray<PipelineStepConfig> = [
  {
    id: 'splitter',
    name: 'Streaming CSV Splitter',
    type: 'STREAMING_CSV_SPLITTER',
    parameters: {
      chunkSize: 500,
      delimiter: ',',
      hasHeader: true,
      encoding: 'UTF-8'
    },
    fieldMappings: [],
    errorPolicy: 'FAIL_FAST',
    concurrency: 8
  },
  {
    id: 'validator',
    name: 'Dynamic Schema Validator',
    type: 'JANINO_DYNAMIC_VALIDATOR',
    parameters: {
      strictMode: true,
      quarantineThreshold: 100
    },
    fieldMappings: [
      { source: 'raw_email', target: 'email', transform: 'toLowerCase().trim()' },
      { source: 'raw_postal', target: 'postalCode', transform: 'regexNormalize()' }
    ],
    errorPolicy: 'QUARANTINE_RECORD',
    concurrency: 16
  },
  {
    id: 'processor',
    name: 'Enrichment & Transformation Engine',
    type: 'LOOM_RECORD_ENRICHER',
    parameters: {
      lookupCacheEnabled: true,
      taxRuleEngine: 'US_EU_STANDARD'
    },
    fieldMappings: [
      { source: 'customerId', target: 'accountRef', transform: 'prefix("ACC-")' },
      { source: 'amount', target: 'netAmount', transform: 'applyTax()' }
    ],
    errorPolicy: 'QUARANTINE_RECORD',
    concurrency: 32
  },
  {
    id: 'sink',
    name: 'Audit Report Sink',
    type: 'AUDIT_CSV_REPORT_SINK',
    parameters: {
      generateSummaryHeader: true,
      includeStackTraces: false,
      compression: 'NONE'
    },
    fieldMappings: [],
    errorPolicy: 'FAIL_FAST',
    concurrency: 4
  }
];

/**
 * Pre-seeded Enterprise Routes matching R1 & PROJECT.md
 */
export const MOCK_ROUTES: ProcessRoute[] = [
  {
    id: 'customer-master-onboarding',
    name: 'Customer Master Onboarding',
    description: 'High-throughput batch ingestion pipeline for enterprise customer records with Janino deduplication.',
    status: 'ACTIVE',
    health: 'HEALTHY',
    activeFilesInFlight: 2,
    aggregateThroughputRecordsPerSec: 1450.5,
    successRatePercent: 99.4,
    pipelineSteps: DEFAULT_PIPELINE_STEPS,
    retentionDays: 30
  },
  {
    id: 'order-fulfillment-stream',
    name: 'Order Fulfillment Stream',
    description: 'Continuous order stream ingestion connecting Kafka topics to SAP ERP fulfillment ledgers.',
    status: 'ACTIVE',
    health: 'HEALTHY',
    activeFilesInFlight: 5,
    aggregateThroughputRecordsPerSec: 3280.0,
    successRatePercent: 99.8,
    pipelineSteps: DEFAULT_PIPELINE_STEPS,
    retentionDays: 14
  },
  {
    id: 'financial-reconciliation',
    name: 'Financial Reconciliation',
    description: 'Scheduled settlement balancing and double-entry general ledger reconciliation pipeline.',
    status: 'PAUSED',
    health: 'DEGRADED',
    activeFilesInFlight: 0,
    aggregateThroughputRecordsPerSec: 850.2,
    successRatePercent: 96.7,
    pipelineSteps: DEFAULT_PIPELINE_STEPS,
    retentionDays: 60
  }
];

/**
 * Pre-seeded File Execution Jobs matching Tier 2 visual stage progression
 */
export const MOCK_JOBS: FileExecutionJob[] = [
  {
    id: 'job-cmo-001',
    processId: 'customer-master-onboarding',
    fileName: 'customers_q4_enterprise.csv',
    fileSizeBytes: 4528190,
    stage: 'IN_FLIGHT',
    status: 'RUNNING',
    totalRecords: 10000,
    processedRecords: 6500,
    failedRecords: 20,
    submittedAt: new Date(Date.now() - 480000).toISOString(),
    checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'virtual-worker-101-loom-04'
  },
  {
    id: 'job-cmo-002',
    processId: 'customer-master-onboarding',
    fileName: 'customers_emea_legacy.csv',
    fileSizeBytes: 1820400,
    stage: 'DONE',
    status: 'COMPLETED',
    totalRecords: 5000,
    processedRecords: 5000,
    failedRecords: 12,
    submittedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3420000).toISOString(),
    checksumSha256: 'a4f89d9123891048123984128938120489123048912389102489128309128301',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'virtual-worker-102-loom-01'
  },
  {
    id: 'job-cmo-003',
    processId: 'customer-master-onboarding',
    fileName: 'customers_apac_delta.csv',
    fileSizeBytes: 8943200,
    stage: 'SPLITTING',
    status: 'RUNNING',
    totalRecords: 25000,
    processedRecords: 1500,
    failedRecords: 0,
    submittedAt: new Date(Date.now() - 120000).toISOString(),
    checksumSha256: 'c734891084120938401928340192834019283401928340192834019283401928',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'virtual-worker-103-loom-08'
  },
  {
    id: 'job-ofs-101',
    processId: 'order-fulfillment-stream',
    fileName: 'orders_realtime_stream_01.csv',
    fileSizeBytes: 15400200,
    stage: 'IN_FLIGHT',
    status: 'RUNNING',
    totalRecords: 50000,
    processedRecords: 38200,
    failedRecords: 14,
    submittedAt: new Date(Date.now() - 600000).toISOString(),
    checksumSha256: 'f589120348120938401928340192834019283401928340192834019283401928',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'virtual-worker-201-loom-12'
  },
  {
    id: 'job-fin-201',
    processId: 'financial-reconciliation',
    fileName: 'general_ledger_recon_nov.csv',
    fileSizeBytes: 3940100,
    stage: 'SINKING',
    status: 'PAUSED',
    totalRecords: 12000,
    processedRecords: 11400,
    failedRecords: 38,
    submittedAt: new Date(Date.now() - 1800000).toISOString(),
    checksumSha256: 'b123984019283401928340192834019283401928340192834019283401928340',
    detectedEncoding: 'UTF-8',
    detectedDelimiter: ',',
    loomThreadAllocation: 'virtual-worker-301-loom-02'
  }
];

/**
 * Pre-seeded Diagnostics Fixture for File Level Inspection
 */
export const MOCK_DIAGNOSTICS_MAP: Record<string, FileDiagnosticsData> = {
  'job-cmo-001': {
    jobId: 'job-cmo-001',
    metadata: {
      sizeBytes: 4528190,
      encoding: 'UTF-8',
      delimiter: ',',
      rowCount: 10000,
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      loomThread: 'virtual-worker-101-loom-04'
    },
    stageLatencies: [
      { 
        stepId: 'splitter', 
        stepName: 'Streaming CSV Splitter', 
        durationMicros: 285400, 
        percentOfTotal: 16.6, 
        status: 'SUCCESS',
        inputRecords: 10000,
        successRecords: 10000,
        failedRecords: 0,
        inFlightRecords: 0,
        boundComponentId: 'DEFAULT_SPLITTER'
      },
      { 
        stepId: 'validator', 
        stepName: 'Dynamic Schema Validator', 
        durationMicros: 491200, 
        percentOfTotal: 28.6, 
        status: 'WARNING',
        inputRecords: 10000,
        successRecords: 9980,
        failedRecords: 20,
        inFlightRecords: 0,
        boundComponentId: 'val-customer-kyc'
      },
      { 
        stepId: 'processor', 
        stepName: 'Enrichment & Transformation', 
        durationMicros: 760100, 
        percentOfTotal: 44.3, 
        status: 'SUCCESS',
        inputRecords: 9980,
        successRecords: 9980,
        failedRecords: 0,
        inFlightRecords: 0,
        boundComponentId: 'proc-tax-calc'
      },
      { 
        stepId: 'sink', 
        stepName: 'Audit Report Sink', 
        durationMicros: 179800, 
        percentOfTotal: 10.5, 
        status: 'SUCCESS',
        inputRecords: 9980,
        successRecords: 6480,
        failedRecords: 0,
        inFlightRecords: 3500,
        boundComponentId: 'writer-audit-csv'
      }
    ],
    batchChunks: [
      { chunkIndex: 0, recordCount: 500, durationMicros: 85200, partitionId: 'partition-p0', status: 'DONE', successfulCount: 499, failedCount: 1, batchId: 'job-cmo-001-batch-0' },
      { chunkIndex: 1, recordCount: 500, durationMicros: 81400, partitionId: 'partition-p1', status: 'DONE', successfulCount: 493, failedCount: 7, batchId: 'job-cmo-001-batch-1' },
      { chunkIndex: 2, recordCount: 500, durationMicros: 94100, partitionId: 'partition-p0', status: 'DONE', successfulCount: 494, failedCount: 6, batchId: 'job-cmo-001-batch-2' },
      { chunkIndex: 3, recordCount: 500, durationMicros: 88700, partitionId: 'partition-p1', status: 'DONE', successfulCount: 500, failedCount: 0, batchId: 'job-cmo-001-batch-3' },
      { chunkIndex: 4, recordCount: 500, durationMicros: 91200, partitionId: 'partition-p2', status: 'PROCESSING', successfulCount: 244, failedCount: 6, batchId: 'job-cmo-001-batch-4' }
    ],
    recordsLineage: [
      {
        recordId: 'rec-101',
        lineNumber: 42,
        batchIndex: 0,
        batchId: 'job-cmo-001-batch-0',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Email field does not conform to RFC 5322 address pattern',
        schemaTuple: { id: 'CUST-0042', name: 'Marcus Aurelius', email: 'marcus.aurelius@rome', region: 'EMEA', postal: '00184' },
        rawPayload: '{"id": "CUST-0042", "name": "Marcus Aurelius", "email": "marcus.aurelius@rome", "region": "EMEA", "postal": "00184"}',
        processedAt: new Date(Date.now() - 360000).toISOString()
      },
      {
        recordId: 'rec-102',
        lineNumber: 189,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'Postal code format does not match country definition rules',
        schemaTuple: { id: 'CUST-0189', name: 'Julia Agrippina', email: 'julia@palatine.it', region: 'EMEA', postal: 'INVALID_ZIP' },
        rawPayload: '{"id": "CUST-0189", "name": "Julia Agrippina", "email": "julia@palatine.it", "region": "EMEA", "postal": "INVALID_ZIP"}',
        processedAt: new Date(Date.now() - 350000).toISOString()
      },
      {
        recordId: 'rec-103',
        lineNumber: 312,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'DUPLICATE_TAX_IDENTIFIER',
        errorMessage: 'Tax registration identifier is already bound to active enterprise entity',
        schemaTuple: { id: 'CUST-0312', name: 'Lucius Seneca', email: 'seneca@cordoba.es', region: 'EMEA', postal: '14001' },
        rawPayload: '{"id": "CUST-0312", "name": "Lucius Seneca", "email": "seneca@cordoba.es", "region": "EMEA", "postal": "14001"}',
        processedAt: new Date(Date.now() - 340000).toISOString()
      },
      {
        recordId: 'rec-109',
        lineNumber: 520,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_TAX_ID',
        errorMessage: 'Tax identification number failed mod-11 checksum validation',
        schemaTuple: { id: 'CUST-0520', name: 'Tiberius Gracchus', email: 'tiberius@rome.gov', region: 'EMEA', postal: '00185', taxId: 'XX-999-00' },
        rawPayload: '{"id": "CUST-0520", "name": "Tiberius Gracchus", "email": "tiberius@rome.gov", "region": "EMEA", "postal": "00185", "taxId": "XX-999-00"}',
        processedAt: new Date(Date.now() - 335000).toISOString()
      },
      {
        recordId: 'rec-110',
        lineNumber: 545,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'MISSING_MANDATORY_FIELD',
        errorMessage: 'Mandatory field "company_registration" is missing',
        schemaTuple: { id: 'CUST-0545', name: 'Gaius Marius', email: 'marius@consul.it', region: 'EMEA', postal: '00186', missingField: 'company_registration' },
        rawPayload: '{"id": "CUST-0545", "name": "Gaius Marius", "email": "marius@consul.it", "region": "EMEA", "postal": "00186"}',
        processedAt: new Date(Date.now() - 330000).toISOString()
      },
      {
        recordId: 'rec-111',
        lineNumber: 602,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'AMOUNT_EXCEEDS_LIMIT',
        errorMessage: 'Credit authorization limit exceeds tier maximum ($500,000)',
        schemaTuple: { id: 'CUST-0602', name: 'Crassus Wealth Management', email: 'crassus@wealth.it', region: 'EMEA', postal: '00187', creditLimit: '750000' },
        rawPayload: '{"id": "CUST-0602", "name": "Crassus Wealth Management", "email": "crassus@wealth.it", "region": "EMEA", "postal": "00187", "creditLimit": 750000}',
        processedAt: new Date(Date.now() - 325000).toISOString()
      },
      {
        recordId: 'rec-112',
        lineNumber: 680,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'MALFORMED_PHONE_NUMBER',
        errorMessage: 'Phone number does not match E.164 international standard',
        schemaTuple: { id: 'CUST-0680', name: 'Pompey Logistics', email: 'pompey@orient.gr', region: 'EMEA', postal: '10431', phone: '123-abc-phone' },
        rawPayload: '{"id": "CUST-0680", "name": "Pompey Logistics", "email": "pompey@orient.gr", "region": "EMEA", "postal": "10431", "phone": "123-abc-phone"}',
        processedAt: new Date(Date.now() - 320000).toISOString()
      },
      {
        recordId: 'rec-113',
        lineNumber: 715,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Email address contains illegal unicode whitespace characters',
        schemaTuple: { id: 'CUST-0715', name: 'Cornelia Scipio', email: 'cornelia @heritage.org', region: 'EMEA', postal: '00188' },
        rawPayload: '{"id": "CUST-0715", "name": "Cornelia Scipio", "email": "cornelia @heritage.org", "region": "EMEA", "postal": "00188"}',
        processedAt: new Date(Date.now() - 315000).toISOString()
      },
      {
        recordId: 'rec-114',
        lineNumber: 890,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'ZIP code length mismatch for jurisdiction US',
        schemaTuple: { id: 'CUST-0890', name: 'Cato Global Trading', email: 'cato@senate.gov', region: 'NA', postal: '9410' },
        rawPayload: '{"id": "CUST-0890", "name": "Cato Global Trading", "email": "cato@senate.gov", "region": "NA", "postal": "9410"}',
        processedAt: new Date(Date.now() - 310000).toISOString()
      },
      {
        recordId: 'rec-115',
        lineNumber: 1045,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'DUPLICATE_TAX_IDENTIFIER',
        errorMessage: 'Tax identifier already registered under another active account',
        schemaTuple: { id: 'CUST-1045', name: 'Scipio Africanus', email: 'scipio@zama.tn', region: 'EMEA', postal: '2036', taxId: 'TN-888-12' },
        rawPayload: '{"id": "CUST-1045", "name": "Scipio Africanus", "email": "scipio@zama.tn", "region": "EMEA", "postal": "2036", "taxId": "TN-888-12"}',
        processedAt: new Date(Date.now() - 305000).toISOString()
      },
      {
        recordId: 'rec-116',
        lineNumber: 1120,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'UNRESOLVED_CURRENCY_CODE',
        errorMessage: 'Currency code "USDT" is not recognized in ISO-4217',
        schemaTuple: { id: 'CUST-1120', name: 'Aeneas Maritime', email: 'aeneas@troy.org', region: 'EMEA', postal: '17010', currency: 'USDT' },
        rawPayload: '{"id": "CUST-1120", "name": "Aeneas Maritime", "email": "aeneas@troy.org", "region": "EMEA", "postal": "17010", "currency": "USDT"}',
        processedAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        recordId: 'rec-117',
        lineNumber: 1250,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'EXPIRED_TIMESTAMP',
        errorMessage: 'Transaction timestamp is older than permitted SLA (90 days)',
        schemaTuple: { id: 'CUST-1250', name: 'Brutus & Co', email: 'brutus@republic.org', region: 'EMEA', postal: '00189', txDate: '2023-01-01' },
        rawPayload: '{"id": "CUST-1250", "name": "Brutus & Co", "email": "brutus@republic.org", "region": "EMEA", "postal": "00189", "txDate": "2023-01-01"}',
        processedAt: new Date(Date.now() - 295000).toISOString()
      },
      {
        recordId: 'rec-118',
        lineNumber: 1310,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_COUNTRY_ISO',
        errorMessage: 'Country code "GBR" must be 2-letter ISO 3166-1 alpha-2',
        schemaTuple: { id: 'CUST-1310', name: 'Hadrian Holdings', email: 'hadrian@wall.co.uk', region: 'EMEA', postal: 'NE46', country: 'GBR' },
        rawPayload: '{"id": "CUST-1310", "name": "Hadrian Holdings", "email": "hadrian@wall.co.uk", "region": "EMEA", "postal": "NE46", "country": "GBR"}',
        processedAt: new Date(Date.now() - 290000).toISOString()
      },
      {
        recordId: 'rec-119',
        lineNumber: 1450,
        batchIndex: 2,
        batchId: 'job-cmo-001-batch-2',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'MISSING_MANDATORY_FIELD',
        errorMessage: 'Mandatory field "billing_contact" cannot be null',
        schemaTuple: { id: 'CUST-1450', name: 'Trajan Infrastructure', email: 'trajan@column.it', region: 'EMEA', postal: '00187', missingField: 'billing_contact' },
        rawPayload: '{"id": "CUST-1450", "name": "Trajan Infrastructure", "email": "trajan@column.it", "region": "EMEA", "postal": "00187"}',
        processedAt: new Date(Date.now() - 285000).toISOString()
      },
      {
        recordId: 'rec-120',
        lineNumber: 2050,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Top-level domain missing in email address',
        schemaTuple: { id: 'CUST-2050', name: 'Vespasian Media', email: 'vespasian@colosseum', region: 'EMEA', postal: '00184' },
        rawPayload: '{"id": "CUST-2050", "name": "Vespasian Media", "email": "vespasian@colosseum", "region": "EMEA", "postal": "00184"}',
        processedAt: new Date(Date.now() - 280000).toISOString()
      },
      {
        recordId: 'rec-121',
        lineNumber: 2110,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'BLOCKED_SANCTION_ENTITY',
        errorMessage: 'Entity name matches designated sanctions watch list',
        schemaTuple: { id: 'CUST-2110', name: 'Caligula Entertainment Corp', email: 'caligula@palace.it', region: 'EMEA', postal: '00186', sanctionStatus: 'FLAGGED' },
        rawPayload: '{"id": "CUST-2110", "name": "Caligula Entertainment Corp", "email": "caligula@palace.it", "region": "EMEA", "postal": "00186"}',
        processedAt: new Date(Date.now() - 275000).toISOString()
      },
      {
        recordId: 'rec-122',
        lineNumber: 2180,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'Postal code alphanumeric characters invalid for Germany',
        schemaTuple: { id: 'CUST-2180', name: 'Arminius Minerals GmbH', email: 'arminius@teutoburg.de', region: 'EMEA', postal: 'GER-999' },
        rawPayload: '{"id": "CUST-2180", "name": "Arminius Minerals GmbH", "email": "arminius@teutoburg.de", "region": "EMEA", "postal": "GER-999"}',
        processedAt: new Date(Date.now() - 270000).toISOString()
      },
      {
        recordId: 'rec-123',
        lineNumber: 2240,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'INVALID_TAX_ID',
        errorMessage: 'European VAT number prefix does not match country code',
        schemaTuple: { id: 'CUST-2240', name: 'Claudius Agrippa', email: 'claudius@lyon.fr', region: 'EMEA', postal: '69001', vatNumber: 'ES99887766' },
        rawPayload: '{"id": "CUST-2240", "name": "Claudius Agrippa", "email": "claudius@lyon.fr", "region": "EMEA", "postal": "69001"}',
        processedAt: new Date(Date.now() - 265000).toISOString()
      },
      {
        recordId: 'rec-124',
        lineNumber: 2315,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'MALFORMED_PHONE_NUMBER',
        errorMessage: 'Area code not recognized in North American Numbering Plan',
        schemaTuple: { id: 'CUST-2315', name: 'Agrippa Tech Labs', email: 'agrippa@pantheon.org', region: 'NA', postal: '94016', phone: '000-111-2222' },
        rawPayload: '{"id": "CUST-2315", "name": "Agrippa Tech Labs", "email": "agrippa@pantheon.org", "region": "NA", "postal": "94016", "phone": "000-111-2222"}',
        processedAt: new Date(Date.now() - 260000).toISOString()
      },
      {
        recordId: 'rec-125',
        lineNumber: 2490,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'validator',
        currentStepName: 'Dynamic Schema Validator',
        stepStatus: 'FAILED_AT_STEP',
        errorCode: 'DUPLICATE_RECORD_KEY',
        errorMessage: 'Natural key collision on customer_account_id',
        schemaTuple: { id: 'CUST-2490', name: 'Constantine Imperial', email: 'constantine@byzantium.org', region: 'EMEA', postal: '34122', accountKey: 'ACC-0042' },
        rawPayload: '{"id": "CUST-2490", "name": "Constantine Imperial", "email": "constantine@byzantium.org", "region": "EMEA", "postal": "34122"}',
        processedAt: new Date(Date.now() - 255000).toISOString()
      },
      {
        recordId: 'rec-104',
        lineNumber: 1,
        batchIndex: 0,
        batchId: 'job-cmo-001-batch-0',
        currentStepId: 'sink',
        currentStepName: 'Audit Report Sink',
        stepStatus: 'PASSED_STEP',
        schemaTuple: { id: 'CUST-0001', name: 'Acme Corporation', email: 'billing@acme.com', region: 'NA', postal: '94107' },
        rawPayload: '{"id": "CUST-0001", "name": "Acme Corporation", "email": "billing@acme.com", "region": "NA", "postal": "94107"}',
        processedAt: new Date(Date.now() - 370000).toISOString()
      },
      {
        recordId: 'rec-105',
        lineNumber: 2,
        batchIndex: 0,
        batchId: 'job-cmo-001-batch-0',
        currentStepId: 'sink',
        currentStepName: 'Audit Report Sink',
        stepStatus: 'PASSED_STEP',
        schemaTuple: { id: 'CUST-0002', name: 'Beta Logistics', email: 'dispatch@betalogistics.de', region: 'EMEA', postal: '10115' },
        rawPayload: '{"id": "CUST-0002", "name": "Beta Logistics", "email": "dispatch@betalogistics.de", "region": "EMEA", "postal": "10115"}',
        processedAt: new Date(Date.now() - 368000).toISOString()
      },
      {
        recordId: 'rec-106',
        lineNumber: 501,
        batchIndex: 1,
        batchId: 'job-cmo-001-batch-1',
        currentStepId: 'processor',
        currentStepName: 'Enrichment & Transformation',
        stepStatus: 'PASSED_STEP',
        schemaTuple: { id: 'CUST-0501', name: 'Gamma Retail GmbH', email: 'contact@gamma-retail.de', region: 'EMEA', postal: '80331' },
        rawPayload: '{"id": "CUST-0501", "name": "Gamma Retail GmbH", "email": "contact@gamma-retail.de", "region": "EMEA", "postal": "80331"}',
        processedAt: new Date(Date.now() - 355000).toISOString()
      },
      {
        recordId: 'rec-107',
        lineNumber: 2001,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'processor',
        currentStepName: 'Enrichment & Transformation',
        stepStatus: 'IN_FLIGHT',
        schemaTuple: { id: 'CUST-2001', name: 'Delta Technologies', email: 'ops@deltatech.sg', region: 'APAC', postal: '018989' },
        rawPayload: '{"id": "CUST-2001", "name": "Delta Technologies", "email": "ops@deltatech.sg", "region": "APAC", "postal": "018989"}',
        processedAt: new Date(Date.now() - 10000).toISOString()
      },
      {
        recordId: 'rec-108',
        lineNumber: 2002,
        batchIndex: 4,
        batchId: 'job-cmo-001-batch-4',
        currentStepId: 'sink',
        currentStepName: 'Audit Report Sink',
        stepStatus: 'IN_FLIGHT',
        schemaTuple: { id: 'CUST-2002', name: 'Epsilon Media Group', email: 'finance@epsilon.co.uk', region: 'EMEA', postal: 'EC1A 1BB' },
        rawPayload: '{"id": "CUST-2002", "name": "Epsilon Media Group", "email": "finance@epsilon.co.uk", "region": "EMEA", "postal": "EC1A 1BB"}',
        processedAt: new Date(Date.now() - 5000).toISOString()
      }
    ],
    errorRecords: [
      {
        recordId: 'rec-101',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-0',
        sequenceNumber: 42,
        stepName: 'val-customer-kyc',
        lineNumber: 42,
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Email field does not conform to RFC 5322 address pattern',
        rawPayload: '{"id": "CUST-0042", "name": "Marcus Aurelius", "email": "marcus.aurelius@rome", "region": "EMEA", "postal": "00184"}',
        schemaTuple: {
          id: 'CUST-0042',
          name: 'Marcus Aurelius',
          email: 'marcus.aurelius@rome',
          region: 'EMEA',
          postal: '00184'
        }
      },
      {
        recordId: 'rec-102',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 189,
        stepName: 'val-customer-kyc',
        lineNumber: 189,
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'Postal code format does not match country definition rules',
        rawPayload: '{"id": "CUST-0189", "name": "Julia Agrippina", "email": "julia@palatine.it", "region": "EMEA", "postal": "INVALID_ZIP"}',
        schemaTuple: {
          id: 'CUST-0189',
          name: 'Julia Agrippina',
          email: 'julia@palatine.it',
          region: 'EMEA',
          postal: 'INVALID_ZIP'
        }
      },
      {
        recordId: 'rec-103',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 312,
        stepName: 'val-customer-kyc',
        lineNumber: 312,
        errorCode: 'DUPLICATE_TAX_IDENTIFIER',
        errorMessage: 'Tax registration identifier is already bound to active enterprise entity',
        rawPayload: '{"id": "CUST-0312", "name": "Lucius Seneca", "email": "seneca@cordoba.es", "region": "EMEA", "postal": "14001"}',
        schemaTuple: {
          id: 'CUST-0312',
          name: 'Lucius Seneca',
          email: 'seneca@cordoba.es',
          region: 'EMEA',
          postal: '14001'
        }
      },
      {
        recordId: 'rec-109',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 520,
        stepName: 'val-customer-kyc',
        lineNumber: 520,
        errorCode: 'INVALID_TAX_ID',
        errorMessage: 'Tax identification number failed mod-11 checksum validation',
        rawPayload: '{"id": "CUST-0520", "name": "Tiberius Gracchus", "email": "tiberius@rome.gov", "region": "EMEA", "postal": "00185", "taxId": "XX-999-00"}',
        schemaTuple: {
          id: 'CUST-0520',
          name: 'Tiberius Gracchus',
          email: 'tiberius@rome.gov',
          region: 'EMEA',
          postal: '00185',
          taxId: 'XX-999-00'
        }
      },
      {
        recordId: 'rec-110',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 545,
        stepName: 'val-customer-kyc',
        lineNumber: 545,
        errorCode: 'MISSING_MANDATORY_FIELD',
        errorMessage: 'Mandatory field "company_registration" is missing',
        rawPayload: '{"id": "CUST-0545", "name": "Gaius Marius", "email": "marius@consul.it", "region": "EMEA", "postal": "00186"}',
        schemaTuple: {
          id: 'CUST-0545',
          name: 'Gaius Marius',
          email: 'marius@consul.it',
          region: 'EMEA',
          postal: '00186',
          missingField: 'company_registration'
        }
      },
      {
        recordId: 'rec-111',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 602,
        stepName: 'val-customer-kyc',
        lineNumber: 602,
        errorCode: 'AMOUNT_EXCEEDS_LIMIT',
        errorMessage: 'Credit authorization limit exceeds tier maximum ($500,000)',
        rawPayload: '{"id": "CUST-0602", "name": "Crassus Wealth Management", "email": "crassus@wealth.it", "region": "EMEA", "postal": "00187", "creditLimit": 750000}',
        schemaTuple: {
          id: 'CUST-0602',
          name: 'Crassus Wealth Management',
          email: 'crassus@wealth.it',
          region: 'EMEA',
          postal: '00187',
          creditLimit: '750000'
        }
      },
      {
        recordId: 'rec-112',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 680,
        stepName: 'val-customer-kyc',
        lineNumber: 680,
        errorCode: 'MALFORMED_PHONE_NUMBER',
        errorMessage: 'Phone number does not match E.164 international standard',
        rawPayload: '{"id": "CUST-0680", "name": "Pompey Logistics", "email": "pompey@orient.gr", "region": "EMEA", "postal": "10431", "phone": "123-abc-phone"}',
        schemaTuple: {
          id: 'CUST-0680',
          name: 'Pompey Logistics',
          email: 'pompey@orient.gr',
          region: 'EMEA',
          postal: '10431',
          phone: '123-abc-phone'
        }
      },
      {
        recordId: 'rec-113',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 715,
        stepName: 'val-customer-kyc',
        lineNumber: 715,
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Email address contains illegal unicode whitespace characters',
        rawPayload: '{"id": "CUST-0715", "name": "Cornelia Scipio", "email": "cornelia @heritage.org", "region": "EMEA", "postal": "00188"}',
        schemaTuple: {
          id: 'CUST-0715',
          name: 'Cornelia Scipio',
          email: 'cornelia @heritage.org',
          region: 'EMEA',
          postal: '00188'
        }
      },
      {
        recordId: 'rec-114',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-1',
        sequenceNumber: 890,
        stepName: 'val-customer-kyc',
        lineNumber: 890,
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'ZIP code length mismatch for jurisdiction US',
        rawPayload: '{"id": "CUST-0890", "name": "Cato Global Trading", "email": "cato@senate.gov", "region": "NA", "postal": "9410"}',
        schemaTuple: {
          id: 'CUST-0890',
          name: 'Cato Global Trading',
          email: 'cato@senate.gov',
          region: 'NA',
          postal: '9410'
        }
      },
      {
        recordId: 'rec-115',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 1045,
        stepName: 'val-customer-kyc',
        lineNumber: 1045,
        errorCode: 'DUPLICATE_TAX_IDENTIFIER',
        errorMessage: 'Tax identifier already registered under another active account',
        rawPayload: '{"id": "CUST-1045", "name": "Scipio Africanus", "email": "scipio@zama.tn", "region": "EMEA", "postal": "2036", "taxId": "TN-888-12"}',
        schemaTuple: {
          id: 'CUST-1045',
          name: 'Scipio Africanus',
          email: 'scipio@zama.tn',
          region: 'EMEA',
          postal: '2036',
          taxId: 'TN-888-12'
        }
      },
      {
        recordId: 'rec-116',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 1120,
        stepName: 'val-customer-kyc',
        lineNumber: 1120,
        errorCode: 'UNRESOLVED_CURRENCY_CODE',
        errorMessage: 'Currency code "USDT" is not recognized in ISO-4217',
        rawPayload: '{"id": "CUST-1120", "name": "Aeneas Maritime", "email": "aeneas@troy.org", "region": "EMEA", "postal": "17010", "currency": "USDT"}',
        schemaTuple: {
          id: 'CUST-1120',
          name: 'Aeneas Maritime',
          email: 'aeneas@troy.org',
          region: 'EMEA',
          postal: '17010',
          currency: 'USDT'
        }
      },
      {
        recordId: 'rec-117',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 1250,
        stepName: 'val-customer-kyc',
        lineNumber: 1250,
        errorCode: 'EXPIRED_TIMESTAMP',
        errorMessage: 'Transaction timestamp is older than permitted SLA (90 days)',
        rawPayload: '{"id": "CUST-1250", "name": "Brutus & Co", "email": "brutus@republic.org", "region": "EMEA", "postal": "00189", "txDate": "2023-01-01"}',
        schemaTuple: {
          id: 'CUST-1250',
          name: 'Brutus & Co',
          email: 'brutus@republic.org',
          region: 'EMEA',
          postal: '00189',
          txDate: '2023-01-01'
        }
      },
      {
        recordId: 'rec-118',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 1310,
        stepName: 'val-customer-kyc',
        lineNumber: 1310,
        errorCode: 'INVALID_COUNTRY_ISO',
        errorMessage: 'Country code "GBR" must be 2-letter ISO 3166-1 alpha-2',
        rawPayload: '{"id": "CUST-1310", "name": "Hadrian Holdings", "email": "hadrian@wall.co.uk", "region": "EMEA", "postal": "NE46", "country": "GBR"}',
        schemaTuple: {
          id: 'CUST-1310',
          name: 'Hadrian Holdings',
          email: 'hadrian@wall.co.uk',
          region: 'EMEA',
          postal: 'NE46',
          country: 'GBR'
        }
      },
      {
        recordId: 'rec-119',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-2',
        sequenceNumber: 1450,
        stepName: 'val-customer-kyc',
        lineNumber: 1450,
        errorCode: 'MISSING_MANDATORY_FIELD',
        errorMessage: 'Mandatory field "billing_contact" cannot be null',
        rawPayload: '{"id": "CUST-1450", "name": "Trajan Infrastructure", "email": "trajan@column.it", "region": "EMEA", "postal": "00187"}',
        schemaTuple: {
          id: 'CUST-1450',
          name: 'Trajan Infrastructure',
          email: 'trajan@column.it',
          region: 'EMEA',
          postal: '00187',
          missingField: 'billing_contact'
        }
      },
      {
        recordId: 'rec-120',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2050,
        stepName: 'val-customer-kyc',
        lineNumber: 2050,
        errorCode: 'INVALID_EMAIL_SYNTAX',
        errorMessage: 'Top-level domain missing in email address',
        rawPayload: '{"id": "CUST-2050", "name": "Vespasian Media", "email": "vespasian@colosseum", "region": "EMEA", "postal": "00184"}',
        schemaTuple: {
          id: 'CUST-2050',
          name: 'Vespasian Media',
          email: 'vespasian@colosseum',
          region: 'EMEA',
          postal: '00184'
        }
      },
      {
        recordId: 'rec-121',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2110,
        stepName: 'val-customer-kyc',
        lineNumber: 2110,
        errorCode: 'BLOCKED_SANCTION_ENTITY',
        errorMessage: 'Entity name matches designated sanctions watch list',
        rawPayload: '{"id": "CUST-2110", "name": "Caligula Entertainment Corp", "email": "caligula@palace.it", "region": "EMEA", "postal": "00186"}',
        schemaTuple: {
          id: 'CUST-2110',
          name: 'Caligula Entertainment Corp',
          email: 'caligula@palace.it',
          region: 'EMEA',
          postal: '00186',
          sanctionStatus: 'FLAGGED'
        }
      },
      {
        recordId: 'rec-122',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2180,
        stepName: 'val-customer-kyc',
        lineNumber: 2180,
        errorCode: 'POSTAL_CODE_MISMATCH',
        errorMessage: 'Postal code alphanumeric characters invalid for Germany',
        rawPayload: '{"id": "CUST-2180", "name": "Arminius Minerals GmbH", "email": "arminius@teutoburg.de", "region": "EMEA", "postal": "GER-999"}',
        schemaTuple: {
          id: 'CUST-2180',
          name: 'Arminius Minerals GmbH',
          email: 'arminius@teutoburg.de',
          region: 'EMEA',
          postal: 'GER-999'
        }
      },
      {
        recordId: 'rec-123',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2240,
        stepName: 'val-customer-kyc',
        lineNumber: 2240,
        errorCode: 'INVALID_TAX_ID',
        errorMessage: 'European VAT number prefix does not match country code',
        rawPayload: '{"id": "CUST-2240", "name": "Claudius Agrippa", "email": "claudius@lyon.fr", "region": "EMEA", "postal": "69001", "vatNumber": "ES99887766"}',
        schemaTuple: {
          id: 'CUST-2240',
          name: 'Claudius Agrippa',
          email: 'claudius@lyon.fr',
          region: 'EMEA',
          postal: '69001',
          vatNumber: 'ES99887766'
        }
      },
      {
        recordId: 'rec-124',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2315,
        stepName: 'val-customer-kyc',
        lineNumber: 2315,
        errorCode: 'MALFORMED_PHONE_NUMBER',
        errorMessage: 'Area code not recognized in North American Numbering Plan',
        rawPayload: '{"id": "CUST-2315", "name": "Agrippa Tech Labs", "email": "agrippa@pantheon.org", "region": "NA", "postal": "94016", "phone": "000-111-2222"}',
        schemaTuple: {
          id: 'CUST-2315',
          name: 'Agrippa Tech Labs',
          email: 'agrippa@pantheon.org',
          region: 'NA',
          postal: '94016',
          phone: '000-111-2222'
        }
      },
      {
        recordId: 'rec-125',
        jobId: 'job-cmo-001',
        batchId: 'job-cmo-001-batch-4',
        sequenceNumber: 2490,
        stepName: 'val-customer-kyc',
        lineNumber: 2490,
        errorCode: 'DUPLICATE_RECORD_KEY',
        errorMessage: 'Natural key collision on customer_account_id',
        rawPayload: '{"id": "CUST-2490", "name": "Constantine Imperial", "email": "constantine@byzantium.org", "region": "EMEA", "postal": "34122", "accountKey": "ACC-0042"}',
        schemaTuple: {
          id: 'CUST-2490',
          name: 'Constantine Imperial',
          email: 'constantine@byzantium.org',
          region: 'EMEA',
          postal: '34122',
          accountKey: 'ACC-0042'
        }
      }
    ],
    reportSummary: {
      jobId: 'job-cmo-001',
      fileName: 'customers_q4_enterprise.csv',
      processId: 'customer-master-onboarding',
      processName: 'Customer Master Onboarding',
      status: 'RUNNING',
      totalRecords: 10000,
      processedRecords: 6500,
      successfulRecords: 6480,
      failedRecords: 20,
      totalDurationMs: 4800,
      throughputRecordsPerSec: 1354.2,
      stageLatencies: [
        { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 285400, percentOfTotal: 16.6, status: 'SUCCESS' },
        { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 491200, percentOfTotal: 28.6, status: 'WARNING' },
        { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 760100, percentOfTotal: 44.3, status: 'SUCCESS' },
        { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 179800, percentOfTotal: 10.5, status: 'SUCCESS' }
      ],
      generatedAt: new Date().toISOString()
    }
  },
  'job-cmo-002': {
    jobId: 'job-cmo-002',
    metadata: {
      sizeBytes: 1820400,
      encoding: 'UTF-8',
      delimiter: ',',
      rowCount: 5000,
      checksum: 'a4f89d9123891048123984128938120489123048912389102489128309128301',
      loomThread: 'virtual-worker-102-loom-01'
    },
    stageLatencies: [
      { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 140000, percentOfTotal: 15.0, status: 'SUCCESS' },
      { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 260000, percentOfTotal: 28.0, status: 'SUCCESS' },
      { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 420000, percentOfTotal: 45.0, status: 'SUCCESS' },
      { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 110000, percentOfTotal: 12.0, status: 'SUCCESS' }
    ],
    batchChunks: [
      { chunkIndex: 0, recordCount: 500, durationMicros: 72000, partitionId: 'partition-p0', status: 'DONE' },
      { chunkIndex: 1, recordCount: 500, durationMicros: 76000, partitionId: 'partition-p1', status: 'DONE' }
    ],
    errorRecords: [
      {
        recordId: 'rec-201',
        jobId: 'job-cmo-002',
        batchId: 'job-cmo-002-batch-0',
        sequenceNumber: 15,
        stepName: 'val-customer-kyc',
        lineNumber: 15,
        errorCode: 'INVALID_DOMAIN',
        errorMessage: 'Email domain @tempmail.com rejected by corporate policy',
        rawPayload: '{"id": "CUST-0015", "name": "Nero Claudius", "email": "nero@tempmail.com"}',
        schemaTuple: { id: 'CUST-0015', name: 'Nero Claudius', email: 'nero@tempmail.com' }
      }
    ],
    reportSummary: {
      jobId: 'job-cmo-002',
      fileName: 'customers_emea_legacy.csv',
      processId: 'customer-master-onboarding',
      processName: 'Customer Master Onboarding',
      status: 'COMPLETED',
      totalRecords: 5000,
      processedRecords: 5000,
      successfulRecords: 4988,
      failedRecords: 12,
      totalDurationMs: 3200,
      throughputRecordsPerSec: 1562.5,
      stageLatencies: [
        { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 140000, percentOfTotal: 15.0, status: 'SUCCESS' },
        { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 260000, percentOfTotal: 28.0, status: 'SUCCESS' },
        { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 420000, percentOfTotal: 45.0, status: 'SUCCESS' },
        { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 110000, percentOfTotal: 12.0, status: 'SUCCESS' }
      ],
      generatedAt: new Date().toISOString()
    }
  }
};

// In-memory mutable state for mock fallbacks (to allow test & offline interactivity)
export let mockComponentsStore: ComponentInstance[] = [...MOCK_COMPONENTS];
export let mockRoutesStore: ProcessRoute[] = [...MOCK_ROUTES];
export let mockJobsStore: FileExecutionJob[] = [...MOCK_JOBS];
export const mockDiagnosticsStore: Record<string, FileDiagnosticsData> = { ...MOCK_DIAGNOSTICS_MAP };

// Ensure job-101 alias is pre-populated in memory store for instant 0ms access
if (mockDiagnosticsStore['job-cmo-001']) {
  const cmoBase = mockDiagnosticsStore['job-cmo-001'];
  mockDiagnosticsStore['job-101'] = {
    ...cmoBase,
    jobId: 'job-101',
    fileName: 'customers.csv',
    errorRecords: cmoBase.errorRecords.map(err => ({ ...err, jobId: 'job-101' })),
    recordsLineage: cmoBase.recordsLineage?.map(rec => ({
      ...rec,
      batchId: rec.batchId ? rec.batchId.replace('job-cmo-001', 'job-101') : 'job-101-batch-0'
    })),
    reportSummary: cmoBase.reportSummary ? {
      ...cmoBase.reportSummary,
      jobId: 'job-101',
      fileName: 'customers.csv'
    } : undefined
  };
}

// Pre-seed job-ofs-101 (Order Fulfillment Stream) with 14 errors for zero-latency instant rendering
mockDiagnosticsStore['job-ofs-101'] = {
  jobId: 'job-ofs-101',
  fileName: 'job-ofs-101.csv',
  processName: 'Order Fulfillment Stream',
  metadata: {
    sizeBytes: 12450800,
    encoding: 'UTF-8',
    delimiter: ',',
    rowCount: 24500,
    checksum: 'a8b7c6d5e4f3210987654321fedcba09876543210fedcba9876543210fedcba9',
    loomThread: 'virtual-worker-202-loom-08'
  },
  stageLatencies: [
    {
      stepId: 'splitter',
      stepName: 'Streaming CSV Splitter',
      durationMicros: 420000,
      percentOfTotal: 15.0,
      status: 'SUCCESS',
      inputRecords: 24500,
      successRecords: 24500,
      failedRecords: 0,
      inFlightRecords: 0,
      boundComponentId: 'DEFAULT_SPLITTER'
    },
    {
      stepId: 'validator',
      stepName: 'Dynamic Schema Validator',
      durationMicros: 810000,
      percentOfTotal: 28.9,
      status: 'WARNING',
      inputRecords: 24500,
      successRecords: 24486,
      failedRecords: 14,
      inFlightRecords: 0,
      boundComponentId: 'val-order-schema'
    },
    {
      stepId: 'processor',
      stepName: 'Enrichment & Transformation',
      durationMicros: 1180000,
      percentOfTotal: 42.1,
      status: 'SUCCESS',
      inputRecords: 24486,
      successRecords: 24486,
      failedRecords: 0,
      inFlightRecords: 0,
      boundComponentId: 'proc-order-tax'
    },
    {
      stepId: 'sink',
      stepName: 'Audit Report Sink',
      durationMicros: 390000,
      percentOfTotal: 13.9,
      status: 'SUCCESS',
      inputRecords: 24486,
      successRecords: 24486,
      failedRecords: 0,
      inFlightRecords: 0,
      boundComponentId: 'writer-audit-csv'
    }
  ],
  batchChunks: [
    { chunkIndex: 0, recordCount: 2450, durationMicros: 280000, partitionId: 'partition-p0', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-0' },
    { chunkIndex: 1, recordCount: 2450, durationMicros: 295000, partitionId: 'partition-p1', status: 'DONE', successfulCount: 2446, failedCount: 4, batchId: 'job-ofs-101-batch-1' },
    { chunkIndex: 2, recordCount: 2450, durationMicros: 275000, partitionId: 'partition-p0', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-2' },
    { chunkIndex: 3, recordCount: 2450, durationMicros: 310000, partitionId: 'partition-p1', status: 'DONE', successfulCount: 2444, failedCount: 6, batchId: 'job-ofs-101-batch-3' },
    { chunkIndex: 4, recordCount: 2450, durationMicros: 285000, partitionId: 'partition-p2', status: 'DONE', successfulCount: 2446, failedCount: 4, batchId: 'job-ofs-101-batch-4' },
    { chunkIndex: 5, recordCount: 2450, durationMicros: 290000, partitionId: 'partition-p0', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-5' },
    { chunkIndex: 6, recordCount: 2450, durationMicros: 278000, partitionId: 'partition-p1', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-6' },
    { chunkIndex: 7, recordCount: 2450, durationMicros: 282000, partitionId: 'partition-p2', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-7' },
    { chunkIndex: 8, recordCount: 2450, durationMicros: 291000, partitionId: 'partition-p0', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-8' },
    { chunkIndex: 9, recordCount: 2450, durationMicros: 289000, partitionId: 'partition-p1', status: 'DONE', successfulCount: 2450, failedCount: 0, batchId: 'job-ofs-101-batch-9' }
  ],
  errorRecords: [
    {
      recordId: 'rec-ofs-101',
      lineNumber: 1204,
      batchId: 'job-ofs-101-batch-1',
      errorCode: 'INVALID_SKU_FORMAT',
      errorMessage: 'SKU code does not match catalog regex standard pattern [A-Z]{3}-[0-9]{4}',
      schemaTuple: { orderId: 'ORD-9011', sku: 'INVALID_SKU_12', quantity: '2', amount: '124.50' },
      rawPayload: '{"order_id": "ORD-9011", "sku": "INVALID_SKU_12", "quantity": 2, "amount": 124.50, "currency": "USD"}'
    },
    {
      recordId: 'rec-ofs-102',
      lineNumber: 1582,
      batchId: 'job-ofs-101-batch-1',
      errorCode: 'NEGATIVE_QUANTITY',
      errorMessage: 'Order item quantity must be strictly greater than 0',
      schemaTuple: { orderId: 'ORD-9104', sku: 'WGT-4001', quantity: '-3', amount: '-45.00' },
      rawPayload: '{"order_id": "ORD-9104", "sku": "WGT-4001", "quantity": -3, "amount": -45.00, "currency": "USD"}'
    },
    {
      recordId: 'rec-ofs-103',
      lineNumber: 2011,
      batchId: 'job-ofs-101-batch-1',
      errorCode: 'UNSUPPORTED_CURRENCY',
      errorMessage: 'Currency "XYZ" is not recognized in ISO-4217 standard tables',
      schemaTuple: { orderId: 'ORD-9255', sku: 'PRD-1020', quantity: '1', currency: 'XYZ' },
      rawPayload: '{"order_id": "ORD-9255", "sku": "PRD-1020", "quantity": 1, "currency": "XYZ"}'
    },
    {
      recordId: 'rec-ofs-104',
      lineNumber: 2340,
      batchId: 'job-ofs-101-batch-1',
      errorCode: 'EXPIRED_PAYMENT_AUTH',
      errorMessage: 'Payment authorization token has exceeded 48-hour valid TTL window',
      schemaTuple: { orderId: 'ORD-9410', sku: 'PRD-8821', authCode: 'AUTH-EXPIRED-99' },
      rawPayload: '{"order_id": "ORD-9410", "sku": "PRD-8821", "auth_code": "AUTH-EXPIRED-99"}'
    },
    {
      recordId: 'rec-ofs-105',
      lineNumber: 5044,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'INVALID_POSTAL_CODE',
      errorMessage: 'Destination postal code is invalid for country United Kingdom',
      schemaTuple: { orderId: 'ORD-12001', country: 'GB', postalCode: '00000' },
      rawPayload: '{"order_id": "ORD-12001", "country": "GB", "postal_code": "00000"}'
    },
    {
      recordId: 'rec-ofs-106',
      lineNumber: 5410,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'DUPLICATE_ORDER_REFERENCE',
      errorMessage: 'Order reference ORD-12290 already exists in active fulfillment stream',
      schemaTuple: { orderId: 'ORD-12290', customerId: 'CUST-551' },
      rawPayload: '{"order_id": "ORD-12290", "customer_id": "CUST-551"}'
    },
    {
      recordId: 'rec-ofs-107',
      lineNumber: 5890,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'INSUFFICIENT_INVENTORY',
      errorMessage: 'Fulfillment warehouse location has zero unallocated stock for SKU EL-889',
      schemaTuple: { orderId: 'ORD-12500', sku: 'EL-889', warehouse: 'WH-CENTRAL' },
      rawPayload: '{"order_id": "ORD-12500", "sku": "EL-889", "warehouse": "WH-CENTRAL"}'
    },
    {
      recordId: 'rec-ofs-108',
      lineNumber: 6201,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'TAX_EXEMPTION_INVALID',
      errorMessage: 'Tax exemption certificate identifier is invalid or expired',
      schemaTuple: { orderId: 'ORD-12890', taxCert: 'CERT-NULL-9' },
      rawPayload: '{"order_id": "ORD-12890", "tax_cert": "CERT-NULL-9"}'
    },
    {
      recordId: 'rec-ofs-109',
      lineNumber: 6810,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'CARRIER_SERVICE_UNAVAILABLE',
      errorMessage: 'Carrier FedEx Priority Overnight unavailable for remote destination postal code',
      schemaTuple: { orderId: 'ORD-13100', carrier: 'FEDEX_PRIORITY', destination: 'AK-99701' },
      rawPayload: '{"order_id": "ORD-13100", "carrier": "FEDEX_PRIORITY", "destination": "AK-99701"}'
    },
    {
      recordId: 'rec-ofs-110',
      lineNumber: 7100,
      batchId: 'job-ofs-101-batch-3',
      errorCode: 'FRAUD_RISK_THRESHOLD_EXCEEDED',
      errorMessage: 'Risk score 94.2 exceeds maximum processing threshold 75.0',
      schemaTuple: { orderId: 'ORD-13450', riskScore: '94.2', action: 'BLOCK' },
      rawPayload: '{"order_id": "ORD-13450", "risk_score": 94.2, "action": "BLOCK"}'
    },
    {
      recordId: 'rec-ofs-111',
      lineNumber: 10110,
      batchId: 'job-ofs-101-batch-4',
      errorCode: 'MISSING_MANDATORY_FIELD',
      errorMessage: 'Mandatory field "shippingAddress.street" is null or empty',
      schemaTuple: { orderId: 'ORD-16200', missingField: 'street' },
      rawPayload: '{"order_id": "ORD-16200", "customer_id": "CUST-990"}'
    },
    {
      recordId: 'rec-ofs-112',
      lineNumber: 10550,
      batchId: 'job-ofs-101-batch-4',
      errorCode: 'WEIGHT_LIMIT_EXCEEDED',
      errorMessage: 'Total parcel gross weight 54.2 kg exceeds air freight maximum of 30.0 kg',
      schemaTuple: { orderId: 'ORD-16890', weightKg: '54.2', limitKg: '30.0' },
      rawPayload: '{"order_id": "ORD-16890", "weight_kg": 54.2, "limit_kg": 30.0}'
    },
    {
      recordId: 'rec-ofs-113',
      lineNumber: 11200,
      batchId: 'job-ofs-101-batch-4',
      errorCode: 'RESTRICTED_COMMODITY',
      errorMessage: 'Lithium battery commodity requires UN3481 hazardous declaration',
      schemaTuple: { orderId: 'ORD-17210', hazmatCode: 'UN3481' },
      rawPayload: '{"order_id": "ORD-17210", "hazmat_code": "UN3481"}'
    },
    {
      recordId: 'rec-ofs-114',
      lineNumber: 11980,
      batchId: 'job-ofs-101-batch-4',
      errorCode: 'PRICE_CALCULATION_MISMATCH',
      errorMessage: 'Line item sum 249.00 does not match gross order total 289.00',
      schemaTuple: { orderId: 'ORD-18000', lineSum: '249.00', orderTotal: '289.00' },
      rawPayload: '{"order_id": "ORD-18000", "line_sum": 249.00, "order_total": 289.00}'
    }
  ],
  recordsLineage: [
    {
      recordId: 'rec-ofs-101',
      lineNumber: 1204,
      batchIndex: 1,
      batchId: 'job-ofs-101-batch-1',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'INVALID_SKU_FORMAT',
      errorMessage: 'SKU code does not match catalog regex standard pattern [A-Z]{3}-[0-9]{4}',
      schemaTuple: { orderId: 'ORD-9011', sku: 'INVALID_SKU_12', quantity: '2', amount: '124.50' },
      rawPayload: '{"order_id": "ORD-9011", "sku": "INVALID_SKU_12", "quantity": 2, "amount": 124.50, "currency": "USD"}',
      processedAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      recordId: 'rec-ofs-102',
      lineNumber: 1582,
      batchIndex: 1,
      batchId: 'job-ofs-101-batch-1',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'NEGATIVE_QUANTITY',
      errorMessage: 'Order item quantity must be strictly greater than 0',
      schemaTuple: { orderId: 'ORD-9104', sku: 'WGT-4001', quantity: '-3', amount: '-45.00' },
      rawPayload: '{"order_id": "ORD-9104", "sku": "WGT-4001", "quantity": -3, "amount": -45.00, "currency": "USD"}',
      processedAt: new Date(Date.now() - 3500000).toISOString()
    },
    {
      recordId: 'rec-ofs-103',
      lineNumber: 2011,
      batchIndex: 1,
      batchId: 'job-ofs-101-batch-1',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'UNSUPPORTED_CURRENCY',
      errorMessage: 'Currency "XYZ" is not recognized in ISO-4217 standard tables',
      schemaTuple: { orderId: 'ORD-9255', sku: 'PRD-1020', quantity: '1', currency: 'XYZ' },
      rawPayload: '{"order_id": "ORD-9255", "sku": "PRD-1020", "quantity": 1, "currency": "XYZ"}',
      processedAt: new Date(Date.now() - 3400000).toISOString()
    },
    {
      recordId: 'rec-ofs-104',
      lineNumber: 2340,
      batchIndex: 1,
      batchId: 'job-ofs-101-batch-1',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'EXPIRED_PAYMENT_AUTH',
      errorMessage: 'Payment authorization token has exceeded 48-hour valid TTL window',
      schemaTuple: { orderId: 'ORD-9410', sku: 'PRD-8821', authCode: 'AUTH-EXPIRED-99' },
      rawPayload: '{"order_id": "ORD-9410", "sku": "PRD-8821", "auth_code": "AUTH-EXPIRED-99"}',
      processedAt: new Date(Date.now() - 3300000).toISOString()
    },
    {
      recordId: 'rec-ofs-105',
      lineNumber: 5044,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'INVALID_POSTAL_CODE',
      errorMessage: 'Destination postal code is invalid for country United Kingdom',
      schemaTuple: { orderId: 'ORD-12001', country: 'GB', postalCode: '00000' },
      rawPayload: '{"order_id": "ORD-12001", "country": "GB", "postal_code": "00000"}',
      processedAt: new Date(Date.now() - 3200000).toISOString()
    },
    {
      recordId: 'rec-ofs-106',
      lineNumber: 5410,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'DUPLICATE_ORDER_REFERENCE',
      errorMessage: 'Order reference ORD-12290 already exists in active fulfillment stream',
      schemaTuple: { orderId: 'ORD-12290', customerId: 'CUST-551' },
      rawPayload: '{"order_id": "ORD-12290", "customer_id": "CUST-551"}',
      processedAt: new Date(Date.now() - 3100000).toISOString()
    },
    {
      recordId: 'rec-ofs-107',
      lineNumber: 5890,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'INSUFFICIENT_INVENTORY',
      errorMessage: 'Fulfillment warehouse location has zero unallocated stock for SKU EL-889',
      schemaTuple: { orderId: 'ORD-12500', sku: 'EL-889', warehouse: 'WH-CENTRAL' },
      rawPayload: '{"order_id": "ORD-12500", "sku": "EL-889", "warehouse": "WH-CENTRAL"}',
      processedAt: new Date(Date.now() - 3000000).toISOString()
    },
    {
      recordId: 'rec-ofs-108',
      lineNumber: 6201,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'TAX_EXEMPTION_INVALID',
      errorMessage: 'Tax exemption certificate identifier is invalid or expired',
      schemaTuple: { orderId: 'ORD-12890', taxCert: 'CERT-NULL-9' },
      rawPayload: '{"order_id": "ORD-12890", "tax_cert": "CERT-NULL-9"}',
      processedAt: new Date(Date.now() - 2900000).toISOString()
    },
    {
      recordId: 'rec-ofs-109',
      lineNumber: 6810,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'CARRIER_SERVICE_UNAVAILABLE',
      errorMessage: 'Carrier FedEx Priority Overnight unavailable for remote destination postal code',
      schemaTuple: { orderId: 'ORD-13100', carrier: 'FEDEX_PRIORITY', destination: 'AK-99701' },
      rawPayload: '{"order_id": "ORD-13100", "carrier": "FEDEX_PRIORITY", "destination": "AK-99701"}',
      processedAt: new Date(Date.now() - 2800000).toISOString()
    },
    {
      recordId: 'rec-ofs-110',
      lineNumber: 7100,
      batchIndex: 3,
      batchId: 'job-ofs-101-batch-3',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'FRAUD_RISK_THRESHOLD_EXCEEDED',
      errorMessage: 'Risk score 94.2 exceeds maximum processing threshold 75.0',
      schemaTuple: { orderId: 'ORD-13450', riskScore: '94.2', action: 'BLOCK' },
      rawPayload: '{"order_id": "ORD-13450", "risk_score": 94.2, "action": "BLOCK"}',
      processedAt: new Date(Date.now() - 2700000).toISOString()
    },
    {
      recordId: 'rec-ofs-111',
      lineNumber: 10110,
      batchIndex: 4,
      batchId: 'job-ofs-101-batch-4',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'MISSING_MANDATORY_FIELD',
      errorMessage: 'Mandatory field "shippingAddress.street" is null or empty',
      schemaTuple: { orderId: 'ORD-16200', missingField: 'street' },
      rawPayload: '{"order_id": "ORD-16200", "customer_id": "CUST-990"}',
      processedAt: new Date(Date.now() - 2600000).toISOString()
    },
    {
      recordId: 'rec-ofs-112',
      lineNumber: 10550,
      batchIndex: 4,
      batchId: 'job-ofs-101-batch-4',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'WEIGHT_LIMIT_EXCEEDED',
      errorMessage: 'Total parcel gross weight 54.2 kg exceeds air freight maximum of 30.0 kg',
      schemaTuple: { orderId: 'ORD-16890', weightKg: '54.2', limitKg: '30.0' },
      rawPayload: '{"order_id": "ORD-16890", "weight_kg": 54.2, "limit_kg": 30.0}',
      processedAt: new Date(Date.now() - 2500000).toISOString()
    },
    {
      recordId: 'rec-ofs-113',
      lineNumber: 11200,
      batchIndex: 4,
      batchId: 'job-ofs-101-batch-4',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'RESTRICTED_COMMODITY',
      errorMessage: 'Lithium battery commodity requires UN3481 hazardous declaration',
      schemaTuple: { orderId: 'ORD-17210', hazmatCode: 'UN3481' },
      rawPayload: '{"order_id": "ORD-17210", "hazmat_code": "UN3481"}',
      processedAt: new Date(Date.now() - 2400000).toISOString()
    },
    {
      recordId: 'rec-ofs-114',
      lineNumber: 11980,
      batchIndex: 4,
      batchId: 'job-ofs-101-batch-4',
      currentStepId: 'validator',
      currentStepName: 'Dynamic Schema Validator',
      stepStatus: 'FAILED_AT_STEP',
      errorCode: 'PRICE_CALCULATION_MISMATCH',
      errorMessage: 'Line item sum 249.00 does not match gross order total 289.00',
      schemaTuple: { orderId: 'ORD-18000', lineSum: '249.00', orderTotal: '289.00' },
      rawPayload: '{"order_id": "ORD-18000", "line_sum": 249.00, "order_total": 289.00}',
      processedAt: new Date(Date.now() - 2300000).toISOString()
    },
    {
      recordId: 'rec-ofs-001',
      lineNumber: 1,
      batchIndex: 0,
      batchId: 'job-ofs-101-batch-0',
      currentStepId: 'sink',
      currentStepName: 'Audit Report Sink',
      stepStatus: 'PASSED_STEP',
      schemaTuple: { orderId: 'ORD-1001', sku: 'PRD-001', quantity: '1', amount: '45.00' },
      rawPayload: '{"order_id": "ORD-1001", "sku": "PRD-001", "quantity": 1, "amount": 45.00, "currency": "USD"}',
      processedAt: new Date(Date.now() - 4000000).toISOString()
    },
    {
      recordId: 'rec-ofs-002',
      lineNumber: 2,
      batchIndex: 0,
      batchId: 'job-ofs-101-batch-0',
      currentStepId: 'sink',
      currentStepName: 'Audit Report Sink',
      stepStatus: 'PASSED_STEP',
      schemaTuple: { orderId: 'ORD-1002', sku: 'PRD-002', quantity: '3', amount: '89.99' },
      rawPayload: '{"order_id": "ORD-1002", "sku": "PRD-002", "quantity": 3, "amount": 89.99, "currency": "USD"}',
      processedAt: new Date(Date.now() - 3950000).toISOString()
    }
  ]
};

// Pre-seed job-fin-201 (Financial Reconciliation) with 0 errors
mockDiagnosticsStore['job-fin-201'] = {
  jobId: 'job-fin-201',
  fileName: 'job-fin-201.csv',
  processName: 'Financial Reconciliation Pipeline',
  metadata: {
    sizeBytes: 25400000,
    encoding: 'UTF-8',
    delimiter: ',',
    rowCount: 50000,
    checksum: 'c2e8b4a19087563412abcdef0123456789abcdef0123456789abcdef01234567',
    loomThread: 'virtual-worker-303-loom-12'
  },
  stageLatencies: [
    { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 680000, percentOfTotal: 14.8, status: 'SUCCESS', inputRecords: 50000, successRecords: 50000, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'DEFAULT_SPLITTER' },
    { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 1420000, percentOfTotal: 30.9, status: 'SUCCESS', inputRecords: 50000, successRecords: 50000, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'val-fin-ledger' },
    { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 1950000, percentOfTotal: 42.4, status: 'SUCCESS', inputRecords: 50000, successRecords: 50000, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'proc-fin-reconcile' },
    { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 550000, percentOfTotal: 11.9, status: 'SUCCESS', inputRecords: 50000, successRecords: 50000, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'writer-audit-csv' }
  ],
  batchChunks: Array.from({ length: 10 }, (_, i) => ({
    chunkIndex: i,
    recordCount: 5000,
    durationMicros: 460000,
    partitionId: `partition-p${i % 4}`,
    status: 'DONE',
    successfulCount: 5000,
    failedCount: 0,
    batchId: `job-fin-201-batch-${i}`
  })),
  errorRecords: [],
  recordsLineage: [
    {
      recordId: 'rec-fin-001',
      lineNumber: 1,
      batchIndex: 0,
      batchId: 'job-fin-201-batch-0',
      currentStepId: 'sink',
      currentStepName: 'Audit Report Sink',
      stepStatus: 'PASSED_STEP',
      schemaTuple: { txnId: 'TXN-90001', ledgerAccount: '1010-CASH', amount: '15000.00', status: 'MATCHED' },
      rawPayload: '{"txn_id": "TXN-90001", "account": "1010-CASH", "amount": 15000.00, "status": "MATCHED"}',
      processedAt: new Date(Date.now() - 10000000).toISOString()
    }
  ]
};

/**
 * Synchronous immediate retrieval of job diagnostics from memory cache.
 * Guarantees zero latency on user clicks.
 */
export function getImmediateJobDiagnostics(jobId: string): FileDiagnosticsData | null {
  if (mockDiagnosticsStore[jobId]) {
    return mockDiagnosticsStore[jobId];
  }
  if (jobId === 'job-101' && mockDiagnosticsStore['job-cmo-001']) {
    return mockDiagnosticsStore['job-101'];
  }
  const job = mockJobsStore.find(j => j.id === jobId);
  if (job) {
    return {
      jobId,
      fileName: job.fileName,
      metadata: {
        sizeBytes: job.fileSizeBytes || 2048500,
        encoding: job.detectedEncoding || 'UTF-8',
        delimiter: job.detectedDelimiter || ',',
        rowCount: job.totalRecords || 5000,
        checksum: job.checksumSha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        loomThread: job.loomThreadAllocation || 'virtual-worker-101-loom-01'
      },
      stageLatencies: [
        { stepId: 'splitter', stepName: 'Streaming CSV Splitter', durationMicros: 142000, percentOfTotal: 15.0, status: 'SUCCESS', inputRecords: 5000, successRecords: 5000, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'DEFAULT_SPLITTER' },
        { stepId: 'validator', stepName: 'Dynamic Schema Validator', durationMicros: 290000, percentOfTotal: 30.0, status: 'WARNING', inputRecords: 5000, successRecords: 4999, failedRecords: 1, inFlightRecords: 0, boundComponentId: 'val-customer-kyc' },
        { stepId: 'processor', stepName: 'Enrichment & Transformation', durationMicros: 420000, percentOfTotal: 44.0, status: 'SUCCESS', inputRecords: 4999, successRecords: 4999, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'proc-tax-calc' },
        { stepId: 'sink', stepName: 'Audit Report Sink', durationMicros: 110000, percentOfTotal: 11.0, status: 'SUCCESS', inputRecords: 4999, successRecords: 4999, failedRecords: 0, inFlightRecords: 0, boundComponentId: 'writer-audit-csv' }
      ],
      batchChunks: [
        { chunkIndex: 0, recordCount: 2500, durationMicros: 340000, partitionId: 'partition-p0', status: 'DONE', successfulCount: 2500, failedCount: 0 },
        { chunkIndex: 1, recordCount: 2500, durationMicros: 380000, partitionId: 'partition-p1', status: 'DONE', successfulCount: 2499, failedCount: 1 }
      ],
      errorRecords: []
    };
  }
  return null;
}

/**
 * Resets in-memory mock store back to default fixtures (useful in tests).
 */
export function resetMockStore(): void {
  mockComponentsStore = [...MOCK_COMPONENTS];
  mockRoutesStore = [...MOCK_ROUTES];
  mockJobsStore = [...MOCK_JOBS];
}

export function getMockComponents(): ComponentInstance[] {
  return [...mockComponentsStore];
}

export function saveMockComponentStore(component: ComponentInstance): ComponentInstance {
  const index = mockComponentsStore.findIndex(c => c.instanceId === component.instanceId);
  if (index >= 0) {
    mockComponentsStore = [
      ...mockComponentsStore.slice(0, index),
      component,
      ...mockComponentsStore.slice(index + 1)
    ];
  } else {
    mockComponentsStore = [component, ...mockComponentsStore];
  }
  return component;
}

export function getMockRoutes(): ProcessRoute[] {
  return [...mockRoutesStore];
}

export function updateMockRouteStore(routeId: string, status: 'ACTIVE' | 'PAUSED', health: 'HEALTHY' | 'DEGRADED'): ProcessRoute {
  const index = mockRoutesStore.findIndex(r => r.id === routeId);
  if (index >= 0) {
    const existing = mockRoutesStore[index];
    const updated: ProcessRoute = {
      ...existing,
      status,
      health
    };
    mockRoutesStore = [
      ...mockRoutesStore.slice(0, index),
      updated,
      ...mockRoutesStore.slice(index + 1)
    ];
    return updated;
  }
  return {
    id: routeId,
    name: routeId,
    description: 'Dynamic Route',
    status,
    health,
    activeFilesInFlight: 0,
    aggregateThroughputRecordsPerSec: status === 'ACTIVE' ? 1000.0 : 0,
    successRatePercent: 100.0,
    pipelineSteps: DEFAULT_PIPELINE_STEPS
  };
}

export function getMockJobs(): FileExecutionJob[] {
  return [...mockJobsStore];
}

export function addMockJobsStore(newJobs: FileExecutionJob[]): void {
  mockJobsStore = [...newJobs, ...mockJobsStore];
}

export function updateMockJobStore(jobId: string, mutator: (job: FileExecutionJob) => Partial<FileExecutionJob>): FileExecutionJob | null {
  const index = mockJobsStore.findIndex(j => j.id === jobId);
  if (index >= 0) {
    const existing = mockJobsStore[index];
    const updated: FileExecutionJob = {
      ...existing,
      ...mutator(existing)
    };
    mockJobsStore = [
      ...mockJobsStore.slice(0, index),
      updated,
      ...mockJobsStore.slice(index + 1)
    ];
    return updated;
  }
  return null;
}

// ---------------------------------------------------------
// Mock Data Stores for Connectors & Route Topology
// ---------------------------------------------------------

export const MOCK_CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    definitionId: 'conn-def-csv',
    name: 'CSV Ingestion Node',
    category: 'SOURCE',
    streamRole: 'START',
    protocol: 'CSV',
    description: 'Streaming CSV source supporting Manual Upload, S3 Location, and SFTP with dynamic field definitions and type validation.',
    icon: 'file-spreadsheet',
    composite: false,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'sourceType', label: 'CSV Source Type', type: 'select', options: ['MANUAL_UPLOAD', 'S3_BUCKET', 'SFTP_SERVER', 'LOCAL_DIRECTORY'], defaultValue: 'MANUAL_UPLOAD', required: true },
        { key: 's3Uri', label: 'S3 Location URI', type: 'string', placeholder: 's3://my-enterprise-bucket/inbox/*.csv', required: false },
        { key: 'delimiter', label: 'Field Delimiter', type: 'select', options: [',', ';', '\t', '|'], defaultValue: ',', required: true },
        { key: 'hasHeader', label: 'Has Header Row', type: 'boolean', defaultValue: true, required: true },
        { key: 'quoteChar', label: 'Quote Character', type: 'string', defaultValue: '"', required: false },
        { key: 'charset', label: 'Encoding Charset', type: 'select', options: ['UTF-8', 'ISO-8859-1', 'US-ASCII'], defaultValue: 'UTF-8', required: true },
        { key: 'fields', label: 'CSV Schema Fields', type: 'fields_schema', required: true }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-rest-json',
    name: 'REST JSON Node (Sub-DAG)',
    category: 'PROCESSOR',
    streamRole: 'MIDDLE',
    protocol: 'REST_JSON',
    description: 'Composite HTTP REST client instantiating Sub-DAG with paired Request and Response nodes for record enrichment, payload generation, and JSONPath extraction.',
    icon: 'globe',
    composite: true,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'method', label: 'HTTP Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], defaultValue: 'POST', required: true },
        { key: 'endpointUrl', label: 'Endpoint URL', type: 'string', placeholder: 'https://api.internal.corp/v1/enrich/${id}', required: true },
        { key: 'authType', label: 'Authentication', type: 'select', options: ['NONE', 'BEARER_TOKEN', 'API_KEY_HEADER', 'BASIC_AUTH'], defaultValue: 'NONE', required: true },
        { key: 'headers', label: 'HTTP Headers', type: 'key_value', required: false },
        { key: 'bodyTemplate', label: 'Request Body Template', type: 'string', placeholder: '{"customerId": "${id}", "email": "${email}"}', required: false },
        { key: 'timeoutMs', label: 'Timeout (ms)', type: 'number', defaultValue: 5000, required: true },
        { key: 'responseExtractMap', label: 'JSONPath Field Extractions', type: 'key_value', required: false }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-soap-xml',
    name: 'SOAP XML Node (Sub-DAG)',
    category: 'PROCESSOR',
    streamRole: 'MIDDLE',
    protocol: 'SOAP_XML',
    description: 'Composite SOAP Web Service client instantiating Sub-DAG with XML Request Envelope generator and XML Response XPath extractor.',
    icon: 'code-2',
    composite: true,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'wsdlUrl', label: 'WSDL or Service URL', type: 'string', placeholder: 'https://legacy.corp/ws/CustomerService?wsdl', required: true },
        { key: 'soapAction', label: 'SOAPAction Header', type: 'string', placeholder: 'urn:ProcessCustomerRecord', required: false },
        { key: 'soapVersion', label: 'SOAP Protocol Version', type: 'select', options: ['1.1', '1.2'], defaultValue: '1.1', required: true },
        { key: 'envelopeTemplate', label: 'SOAP Request Envelope Template', type: 'string', placeholder: '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"><soapenv:Body><CustomerRequest id="${id}"/></soapenv:Body></soapenv:Envelope>', required: true },
        { key: 'xpathExtractMap', label: 'XPath Field Extractions', type: 'key_value', required: false }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-db-sink',
    name: 'Database JDBC Sink Node',
    category: 'SINK',
    streamRole: 'END',
    protocol: 'DATABASE',
    description: 'Relational database writer with batch inserts, upsert support, and connection pooling.',
    icon: 'database',
    composite: false,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'jdbcUrl', label: 'JDBC Connection URL', type: 'string', placeholder: 'jdbc:postgresql://postgres:5432/bulk_analytics', required: true },
        { key: 'targetTable', label: 'Target Table', type: 'string', placeholder: 'processed_records', required: true },
        { key: 'batchSize', label: 'Batch Insert Size', type: 'number', defaultValue: 1000, required: true },
        { key: 'upsertKey', label: 'Conflict / Upsert Key', type: 'string', required: false }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-retry-gateway',
    name: 'Retry & Delay Gateway',
    category: 'PROCESSOR',
    streamRole: 'MIDDLE',
    protocol: 'RETRY_GATEWAY',
    description: 'Resilience router implementing exponential backoff, jittered retries, and exhaustion routing to Dead Letter Queues (DLQ).',
    icon: 'refresh-cw',
    composite: false,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'maxRetries', label: 'Max Retry Attempts', type: 'number', defaultValue: 3, required: true },
        { key: 'initialDelayMs', label: 'Initial Delay (ms)', type: 'number', defaultValue: 1000, required: true },
        { key: 'backoffMultiplier', label: 'Backoff Multiplier', type: 'number', defaultValue: 2.0, required: true },
        { key: 'maxDelayMs', label: 'Max Delay Ceiling (ms)', type: 'number', defaultValue: 30000, required: true },
        { key: 'jitter', label: 'Add Randomized Jitter', type: 'boolean', defaultValue: true, required: false }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-composite-subflow',
    name: 'Composite Capsule (Sub-DAG Collection)',
    category: 'PROCESSOR',
    streamRole: 'MIDDLE',
    protocol: 'COMPOSITE_SUBFLOW',
    description: 'Encapsulated sub-DAG container bundling multi-step processing, branch decision routing, and embedded Janino code hooks with dual exit ports (out & completed).',
    icon: 'layers',
    composite: true,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'serviceName', label: 'Capsule Collection Name', type: 'string', defaultValue: 'REST Customer Enrichment Capsule', required: true }
      ]
    }),
    builtIn: true,
    version: 1
  },
  {
    definitionId: 'conn-def-terminal-sink',
    name: 'Terminal Completion Sink',
    category: 'SINK',
    streamRole: 'END',
    protocol: 'TERMINAL_SINK',
    description: 'Blank terminal completion sink that consumes incoming records, seals the file stream, and marks file execution as COMPLETED (100% progress) with zero external I/O.',
    icon: 'check-circle',
    composite: false,
    propertyManifest: JSON.stringify({
      properties: [
        { key: 'sealStream', label: 'Seal Stream', type: 'boolean', defaultValue: true, required: true },
        { key: 'markCompleted', label: 'Mark 100% Completed', type: 'boolean', defaultValue: true, required: true }
      ]
    }),
    builtIn: true,
    version: 1
  }
];

export const MOCK_CONNECTOR_INSTANCES: ConnectorInstance[] = [
  {
    instanceId: 'inst-csv-customer-source',
    definitionId: 'conn-def-csv',
    name: 'Customer Onboarding CSV Connector',
    description: 'Inbound customer batch CSV with KYC and contact fields',
    configuration: JSON.stringify({
      sourceType: 'MANUAL_UPLOAD',
      delimiter: ',',
      hasHeader: true,
      quoteChar: '"',
      charset: 'UTF-8',
      fields: [
        { id: 'f-1', name: 'customer_id', type: 'INTEGER', required: true },
        { id: 'f-2', name: 'full_name', type: 'STRING', required: true },
        { id: 'f-3', name: 'email', type: 'STRING', required: true },
        { id: 'f-4', name: 'balance', type: 'DECIMAL', required: false },
        { id: 'f-5', name: 'registered_date', type: 'DATE', required: false, format: 'yyyy-MM-dd' }
      ]
    }),
    version: 1,
    active: true,
    createdBy: 'admin'
  }
];

let mockConnectorDefsStore = [...MOCK_CONNECTOR_DEFINITIONS];
let mockConnectorInstancesStore = [...MOCK_CONNECTOR_INSTANCES];
let mockTopologiesStore: Record<string, RouteTopology> = {
  'customer-master-onboarding': {
    topologyId: 'top-customer-master-onboarding',
    routeId: 'customer-master-onboarding',
    nodes: [
      {
        id: 'node-csv-src',
        type: 'CONNECTOR',
        refId: 'conn-def-csv',
        label: 'CSV Ingestion Node',
        subLabel: 'Manual / S3 Source',
        category: 'SOURCE',
        streamRole: 'START',
        x: 80,
        y: 120,
        inputPorts: [],
        outputPorts: ['out_stream'],
        config: {
          sourceType: 'MANUAL_UPLOAD',
          delimiter: ',',
          hasHeader: true,
          fields: [
            { id: 'f1', name: 'customer_id', type: 'INTEGER', required: true },
            { id: 'f2', name: 'name', type: 'STRING', required: true },
            { id: 'f3', name: 'email', type: 'STRING', required: true },
            { id: 'f4', name: 'balance', type: 'DECIMAL', required: false }
          ]
        }
      },
      {
        id: 'node-split-comp',
        type: 'COMPONENT',
        refId: 'splitter-csv-univocity',
        label: 'Streaming CSV Splitter',
        subLabel: 'Univocity Parser',
        category: 'SPLITTER',
        streamRole: 'MIDDLE',
        x: 360,
        y: 120,
        inputPorts: ['in_stream'],
        outputPorts: ['out_records'],
        config: { chunkSize: 500 }
      },
      {
        id: 'node-rest-composite',
        type: 'CONNECTOR',
        refId: 'conn-def-composite-subflow',
        label: 'Customer Enrichment Capsule',
        subLabel: 'Composite Capsule (2 Steps: Req ➔ Res)',
        category: 'PROCESSOR',
        streamRole: 'MIDDLE',
        x: 680,
        y: 120,
        inputPorts: ['in_records'],
        outputPorts: ['pass', 'out', 'completed', 'fail'],
        branchingPorts: [
          {
            portId: 'out',
            label: 'PASS / Verified (Continue)',
            color: '#22c55e',
            conditionType: 'STATUS_CODE',
            conditionExpr: '200..299',
            actionType: 'CONTINUE'
          },
          {
            portId: 'completed',
            label: 'Early Complete (Blank Sink)',
            color: '#10b981',
            conditionType: 'EXPRESSION',
            conditionExpr: 'earlyTermination == true',
            actionType: 'CONTINUE'
          },
          {
            portId: 'fail',
            label: 'FAIL (Error / DLQ)',
            color: '#ef4444',
            conditionType: 'STATUS_CODE',
            conditionExpr: '400..599',
            actionType: 'FAIL_RECORD'
          }
        ],
        subFlow: {
          topologyId: 'subflow-node-rest-composite',
          routeId: 'node-rest-composite',
          nodes: [
            {
              id: 'sub-rest-req',
              type: 'CONNECTOR',
              refId: 'conn-def-rest-json',
              label: 'JSON Request Node',
              subLabel: 'POST /api/kyc/verify',
              category: 'PROCESSOR',
              streamRole: 'START',
              x: 120,
              y: 140,
              inputPorts: ['in_records'],
              outputPorts: ['out_http_req'],
              config: {
                method: 'POST',
                endpointUrl: 'https://api.internal.corp/v1/kyc/verify',
                authType: 'BEARER_TOKEN',
                headers: { 'Content-Type': 'application/json' },
                bodyTemplate: '{\n  "customerId": "${id}",\n  "email": "${email}"\n}',
                timeoutMs: 3000,
                customCode: '// Pre-Request Janino Hook\nMap<String, Object> output = new HashMap<>(input);\noutput.put("requestedAt", System.currentTimeMillis());\nreturn output;'
              }
            },
            {
              id: 'sub-rest-res',
              type: 'CONNECTOR',
              refId: 'conn-def-rest-json',
              label: 'JSON Response Node',
              subLabel: 'JSONPath Extractor',
              category: 'PROCESSOR',
              streamRole: 'MIDDLE',
              x: 480,
              y: 140,
              inputPorts: ['in_http_req'],
              outputPorts: ['pass', 'fail'],
              branchingPorts: [
                {
                  portId: 'pass',
                  label: 'PASS (2xx OK)',
                  color: '#22c55e',
                  conditionType: 'STATUS_CODE',
                  conditionExpr: '200..299',
                  actionType: 'CONTINUE'
                },
                {
                  portId: 'fail',
                  label: 'FAIL (Error / DLQ)',
                  color: '#ef4444',
                  conditionType: 'STATUS_CODE',
                  conditionExpr: '400..599',
                  actionType: 'FAIL_RECORD'
                }
              ],
              config: {
                expectedStatus: [200, 201],
                extractMappings: { 'kyc_status': '$.data.status', 'risk_score': '$.data.score' },
                customCode: '// Post-Response Janino Transformation\nMap<String, Object> output = new HashMap<>(input);\noutput.put("enrichmentStatus", "VERIFIED");\nreturn output;'
              }
            }
          ],
          edges: [
            { id: 'sub-edge-1', fromNodeId: 'sub-rest-req', fromPort: 'out_http_req', toNodeId: 'sub-rest-res', toPort: 'in_http_req' }
          ],
          version: 1
        },
        config: {
          isSubFlow: true,
          method: 'POST',
          endpointUrl: 'https://api.internal.corp/v1/kyc/verify',
          authType: 'BEARER_TOKEN'
        }
      },
      {
        id: 'node-val-comp',
        type: 'COMPONENT',
        refId: 'val-customer-kyc',
        label: 'Customer KYC Validator',
        subLabel: 'RFC 5322 Email Rule',
        category: 'VALIDATOR',
        streamRole: 'MIDDLE',
        x: 1040,
        y: 120,
        inputPorts: ['in_enriched'],
        outputPorts: ['out_validated'],
        config: { errorPolicy: 'QUARANTINE_RECORD' }
      },
      {
        id: 'node-sink-conn',
        type: 'CONNECTOR',
        refId: 'conn-def-db-sink',
        label: 'Database JDBC Sink',
        subLabel: 'Customer Analytics DB',
        category: 'SINK',
        streamRole: 'END',
        x: 1380,
        y: 120,
        inputPorts: ['in_validated'],
        outputPorts: [],
        config: { targetTable: 'customer_master', batchSize: 1000 }
      },
      {
        id: 'node-terminal-sink',
        type: 'CONNECTOR',
        refId: 'conn-def-terminal-sink',
        label: 'Terminal Completion Sink',
        subLabel: 'Blank End Node (Seals Stream)',
        category: 'SINK',
        streamRole: 'END',
        x: 1040,
        y: 260,
        inputPorts: ['in_stream'],
        outputPorts: [],
        config: { sealStream: true, markCompleted: true }
      }
    ],
    edges: [
      { id: 'edge-1', fromNodeId: 'node-csv-src', fromPort: 'out_stream', toNodeId: 'node-split-comp', toPort: 'in_stream' },
      { id: 'edge-2', fromNodeId: 'node-split-comp', fromPort: 'out_records', toNodeId: 'node-rest-composite', toPort: 'in_records' },
      { id: 'edge-3', fromNodeId: 'node-rest-composite', fromPort: 'pass', toNodeId: 'node-val-comp', toPort: 'in_enriched' },
      { id: 'edge-4', fromNodeId: 'node-val-comp', fromPort: 'out_validated', toNodeId: 'node-sink-conn', toPort: 'in_validated' },
      { id: 'edge-5', fromNodeId: 'node-rest-composite', fromPort: 'completed', toNodeId: 'node-terminal-sink', toPort: 'in_stream' }
    ],
    version: 1
  }
};

export function getMockConnectorDefinitions(): ConnectorDefinition[] {
  return [...mockConnectorDefsStore];
}

export function saveMockCustomConnectorDefinition(def: ConnectorDefinition): ConnectorDefinition {
  const index = mockConnectorDefsStore.findIndex(d => d.definitionId === def.definitionId);
  if (index >= 0) {
    mockConnectorDefsStore[index] = def;
  } else {
    mockConnectorDefsStore.push(def);
  }
  return def;
}

export function deleteMockCustomConnectorDefinition(definitionId: string): boolean {
  const initialLen = mockConnectorDefsStore.length;
  mockConnectorDefsStore = mockConnectorDefsStore.filter(d => d.definitionId !== definitionId || d.builtIn);
  return mockConnectorDefsStore.length < initialLen;
}

export function getMockConnectorInstances(): ConnectorInstance[] {
  return [...mockConnectorInstancesStore];
}

export function saveMockConnectorInstance(instance: ConnectorInstance): ConnectorInstance {
  const index = mockConnectorInstancesStore.findIndex(i => i.instanceId === instance.instanceId);
  if (index >= 0) {
    mockConnectorInstancesStore[index] = instance;
  } else {
    mockConnectorInstancesStore.push(instance);
  }
  return instance;
}

export function getMockRouteTopology(routeId: string): RouteTopology {
  if (mockTopologiesStore[routeId]) {
    return mockTopologiesStore[routeId];
  }
  // Synthesize default topology
  const defaultTop: RouteTopology = {
    topologyId: `top-${routeId}`,
    routeId,
    nodes: [
      {
        id: 'node-csv-src',
        type: 'CONNECTOR',
        refId: 'conn-def-csv',
        label: 'CSV Ingestion Node',
        subLabel: 'Source Stream',
        category: 'SOURCE',
        x: 80,
        y: 120,
        inputPorts: [],
        outputPorts: ['out_stream'],
        config: {
          sourceType: 'MANUAL_UPLOAD',
          delimiter: ',',
          hasHeader: true,
          fields: [
            { id: 'f1', name: 'id', type: 'INTEGER', required: true },
            { id: 'f2', name: 'data', type: 'STRING', required: true }
          ]
        }
      },
      {
        id: 'node-split-comp',
        type: 'COMPONENT',
        refId: 'splitter-csv-univocity',
        label: 'CSV Splitter Component',
        subLabel: 'Record Chunking',
        category: 'SPLITTER',
        x: 360,
        y: 120,
        inputPorts: ['in_stream'],
        outputPorts: ['out_records'],
        config: { chunkSize: 500 }
      },
      {
        id: 'node-sink-conn',
        type: 'CONNECTOR',
        refId: 'conn-def-db-sink',
        label: 'Database Sink Connector',
        subLabel: 'Target Store',
        category: 'SINK',
        x: 640,
        y: 120,
        inputPorts: ['in_records'],
        outputPorts: [],
        config: { targetTable: 'records_out', batchSize: 500 }
      }
    ],
    edges: [
      { id: 'e1', fromNodeId: 'node-csv-src', fromPort: 'out_stream', toNodeId: 'node-split-comp', toPort: 'in_stream' },
      { id: 'e2', fromNodeId: 'node-split-comp', fromPort: 'out_records', toNodeId: 'node-sink-conn', toPort: 'in_records' }
    ],
    version: 1
  };
  mockTopologiesStore[routeId] = defaultTop;
  return defaultTop;
}

export function saveMockRouteTopology(routeId: string, topology: RouteTopology): RouteTopology {
  mockTopologiesStore[routeId] = topology;
  return topology;
}

export function dryRunMockConnector(request: ConnectorDryRunRequest): ConnectorDryRunResult {
  const start = performance.now();
  const sample = (request.sampleInput || '').trim();
  const previewRecords: Record<string, unknown>[] = [];
  const logs: string[] = [`Initiated dry-run for protocol: ${request.protocol}`];

  if (request.protocol === 'CSV') {
    const lines = sample
      ? sample.split(/\r?\n/)
      : [
          'id,name,email,amount',
          '101,Acme Corporation,billing@acme.com,12500.50',
          '102,Global Logistics,ops@globallogistics.org,4520.00'
        ];
    const headers = lines[0].split(',');
    logs.push(`Parsed ${headers.length} headers: ${headers.join(', ')}`);
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const row: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] ? values[idx].trim() : '';
      });
      previewRecords.push(row);
    }
    logs.push(`Successfully extracted ${previewRecords.length} records.`);
  } else if (request.protocol === 'REST_JSON') {
    previewRecords.push({
      status: 'SUCCESS',
      httpCode: 200,
      enrichedAt: new Date().toISOString(),
      account_tier: 'GOLD',
      risk_score: 0.04
    });
    logs.push('REST mock endpoint responded 200 OK with JSON body.');
  } else if (request.protocol === 'SOAP_XML') {
    previewRecords.push({
      soap_status: 'CLEARED',
      auth_code: 'AUTH-' + Math.floor(Math.random() * 90000 + 10000),
      timestamp: new Date().toISOString()
    });
    logs.push('SOAP envelope evaluated and XPath extractor returned cleared transaction.');
  } else {
    previewRecords.push({ status: 'CUSTOM_EXECUTED', payload: request.configuration });
    logs.push('Custom connector logic executed successfully.');
  }

  const durationMicros = Math.round((performance.now() - start) * 1000);
  logs.push(`Execution completed in ${durationMicros} microseconds.`);

  if (request.customCode && request.customCode.trim()) {
    logs.push(`Executed custom script hook (${request.codeHookType || 'TRANSFORM'}) in mock sandbox.`);
    previewRecords.forEach(rec => {
      rec['custom_hook_applied'] = true;
    });
  }

  return {
    success: true,
    durationMicros,
    recordsExtracted: previewRecords.length,
    previewRecords,
    rawOutput: JSON.stringify(previewRecords, null, 2),
    logs
  };
}

export function validateMockScript(request: { script: string; hookType?: string }): ScriptValidationResult {
  const script = request.script || '';
  if (!script.trim()) {
    return { valid: true, compilationTimeMicros: 0 };
  }
  if (script.includes('System.exit') || script.includes('Runtime.getRuntime') || script.includes('ProcessBuilder')) {
    return {
      valid: false,
      errorMessage: 'Security Violation: Prohibited class or method detected in script sandbox.',
      errorLine: 1,
      compilationTimeMicros: 120
    };
  }
  return { valid: true, compilationTimeMicros: 450 };
}

export function parseMockJsonStructure(request: { input: string; isSchema?: boolean; targetMode?: 'REQUEST' | 'RESPONSE' }): SchemaParseResult {
  const mode = request.targetMode || 'REQUEST';
  try {
    const parsed = JSON.parse(request.input);
    const fieldTypes: Record<string, string> = {};
    const jsonPathMappings: Record<string, string> = {};
    const templateObj: Record<string, unknown> = {};

    function traverse(obj: Record<string, unknown>, prefix = '$') {
      for (const [k, v] of Object.entries(obj)) {
        const path = `${prefix}.${k}`;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          templateObj[k] = {};
          traverse(v as Record<string, unknown>, path);
        } else {
          fieldTypes[k] = typeof v === 'number' ? 'INTEGER' : typeof v === 'boolean' ? 'BOOLEAN' : 'STRING';
          jsonPathMappings[path] = k;
          templateObj[k] = `$${` + k + `}`;
        }
      }
    }

    traverse(parsed);

    return {
      success: true,
      mode,
      fieldTypes,
      generatedTemplate: JSON.stringify(templateObj, null, 2),
      jsonPathMappings,
      warnings: []
    };
  } catch (err: unknown) {
    return {
      success: false,
      mode,
      fieldTypes: {},
      generatedTemplate: '',
      jsonPathMappings: {},
      warnings: [(err as Error).message || 'Invalid JSON syntax']
    };
  }
}

export function validateMockWsdl(request: { wsdlSource: string; isUrl?: boolean }): WsdlValidationResult {
  const src = request.wsdlSource || '';
  if (!src.trim()) {
    return { valid: false, operations: [], errorMessage: 'WSDL source cannot be empty.' };
  }
  return {
    valid: true,
    serviceName: 'EnterpriseAccountService',
    targetNamespace: 'http://services.enterprise.corp/account',
    endpointUrl: 'https://soap.enterprise.corp/ws/AccountService',
    operations: [
      {
        name: 'GetAccountBalance',
        soapAction: 'http://services.enterprise.corp/account/GetAccountBalance',
        inputMessage: 'GetAccountBalanceRequest',
        outputMessage: 'GetAccountBalanceResponse',
        detectedParameters: ['accountId', 'currency']
      },
      {
        name: 'PostCustomerTransaction',
        soapAction: 'http://services.enterprise.corp/account/PostCustomerTransaction',
        inputMessage: 'PostCustomerTransactionRequest',
        outputMessage: 'PostCustomerTransactionResponse',
        detectedParameters: ['accountId', 'amount', 'referenceCode']
      }
    ]
  };
}

export function generateMockSoapEnvelope(request: { operationName: string; targetNamespace?: string; soapVersion?: '1.1' | '1.2'; parameters?: readonly string[] }): SoapEnvelopeGenerateResult {
  const op = request.operationName || 'ProcessRecord';
  const ns = request.targetNamespace || 'http://services.enterprise.corp/account';
  const ver = request.soapVersion || '1.1';
  const params = request.parameters || ['id', 'amount'];

  const lines = [
    ver === '1.2'
      ? `<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="${ns}">`
      : `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${ns}">`,
    '  <soapenv:Header/>',
    '  <soapenv:Body>',
    `    <ns:${op}>`
  ];

  params.forEach(p => {
    lines.push(`      <ns:${p}>$${` + p + `}</ns:${p}>`);
  });

  lines.push(`    </ns:${op}>`);
  lines.push('  </soapenv:Body>');
  lines.push('</soapenv:Envelope>');

  return {
    envelopeXml: lines.join('\n'),
    soapAction: `${ns}/${op}`,
    contentType: ver === '1.2' ? 'application/soap+xml; charset=utf-8' : 'text/xml; charset=utf-8'
  };
}

export function generateMockXPathMappings(request: { sampleXml: string }): XPathExtractResult {
  const xml = request.sampleXml || '';
  if (!xml.trim()) {
    return { success: false, xpathMappings: {}, detectedElements: [], errorMessage: 'Sample XML cannot be empty' };
  }
  return {
    success: true,
    xpathMappings: {
      '//Response/Status/text()': 'status',
      '//Response/AccountId/text()': 'account_id',
      '//Response/Balance/text()': 'balance'
    },
    detectedElements: ['Status', 'AccountId', 'Balance']
  };
}

export function runMockHousekeeping(routeId: string): import('../types/process').HousekeepingReport {
  return {
    routeId,
    retentionDays: 30,
    cutoffTimestamp: new Date(Date.now() - 30 * 86400000).toISOString(),
    purgedJobsCount: 4,
    purgedErrorsCount: 18,
    purgedBatchChunksCount: 8,
    purgedBytes: 312500,
    executedAt: new Date().toISOString()
  };
}

export function generateMockTraversalHistory(recordId: string, isFailed = false): import('../types/process').RecordTraversalStep[] {
  return [
    {
      nodeId: 'node-source-csv',
      nodeName: 'CSV Ingestion Node',
      timestamp: '2026-11-08T23:50:01.120Z',
      status: 'SUCCESS',
      stepDetails: 'Row parsed and validated against header schema'
    },
    {
      nodeId: 'node-rest-composite',
      nodeName: 'Customer Enrichment Capsule',
      timestamp: '2026-11-08T23:50:02.450Z',
      status: 'SUCCESS',
      stepDetails: 'HTTP POST 200 OK • Injected KYC attributes'
    },
    {
      nodeId: 'node-kyc-val',
      nodeName: 'KYC & Regulatory Validator',
      timestamp: '2026-11-08T23:50:03.010Z',
      status: isFailed ? 'FAILED' : 'SUCCESS',
      stepDetails: isFailed ? 'Validation fault: Tax ID mismatch with national registry' : 'KYC verified successfully'
    }
  ];
}

export function runMockRetryRecord(jobId: string, recordId: string, mode: 'FROM_FAILED_STEP' | 'FROM_START'): import('../types/process').RecordRetryResult {
  return {
    jobId,
    recordId,
    status: 'RETRY_QUEUED',
    mode,
    message: `Record ${recordId} queued for retry with mode: ${mode}`
  };
}

export function runMockRetryBatch(jobId: string, batchId: string, mode: 'FROM_FAILED_STEP' | 'FROM_START'): import('../types/process').RecordRetryResult {
  return {
    jobId,
    batchId,
    status: 'RETRY_QUEUED',
    mode,
    message: `Batch ${batchId} queued for retry with mode: ${mode}`
  };
}

export function runMockForceExecuteBarrier(jobId: string): { jobId: string; status: string; message: string } {
  return {
    jobId,
    status: 'BARRIER_RELEASED',
    message: `End node file completion barrier manually released for job: ${jobId}`
  };
}




