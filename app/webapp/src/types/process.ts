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

