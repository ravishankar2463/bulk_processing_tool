package com.bulkprocessor.dto;

import java.util.List;
import java.util.Map;

public record PipelineStepConfigDto(
    String id,
    String name,
    String type,
    Map<String, Object> parameters,
    List<FieldMappingDto> fieldMappings,
    String errorPolicy,
    int concurrency
) {}

