package com.bulkprocessor.dto;

import java.time.Instant;

public record HousekeepingReportDto(
    String routeId,
    int retentionDays,
    Instant cutoffTimestamp,
    int purgedJobsCount,
    int purgedErrorsCount,
    int purgedBatchChunksCount,
    long purgedBytes,
    Instant executedAt
) {}
