package com.bulkprocessor.core.api;

import java.util.Collections;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable wrapper around a single record extracted from an input file.
 */
public record RecordItem<T>(
    String recordId,
    long sequenceNumber,
    int batchIndex,
    T payload,
    Map<String, Object> metadata
) {
    public RecordItem {
        Objects.requireNonNull(recordId, "recordId must not be null");
        metadata = metadata == null ? Map.of() : Collections.unmodifiableMap(Map.copyOf(metadata));
    }
}
