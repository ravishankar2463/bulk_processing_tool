/**
 * Enterprise Process Hierarchy and Execution Type Definitions
 * Adheres strictly to PROJECT.md § Interface Contracts.
 * All models are strictly typed with zero 'any' casts and support immutable state updates.
 */

export type RouteStatus = 'ACTIVE' | 'PAUSED' | 'DEGRADED';
export type RouteHealth = 'HEALTHY' | 'DEGRADED' | 'CRITICAL';

export type StepId = 'splitter' | 'validator' | 'processor' | 'sink';
export type ErrorPolicy = 'FAIL_FAST' | 'QUARANTINE_RECORD';

export interface FieldMapping {
  readonly source: string;
  readonly target: string;
  readonly transform?: string;
}

export interface PipelineStepConfig {
  readonly id: StepId;
  readonly name: string;
  readonly type: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly fieldMappings: ReadonlyArray<FieldMapping>;
  readonly errorPolicy: ErrorPolicy;
  readonly concurrency: number;
}

export interface ProcessRoute {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: RouteStatus;
  readonly health: RouteHealth;
  readonly activeFilesInFlight: number;
  readonly aggregateThroughputRecordsPerSec: number;
  readonly recordsThroughputSec?: number;
  readonly successRatePercent: number;
  readonly pipelineSteps: ReadonlyArray<PipelineStepConfig>;
  readonly retentionDays?: number;
}

export interface HousekeepingReport {
  readonly routeId: string;
  readonly retentionDays: number;
  readonly cutoffTimestamp: string;
  readonly purgedJobsCount: number;
  readonly purgedErrorsCount: number;
  readonly purgedBatchChunksCount: number;
  readonly purgedBytes: number;
  readonly executedAt: string;
}

/**
 * Safely extracts route throughput in records/sec without 'any' type casts.
 * Prefers aggregateThroughputRecordsPerSec, falling back to legacy recordsThroughputSec or 0.
 *
 * @param route The ProcessRoute instance or null/undefined
 * @returns Non-negative throughput in records per second
 */
export function getRouteThroughput(route?: ProcessRoute | null): number {
  if (!route) return 0;
  return route.aggregateThroughputRecordsPerSec ?? route.recordsThroughputSec ?? 0;
}


export type JobStage = 'INGESTING' | 'SPLITTING' | 'IN_FLIGHT' | 'SINKING' | 'DONE';
export type JobStatus = 'QUEUED' | 'RUNNING' | 'PAUSED' | 'FAILED' | 'COMPLETED';

export interface FileExecutionJob {
  readonly id: string;
  readonly processId: string;
  readonly fileName: string;
  readonly fileSizeBytes: number;
  readonly stage: JobStage;
  readonly status: JobStatus;
  readonly totalRecords: number;
  readonly processedRecords: number;
  readonly failedRecords: number;
  readonly submittedAt: string;
  readonly completedAt?: string;
  readonly checksumSha256: string;
  readonly detectedEncoding: string;
  readonly detectedDelimiter: string;
  readonly loomThreadAllocation: string;
}

export interface FileMetadata {
  readonly sizeBytes: number;
  readonly encoding: string;
  readonly delimiter: string;
  readonly rowCount: number;
  readonly checksum: string;
  readonly loomThread: string;
}

export type StageLatencyStatus = 'SUCCESS' | 'WARNING' | 'ERROR';

export interface StageLatency {
  readonly stepId: string;
  readonly stepName: string;
  readonly durationMicros: number;
  readonly percentOfTotal: number;
  readonly status: StageLatencyStatus;
  readonly inputRecords?: number;
  readonly successRecords?: number;
  readonly failedRecords?: number;
  readonly inFlightRecords?: number;
  readonly boundComponentId?: string;
}

export type BatchChunkStatus = 'DONE' | 'PROCESSING' | 'FAILED';

export interface BatchChunk {
  readonly chunkIndex: number;
  readonly recordCount: number;
  readonly durationMicros: number;
  readonly partitionId: string;
  readonly status: BatchChunkStatus;
  readonly successfulCount?: number;
  readonly failedCount?: number;
  readonly batchId?: string;
}

