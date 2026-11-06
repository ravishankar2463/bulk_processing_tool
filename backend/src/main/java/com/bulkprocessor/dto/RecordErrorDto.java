package com.bulkprocessor.dto;

import java.util.Map;

public record RecordErrorDto(
    String recordId,
    long lineNumber,
    String errorCode,
    String errorMessage,
    String rawPayload,
    Map<String, String> schemaTuple
) {}

