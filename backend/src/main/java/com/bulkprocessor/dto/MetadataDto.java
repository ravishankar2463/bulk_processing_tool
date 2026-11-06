package com.bulkprocessor.dto;

public record MetadataDto(
    long sizeBytes,
    String encoding,
    String delimiter,
    long rowCount,
    String checksum,
    String loomThread
) {}