export type RecordStepStatus = 'PASSED_STEP' | 'FAILED_AT_STEP' | 'IN_FLIGHT';

export interface RecordTraversalStep {
  readonly nodeId: string;
  readonly nodeName: string;
  readonly timestamp: string;
  readonly status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  readonly stepDetails?: string;
}

export interface FileRecordItem {
  readonly recordId: string;
  readonly lineNumber: number;
  readonly batchIndex: number;
  readonly batchId: string;
  readonly currentStepId: StepId | string;
  readonly currentStepName: string;
  readonly stepStatus: RecordStepStatus;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly schemaTuple: Readonly<Record<string, string>>;
  readonly rawPayload: string;
  readonly processedAt?: string;
  readonly traversalHistory?: ReadonlyArray<RecordTraversalStep>;
}

export interface RecordErrorItem {
  readonly recordId: string;
  readonly jobId?: string;
  readonly batchId?: string;
  readonly sequenceNumber?: number;
  readonly stepName?: string;
  readonly lineNumber: number;
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly rawPayload: string;
  readonly schemaTuple: Readonly<Record<string, string>>;
  readonly traversalHistory?: ReadonlyArray<RecordTraversalStep>;
}

export interface ComponentInstance {
  readonly instanceId: string;
  readonly componentType: 'SPLITTER' | 'VALIDATOR' | 'BATCH_PROCESSOR' | 'REPORT_WRITER';
  readonly name: string;
  readonly description: string;
  readonly executionMode: 'CODE_SNIPPET' | 'DECLARATIVE_RULE' | 'COMPILED_BEAN';
  readonly language: 'JAVA' | 'GROOVY' | 'PYTHON';
  readonly sourceCode: string;
  readonly sampleTestPayload?: string;
  readonly version?: number;
  readonly boundProcessIds?: ReadonlyArray<string>;
}

export interface ExecutionReportSummary {
  readonly jobId: string;
  readonly fileName: string;
  readonly processId: string;
  readonly processName: string;
  readonly status: JobStatus;
  readonly totalRecords: number;
  readonly processedRecords: number;
  readonly successfulRecords: number;
  readonly failedRecords: number;
  readonly totalDurationMs: number;
  readonly throughputRecordsPerSec: number;
  readonly stageLatencies: ReadonlyArray<StageLatency>;
  readonly generatedAt: string;
}

export interface FileDiagnosticsData {
  readonly jobId: string;
  readonly fileName?: string;
  readonly processName?: string;
  readonly metadata: FileMetadata;
  readonly stageLatencies: ReadonlyArray<StageLatency>;
  readonly batchChunks: ReadonlyArray<BatchChunk>;
  readonly errorRecords: ReadonlyArray<RecordErrorItem>;
  readonly recordsLineage?: ReadonlyArray<FileRecordItem>;
  readonly reportSummary?: ExecutionReportSummary;
}

// ---------------------------------------------------------
// Dynamic Connectors and Route Topology Graph Model
// ---------------------------------------------------------

export type ConnectorCategory = 'SOURCE' | 'PROCESSOR' | 'SINK' | 'TRANSFORM' | 'CUSTOM';
export type ConnectorProtocol = 'CSV' | 'REST_JSON' | 'SOAP_XML' | 'DATABASE' | 'KAFKA' | 'RETRY_GATEWAY' | 'COMPOSITE_SUBFLOW' | 'TERMINAL_SINK' | 'CUSTOM';
export type StreamRole = 'START' | 'MIDDLE' | 'END';

export interface PropertyFieldManifest {
  readonly key: string;
  readonly label: string;
  readonly type: 'string' | 'number' | 'boolean' | 'select' | 'secret' | 'fields_schema' | 'key_value';
  readonly options?: ReadonlyArray<string>;
  readonly defaultValue?: unknown;
  readonly placeholder?: string;
  readonly required?: boolean;
}

export interface ConnectorDefinition {
  readonly definitionId: string;
  readonly name: string;
  readonly category: ConnectorCategory;
  readonly streamRole?: StreamRole; // START (source), MIDDLE (piped processor), END (terminal sink)
  readonly protocol: ConnectorProtocol;
  readonly description?: string;
  readonly icon?: string;
  readonly composite: boolean;
  readonly propertyManifest: string; // JSON Schema of PropertyFieldManifest[]
  readonly builtIn: boolean;
  readonly version: number;
}

