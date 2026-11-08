package com.bulkprocessor.dto;

import java.util.List;
import java.util.Map;

public record ConnectorDryRunResultDto(
    boolean success,
    long durationMicros,
    int recordsExtracted,
    List<Map<String, Object>> previewRecords,
    String rawOutput,
    String errorMessage,
    List<String> logs
) {}
