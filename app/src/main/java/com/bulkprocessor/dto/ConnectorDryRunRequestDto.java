package com.bulkprocessor.dto;

import java.util.Map;

public record ConnectorDryRunRequestDto(
    String protocol,
    String configuration,
    String sampleInput,
    Map<String, Object> parameters,
    String customCode,
    String codeHookType
) {
    public ConnectorDryRunRequestDto(
        String protocol,
        String configuration,
        String sampleInput,
        Map<String, Object> parameters
    ) {
        this(protocol, configuration, sampleInput, parameters, null, null);
    }
}
