package com.bulkprocessor.core.model;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.StepResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("Domain Model & Immutability Unit Tests")
class DomainModelTest {

    @Test
    @DisplayName("JobContext preserves metadata and is immutable")
    void jobContextShouldBeImmutableAndRetainMetadata() {
        Map<String, Object> params = Map.of("delimiter", ",", "batchSize", 500);
        JobContext context = new JobContext(
            "job-001",
            "file-001",
            "customers.csv",
            "s3://bucket/incoming/customers.csv",
            "process-customers",
            params,
            System.currentTimeMillis()
        );

        assertThat(context.jobId()).isEqualTo("job-001");
        assertThat(context.fileName()).isEqualTo("customers.csv");
        assertThat(context.parameters()).containsEntry("delimiter", ",");

        // Immutability: parameters map should not allow mutations
        assertThrows(UnsupportedOperationException.class, () ->
            context.parameters().put("newKey", "newValue")
        );
    }

    @Test
    @DisplayName("RecordItem encapsulates payload and sequence number")
    void recordItemShouldEncapsulatePayloadAndSequence() {
        Map<String, Object> payload = Map.of("name", "Alice", "email", "alice@example.com");
        RecordItem<Map<String, Object>> record = new RecordItem<>(
            "rec-101",
            1L,
            0,
            payload,
            Map.of("sourceLine", 2)
        );

        assertThat(record.recordId()).isEqualTo("rec-101");
        assertThat(record.sequenceNumber()).isEqualTo(1L);
        assertThat(record.batchIndex()).isEqualTo(0);
        assertThat(record.payload()).containsEntry("name", "Alice");
        assertThat(record.metadata()).containsEntry("sourceLine", 2);
    }

    @Test
    @DisplayName("FileBatch aggregates records with batch metadata")
    void fileBatchShouldAggregateRecordsCorrectly() {
        RecordItem<String> r1 = new RecordItem<>("r1", 1L, 0, "row-1", Map.of());
        RecordItem<String> r2 = new RecordItem<>("r2", 2L, 0, "row-2", Map.of());

        FileBatch<String> batch = new FileBatch<>(
            "b-01",
            "job-001",
            0,
            10,
            List.of(r1, r2),
            false
        );

        assertThat(batch.batchId()).isEqualTo("b-01");
        assertThat(batch.records()).hasSize(2);
        assertThat(batch.isLastBatch()).isFalse();
    }

    @Test
    @DisplayName("StepResult encapsulates execution status and output")
    void stepResultShouldEncapsulateStatus() {
        StepResult<String> success = StepResult.success("Transformed");
        assertThat(success.status()).isEqualTo(StepResult.Status.SUCCESS);
        assertThat(success.outputPayload()).isEqualTo("Transformed");
        assertThat(success.errorMessage()).isNull();

        StepResult<String> failure = StepResult.failedFatal("Fatal DB connection loss", new RuntimeException("DB down"));
        assertThat(failure.status()).isEqualTo(StepResult.Status.FAILED_FATAL);
        assertThat(failure.errorMessage()).isEqualTo("Fatal DB connection loss");
        assertThat(failure.errorCause()).isNotNull();
    }
}

