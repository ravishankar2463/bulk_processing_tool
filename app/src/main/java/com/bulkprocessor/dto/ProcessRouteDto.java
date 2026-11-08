package com.bulkprocessor.dto;

import java.util.List;

public record ProcessRouteDto(
    String id,
    String name,
    String description,
    String status,
    String health,
    int activeFilesInFlight,
    double aggregateThroughputRecordsPerSec,
    double successRatePercent,
    List<PipelineStepConfigDto> pipelineSteps,
    Integer retentionDays
) {
    public ProcessRouteDto(
        String id,
        String name,
        String description,
        String status,
        String health,
        int activeFilesInFlight,
        double aggregateThroughputRecordsPerSec,
        double successRatePercent,
        List<PipelineStepConfigDto> pipelineSteps
    ) {
        this(id, name, description, status, health, activeFilesInFlight, aggregateThroughputRecordsPerSec, successRatePercent, pipelineSteps, 30);
    }
}

