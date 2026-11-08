package com.bulkprocessor.dto;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public record ConnectorDryRunResultDto(
    boolean success,
    long durationMicros,
    int recordsExtracted,
    List<Map<String, Object>> previewRecords,
    String rawOutput,
    String errorMessage,
    List<String> logs,
    String activeBranchPort,
    Map<String, Object> enrichedRecord
) {
    public ConnectorDryRunResultDto(
        boolean success,
        long durationMicros,
        int recordsExtracted,
        List<Map<String, Object>> previewRecords,
        String rawOutput,
        String errorMessage,
        List<String> logs
    ) {
        this(success, durationMicros, recordsExtracted, previewRecords, rawOutput, errorMessage, logs, null, Collections.emptyMap());
    }
}
