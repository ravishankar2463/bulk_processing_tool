package com.bulkprocessor.core.api;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable context for a bulk job execution.
 */
public record JobContext(
    String jobId,
    String fileId,
    String fileName,
    String sourceUri,
    String processDefinitionId,
    Map<String, Object> parameters,
    long startTimeEpochMs
) {
    public JobContext {
        Objects.requireNonNull(jobId, "jobId must not be null");
        Objects.requireNonNull(fileName, "fileName must not be null");
        parameters = parameters == null ? Map.of() : Collections.unmodifiableMap(Map.copyOf(parameters));
    }
}
