package com.bulkprocessor.dto;

public record WsdlValidationRequestDto(
    String wsdlSource,
    boolean isUrl
) {}
