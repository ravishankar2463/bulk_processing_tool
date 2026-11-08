package com.bulkprocessor.dto;

public record FieldMappingDto(
    String source,
    String target,
    String transform
) {}