export type CsvFieldDataType = 'STRING' | 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'DATE' | 'DATETIME' | 'UUID' | 'JSON';

export interface CsvFieldSchema {
  readonly id: string;
  readonly name: string;
  readonly type: CsvFieldDataType;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly format?: string; // e.g. yyyy-MM-dd
}

export interface CsvConnectorConfig {
  readonly sourceType: 'MANUAL_UPLOAD' | 'S3_BUCKET' | 'SFTP_SERVER' | 'LOCAL_DIRECTORY';
  readonly s3Uri?: string;
  readonly sftpHost?: string;
  readonly localPath?: string;
  readonly delimiter: string;
  readonly hasHeader: boolean;
  readonly quoteChar: string;
  readonly charset: string;
  readonly fields: ReadonlyArray<CsvFieldSchema>;
  readonly errorPolicy?: string;
}

export interface RestJsonReqConfig {
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly endpointUrl: string;
  readonly authType: 'NONE' | 'BEARER_TOKEN' | 'API_KEY_HEADER' | 'BASIC_AUTH';
  readonly authToken?: string;
  readonly apiKeyHeader?: string;
  readonly apiKeyValue?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly queryParams?: Readonly<Record<string, string>>;
  readonly bodyTemplate?: string;
  readonly timeoutMs: number;
}

export interface RestJsonResConfig {
  readonly expectedStatus: ReadonlyArray<number>;
  readonly extractMappings: Readonly<Record<string, string>>; // field -> JSONPath
  readonly errorFallback: 'QUARANTINE_RECORD' | 'FAIL_FAST' | 'IGNORE';
}

export interface SoapXmlReqConfig {
  readonly wsdlUrl: string;
  readonly soapAction?: string;
  readonly soapVersion: '1.1' | '1.2';
  readonly envelopeTemplate: string;
  readonly authType?: string;
  readonly timeoutMs?: number;
}

export interface SoapXmlResConfig {
  readonly xpathExtractMap: Readonly<Record<string, string>>; // field -> XPath
  readonly namespaces?: Readonly<Record<string, string>>;
  readonly faultStrategy?: string;
}

export interface ConnectorInstance {
  readonly instanceId: string;
  readonly definitionId: string;
  readonly name: string;
  readonly description?: string;
  readonly configuration: string; // JSON string of specific config
  readonly version: number;
  readonly active: boolean;
  readonly createdBy?: string;
}

export type BranchingPortConditionType = 'STATUS_CODE' | 'JSON_PATH' | 'SCRIPT' | 'EXPRESSION' | 'ALWAYS';
export type BranchingPortActionType = 'CONTINUE' | 'CHAIN_REQUEST' | 'RETRY' | 'FAIL_RECORD';

export interface BranchingPortConfig {
  readonly portId: string;
  readonly label: string;
  readonly color: string; // e.g. '#22c55e', '#ef4444', '#f59e0b', '#3b82f6'
  readonly conditionType: BranchingPortConditionType;
  readonly conditionExpr: string;
  readonly actionType: BranchingPortActionType;
  readonly targetRefId?: string;
}

export interface RetryGatewayConfig {
  readonly maxRetries: number;
  readonly initialDelayMs: number;
  readonly backoffMultiplier: number;
  readonly maxDelayMs: number;
  readonly jitter: boolean;
  readonly retryOnStatusCodes?: ReadonlyArray<number>;
  readonly retryOnErrorCodes?: ReadonlyArray<string>;
}

export type TopologyNodeType = 'COMPONENT' | 'CONNECTOR' | 'NODE';

export interface TopologyNode {
  readonly id: string;
  readonly type: TopologyNodeType;
  readonly refId: string; // reference to component_instance_id or connector_definition_id
  readonly label: string;
  readonly subLabel?: string;
  readonly category: string;
  readonly streamRole?: StreamRole; // START (source), MIDDLE (piped processor), END (terminal sink)
  readonly x: number;
  readonly y: number;
  readonly inputPorts: ReadonlyArray<string>;
  readonly outputPorts: ReadonlyArray<string>;
  readonly config: Readonly<Record<string, unknown>>;
  readonly branchingPorts?: ReadonlyArray<BranchingPortConfig>;
  readonly subFlow?: RouteTopology;
  readonly barrierMode?: 'STREAMING' | 'FILE_COMPLETION_BARRIER';
}

