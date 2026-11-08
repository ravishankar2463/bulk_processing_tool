package com.bulkprocessor.dto;

public record SchemaParseRequestDto(
    String input,
    boolean isSchema,
    String targetMode // REQUEST or RESPONSE
) {}
