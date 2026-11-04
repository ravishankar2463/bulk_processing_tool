package com.bulkprocessor.core.api;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Immutable batch chunk of records.
 */
public record FileBatch<T>(
    String batchId,
    String jobId,
    int batchIndex,
    int totalEstimatedBatches,
    List<RecordItem<T>> records,
    boolean isLastBatch
) {
    public FileBatch {
        Objects.requireNonNull(batchId, "batchId must not be null");
        Objects.requireNonNull(jobId, "jobId must not be null");
        records = records == null ? List.of() : Collections.unmodifiableList(List.copyOf(records));
    }
}
