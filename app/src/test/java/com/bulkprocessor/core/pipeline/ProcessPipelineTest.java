package com.bulkprocessor.core.pipeline;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.ProcessStep;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.StepExecutionException;
import com.bulkprocessor.core.api.StepResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("Process Step Pipeline Unit Tests")
class ProcessPipelineTest {

    @Test
    @DisplayName("Executes records sequentially across a configured step chain")
    void shouldExecuteChainOfStepsSequentially() {
        ProcessStep<Map<String, Object>, Map<String, Object>> step1 = new ProcessStep<>() {
            @Override
            public String getStepName() { return "AddPrefix"; }
            @Override
            public int getOrder() { return 1; }
            @Override
            public StepResult<Map<String, Object>> execute(RecordItem<Map<String, Object>> record, JobContext context) {
                String original = (String) record.payload().get("value");
                return StepResult.success(Map.of("value", "PRE_" + original));
            }
        };

        ProcessStep<Map<String, Object>, Map<String, Object>> step2 = new ProcessStep<>() {
            @Override
            public String getStepName() { return "ToUpperCase"; }
            @Override
            public int getOrder() { return 2; }
            @Override
            public StepResult<Map<String, Object>> execute(RecordItem<Map<String, Object>> record, JobContext context) {
                String original = (String) record.payload().get("value");
                return StepResult.success(Map.of("value", original.toUpperCase()));
            }
        };

        ProcessPipeline pipeline = new ProcessPipeline("pipe-1", List.of(step1, step2));
        JobContext ctx = new JobContext("j1", "f1", "test.csv", "s3://b/f1", "pipe-1", Map.of(), System.currentTimeMillis());
        RecordItem<Map<String, Object>> input = new RecordItem<>("rec-1", 1L, 0, Map.of("value", "hello"), Map.of());

        PipelineRecordResult<Map<String, Object>> result = pipeline.processRecord(input, ctx);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.finalPayload()).containsEntry("value", "PRE_HELLO");
    }

    @Test
    @DisplayName("Handles step failure with CONTINUE_ON_ERROR strategy")
    void shouldHandleFailureWithContinueOnError() {
        ProcessStep<Map<String, Object>, Map<String, Object>> failingStep = new ProcessStep<>() {
            @Override
            public String getStepName() { return "FailingValidation"; }
            @Override
            public int getOrder() { return 1; }
            @Override
            public StepResult<Map<String, Object>> execute(RecordItem<Map<String, Object>> record, JobContext context) {
                return StepResult.failedRetryable("Invalid format", new IllegalArgumentException("Bad input"));
            }
        };

        ProcessPipeline pipeline = new ProcessPipeline("pipe-2", List.of(failingStep));
        JobContext ctx = new JobContext("j2", "f2", "test.csv", "s3://b/f2", "pipe-2", Map.of(), System.currentTimeMillis());
        RecordItem<Map<String, Object>> input = new RecordItem<>("rec-2", 2L, 0, Map.of("value", "bad"), Map.of());

        PipelineRecordResult<Map<String, Object>> result = pipeline.processRecord(input, ctx);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.failedStepName()).isEqualTo("FailingValidation");
        assertThat(result.errorMessage()).isEqualTo("Invalid format");
    }

    @Test
    @DisplayName("Handles fatal step failure with STOP_JOB strategy")
    void shouldThrowWhenFatalErrorEncountered() {
        ProcessStep<Map<String, Object>, Map<String, Object>> fatalStep = new ProcessStep<>() {
            @Override
            public String getStepName() { return "FatalDatabaseCall"; }
            @Override
            public int getOrder() { return 1; }
            @Override
            public StepResult<Map<String, Object>> execute(RecordItem<Map<String, Object>> record, JobContext context) {
                return StepResult.failedFatal("Database node unreachable", new RuntimeException("Connection refused"));
            }
        };

        ProcessPipeline pipeline = new ProcessPipeline("pipe-3", List.of(fatalStep));
        JobContext ctx = new JobContext("j3", "f3", "test.csv", "s3://b/f3", "pipe-3", Map.of(), System.currentTimeMillis());
        RecordItem<Map<String, Object>> input = new RecordItem<>("rec-3", 3L, 0, Map.of("value", "crash"), Map.of());

        assertThrows(StepExecutionException.class, () ->
            pipeline.processRecordWithFailFast(input, ctx)
        );
    }
}

