package com.bulkprocessor.dto;

public record ScriptValidationRequestDto(
    String script,
    String hookType // PRE_REQUEST, POST_RESPONSE, EXECUTE, MAP_RECORD
) {}
