package com.bulkprocessor.dto;

import java.util.List;
import java.util.Map;

public record SchemaParseResultDto(
    boolean success,
    String mode, // REQUEST or RESPONSE
    Map<String, String> fieldTypes,
    String generatedTemplate,
    Map<String, String> jsonPathMappings,
    List<String> warnings
) {
    public static SchemaParseResultDto failure(String mode, String error) {
        return new SchemaParseResultDto(false, mode, Map.of(), "", Map.of(), List.of(error));
    }
}