export type NodeCategory = 'SOURCE' | 'PROCESSOR' | 'VALIDATOR' | 'TRANSFORM' | 'SUB_DAG' | 'SINK' | 'CUSTOM';

export interface NodeDefinition extends ConnectorDefinition {
  readonly nodeCategory?: NodeCategory;
}

export type NodeInstance = ComponentInstance;

export interface RecordRetryRequest {
  readonly mode: 'FROM_FAILED_STEP' | 'FROM_START';
}

export interface RecordRetryResult {
  readonly jobId: string;
  readonly recordId?: string;
  readonly batchId?: string;
  readonly status: string;
  readonly mode: string;
  readonly message: string;
}

export interface TopologyEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly fromPort: string;
  readonly toNodeId: string;
  readonly toPort: string;
}

export interface RouteTopology {
  readonly topologyId: string;
  readonly routeId: string;
  readonly nodes: ReadonlyArray<TopologyNode>;
  readonly edges: ReadonlyArray<TopologyEdge>;
  readonly version: number;
}

export interface ConnectorDryRunRequest {
  readonly protocol: string;
  readonly configuration: string;
  readonly sampleInput?: string;
  readonly parameters?: Record<string, unknown>;
  readonly customCode?: string;
  readonly codeHookType?: string;
}

export interface ConnectorDryRunResult {
  readonly success: boolean;
  readonly durationMicros: number;
  readonly recordsExtracted: number;
  readonly previewRecords: ReadonlyArray<Record<string, unknown>>;
  readonly rawOutput: string;
  readonly errorMessage?: string;
  readonly logs: ReadonlyArray<string>;
  readonly activeBranchPort?: string;
  readonly enrichedRecord?: Record<string, unknown>;
}

export interface ScriptValidationRequest {
  readonly script: string;
  readonly hookType?: string;
}

export interface ScriptValidationResult {
  readonly valid: boolean;
  readonly errorMessage?: string;
  readonly errorLine?: number;
  readonly compilationTimeMicros: number;
}

export interface SchemaParseRequest {
  readonly input: string;
  readonly isSchema?: boolean;
  readonly targetMode?: 'REQUEST' | 'RESPONSE';
}

export interface SchemaParseResult {
  readonly success: boolean;
  readonly mode: 'REQUEST' | 'RESPONSE';
  readonly fieldTypes: Readonly<Record<string, string>>;
  readonly generatedTemplate: string;
  readonly jsonPathMappings: Readonly<Record<string, string>>;
  readonly warnings: ReadonlyArray<string>;
}

export interface WsdlOperationMeta {
  readonly name: string;
  readonly soapAction: string;
  readonly inputMessage: string;
  readonly outputMessage: string;
  readonly detectedParameters: ReadonlyArray<string>;
}

export interface WsdlValidationRequest {
  readonly wsdlSource: string;
  readonly isUrl?: boolean;
}

export interface WsdlValidationResult {
  readonly valid: boolean;
  readonly serviceName?: string;
  readonly targetNamespace?: string;
  readonly endpointUrl?: string;
  readonly operations: ReadonlyArray<WsdlOperationMeta>;
  readonly errorMessage?: string;
}

export interface SoapEnvelopeGenerateRequest {
  readonly operationName: string;
  readonly targetNamespace?: string;
  readonly soapVersion?: '1.1' | '1.2';
  readonly parameters?: ReadonlyArray<string>;
}

export interface SoapEnvelopeGenerateResult {
  readonly envelopeXml: string;
  readonly soapAction: string;
  readonly contentType: string;
}

export interface XPathExtractRequest {
  readonly sampleXml: string;
}

export interface XPathExtractResult {
  readonly success: boolean;
  readonly xpathMappings: Readonly<Record<string, string>>;
  readonly detectedElements: ReadonlyArray<string>;
  readonly errorMessage?: string;
}



