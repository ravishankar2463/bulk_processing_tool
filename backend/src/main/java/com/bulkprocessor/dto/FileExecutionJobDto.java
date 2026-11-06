package com.bulkprocessor.dto;

public record FileExecutionJobDto(
    String id,
    String processId,
    String fileName,
    long fileSizeBytes,
    String stage,
    String status,
    long totalRecords,
    long processedRecords,
    long failedRecords,
    String submittedAt,
    String completedAt,
    String checksumSha256,
    String detectedEncoding,
    String detectedDelimiter,
    String loomThreadAllocation
) {}

