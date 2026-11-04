package com.bulkprocessor.core.pipeline;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.ProcessStep;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.StepExecutionException;
import com.bulkprocessor.core.api.StepResult;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/**
 * Sequential execution pipeline composed of ordered ProcessSteps.
 */
public class ProcessPipeline {

    private final String pipelineId;
    private final List<ProcessStep<Object, Object>> steps;

    @SuppressWarnings("unchecked")
    public ProcessPipeline(String pipelineId, List<? extends ProcessStep<?, ?>> steps) {
        this.pipelineId = Objects.requireNonNull(pipelineId, "pipelineId must not be null");
        Objects.requireNonNull(steps, "steps must not be null");
        this.steps = steps.stream()
            .map(s -> (ProcessStep<Object, Object>) s)
            .sorted(Comparator.comparingInt(ProcessStep::getOrder))
            .toList();
    }

    public String getPipelineId() {
        return pipelineId;
    }

    public List<ProcessStep<Object, Object>> getSteps() {
        return steps;
    }

    /**
     * Executes the pipeline on a record with CONTINUE_ON_ERROR behavior.
     */
    @SuppressWarnings("unchecked")
    public <T> PipelineRecordResult<T> processRecord(RecordItem<?> initialRecord, JobContext context) {
        Object currentPayload = initialRecord.payload();
        RecordItem<Object> currentRecord = (RecordItem<Object>) initialRecord;

        for (ProcessStep<Object, Object> step : steps) {
            if (!step.shouldExecute(currentRecord, context)) {
                continue;
            }

            try {
                StepResult<Object> result = step.execute(currentRecord, context);
                if (result.status() == StepResult.Status.FAILED_RETRYABLE || result.status() == StepResult.Status.FAILED_FATAL) {
                    return PipelineRecordResult.failure(step.getStepName(), result.errorMessage(), result.errorCause());
                } else if (result.status() == StepResult.Status.SUCCESS) {
                    currentPayload = result.outputPayload();
                    currentRecord = new RecordItem<>(
                        currentRecord.recordId(),
                        currentRecord.sequenceNumber(),
                        currentRecord.batchIndex(),
                        currentPayload,
                        currentRecord.metadata()
                    );
                }
            } catch (StepExecutionException e) {
                return PipelineRecordResult.failure(e.getStepName(), e.getMessage(), e.getCause());
            } catch (Exception e) {
                return PipelineRecordResult.failure(step.getStepName(), e.getMessage(), e);
            }
        }

        return PipelineRecordResult.success((T) currentPayload);
    }

    /**
     * Executes the pipeline on a record, throwing StepExecutionException immediately if a fatal error occurs.
     */
    @SuppressWarnings("unchecked")
    public <T> PipelineRecordResult<T> processRecordWithFailFast(RecordItem<?> initialRecord, JobContext context) {
        Object currentPayload = initialRecord.payload();
        RecordItem<Object> currentRecord = (RecordItem<Object>) initialRecord;

        for (ProcessStep<Object, Object> step : steps) {
            if (!step.shouldExecute(currentRecord, context)) {
                continue;
            }

            StepResult<Object> result = step.execute(currentRecord, context);
            if (result.status() == StepResult.Status.FAILED_FATAL) {
                throw new StepExecutionException(step.getStepName(), result.errorMessage(), result.errorCause());
            } else if (result.status() == StepResult.Status.FAILED_RETRYABLE) {
                return PipelineRecordResult.failure(step.getStepName(), result.errorMessage(), result.errorCause());
            } else if (result.status() == StepResult.Status.SUCCESS) {
                currentPayload = result.outputPayload();
                currentRecord = new RecordItem<>(
                    currentRecord.recordId(),
                    currentRecord.sequenceNumber(),
                    currentRecord.batchIndex(),
                    currentPayload,
                    currentRecord.metadata()
                );
            }
        }

        return PipelineRecordResult.success((T) currentPayload);
    }
}

