package com.bulkprocessor.service;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.ProcessStep;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.StepExecutionException;
import com.bulkprocessor.core.api.StepResult;
import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.core.pipeline.PipelineRecordResult;
import com.bulkprocessor.core.pipeline.ProcessPipeline;
import com.bulkprocessor.dynamic.compiler.DynamicScriptCompiler;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.entity.ProcessDefinitionEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.ComponentInstanceRepository;
import com.bulkprocessor.storage.repository.ProcessDefinitionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Worker service executing asynchronous batch processing pipelines on Java 21
 * Project Loom virtual threads.
 */
@Service
public class BulkProcessingWorkerService {

    private static final Logger log = LoggerFactory.getLogger(BulkProcessingWorkerService.class);

    private final BulkJobRepository bulkJobRepository;
    private final BulkRecordErrorRepository bulkRecordErrorRepository;
    private final ProcessDefinitionRepository processDefinitionRepository;
    private final ComponentInstanceRepository componentInstanceRepository;
    private final DynamicScriptCompiler scriptCompiler;
    private final BulkReportService bulkReportService;

    public BulkProcessingWorkerService(
            BulkJobRepository bulkJobRepository,
            BulkRecordErrorRepository bulkRecordErrorRepository,
            ProcessDefinitionRepository processDefinitionRepository,
            ComponentInstanceRepository componentInstanceRepository,
            DynamicScriptCompiler scriptCompiler,
            BulkReportService bulkReportService) {
        this.bulkJobRepository = bulkJobRepository;
        this.bulkRecordErrorRepository = bulkRecordErrorRepository;
        this.processDefinitionRepository = processDefinitionRepository;
        this.componentInstanceRepository = componentInstanceRepository;
        this.scriptCompiler = scriptCompiler;
        this.bulkReportService = bulkReportService;
    }

    /**
     * Executes an incoming batch through dynamic validator and processor pipeline steps.
     */
    @Transactional
    public void processBatch(FileBatch<Map<String, Object>> batch) throws Exception {
        log.info("Processing batch {} for job {} (records={})", batch.batchId(), batch.jobId(), batch.records().size());

        BulkJobEntity job = bulkJobRepository.findById(batch.jobId())
            .orElseThrow(() -> new IllegalArgumentException("Job not found: " + batch.jobId()));

        Optional<ProcessDefinitionEntity> procDefOpt = job.getProcessId() != null
            ? processDefinitionRepository.findById(job.getProcessId())
            : Optional.empty();

        // Resolve validator script from central script compiler cache
        List<ComponentInstanceEntity> validators = componentInstanceRepository.findByComponentTypeAndIsActiveTrue("VALIDATOR");
        DynamicValidatorScript compiledValidator = null;

        if (!validators.isEmpty()) {
            ComponentInstanceEntity valEntity = validators.get(0);
            if (valEntity.getSourceCode() != null && !valEntity.getSourceCode().isBlank()) {
                compiledValidator = scriptCompiler.getCachedValidator(valEntity.getInstanceId());
                if (compiledValidator == null) {
                    try {
                        compiledValidator = scriptCompiler.compileValidator(valEntity.getInstanceId(), valEntity.getSourceCode());
                    } catch (Exception e) {
                        log.warn("Failed to compile dynamic validator {}: {}", valEntity.getInstanceId(), e.getMessage());
                    }
                }
            }
        }

        // Build ProcessPipeline
        List<ProcessStep<?, ?>> steps = new ArrayList<>();

        if (compiledValidator != null) {
            final DynamicValidatorScript finalVal = compiledValidator;
            steps.add(new ProcessStep<Map<String, Object>, Map<String, Object>>() {
                @Override
                public String getStepName() {
                    return "DYNAMIC_VALIDATOR";
                }

                @Override
                public int getOrder() {
                    return 100;
                }

                @Override
                public StepResult<Map<String, Object>> execute(RecordItem<Map<String, Object>> record, JobContext context) throws StepExecutionException {
                    DynamicValidatorScript.ValidationResult valResult = finalVal.validate(record.payload(), context);
                    if (!valResult.isValid()) {
                        String errCode = valResult.errorCode() != null ? valResult.errorCode() : "VALIDATION_FAILED";
                        String errMsg = valResult.errorMessage() != null ? valResult.errorMessage() : "Record validation failed";
                        return StepResult.failedRetryable(errCode + ": " + errMsg);
                    }
                    return StepResult.success(record.payload());
                }
            });
        }

        ProcessPipeline pipeline = new ProcessPipeline("pipeline-" + batch.jobId(), steps);
        JobContext context = new JobContext(
            batch.jobId(),
            batch.batchId(),
            job.getFileName() != null ? job.getFileName() : "unknown.csv",
            job.getSourceUri() != null ? job.getSourceUri() : "upload://",
            job.getProcessId(),
            Map.of(),
            Instant.now().toEpochMilli()
        );

        long successCount = 0;
        long failedCount = 0;
        List<BulkRecordErrorEntity> batchErrors = new ArrayList<>();

        for (RecordItem<Map<String, Object>> record : batch.records()) {
            PipelineRecordResult<Object> result = pipeline.processRecord(record, context);

            if (result.isSuccess()) {
                successCount++;
            } else {
                failedCount++;
                BulkRecordErrorEntity errorEntity = new BulkRecordErrorEntity();
                errorEntity.setJobId(batch.jobId());
                errorEntity.setBatchId(batch.batchId());
                errorEntity.setSequenceNumber(record.sequenceNumber());
                errorEntity.setStepName(result.failedStepName());
                String errMessage = result.errorMessage();
                String errCode = "EXECUTION_ERROR";
                if (errMessage != null && errMessage.contains(": ")) {
                    String[] parts = errMessage.split(": ", 2);
                    errCode = parts[0];
                    errMessage = parts[1];
                }
                errorEntity.setErrorCode(errCode);
                errorEntity.setErrorMessage(errMessage);
                errorEntity.setRawPayload(record.payload() != null ? record.payload().toString() : "");
                errorEntity.setCreatedAt(Instant.now());

                batchErrors.add(errorEntity);
            }
        }

        if (!batchErrors.isEmpty()) {
            bulkRecordErrorRepository.saveAll(batchErrors);
        }

        // Update Job metrics
        long prevProcessed = job.getProcessedRecords() != null ? job.getProcessedRecords() : 0L;
        long prevSuccess = job.getSuccessfulRecords() != null ? job.getSuccessfulRecords() : 0L;
        long prevFailed = job.getFailedRecords() != null ? job.getFailedRecords() : 0L;

        job.setProcessedRecords(prevProcessed + batch.records().size());
        job.setSuccessfulRecords(prevSuccess + successCount);
        job.setFailedRecords(prevFailed + failedCount);

        if (batch.isLastBatch()) {
            job.setStatus("COMPLETED");
            job.setEndTime(Instant.now());
            log.info("Job {} completed successfully! (Total processed={})", job.getJobId(), job.getProcessedRecords());
        }

        bulkJobRepository.save(job);
    }
}
