package com.bulkprocessor.dto;

import java.util.List;

public record SoapEnvelopeGenerateRequestDto(
    String operationName,
    String targetNamespace,
    String soapVersion, // 1.1 or 1.2
    List<String> parameters
) {}
