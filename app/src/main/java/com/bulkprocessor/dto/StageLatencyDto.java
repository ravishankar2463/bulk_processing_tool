package com.bulkprocessor.dto;

public record StageLatencyDto(
    String stepId,
    String stepName,
    long durationMicros,
    double percentOfTotal,
    String status
) {}

