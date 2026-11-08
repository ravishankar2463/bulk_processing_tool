package com.bulkprocessor.dto;

public record BatchChunkDto(
    int chunkIndex,
    int recordCount,
    long durationMicros,
    String partitionId,
    String status
) {}

