package com.bulkprocessor.dto;

import java.util.List;

public record WsdlValidationResultDto(
    boolean valid,
    String serviceName,
    String targetNamespace,
    String endpointUrl,
    List<WsdlOperationDto> operations,
    String errorMessage
) {
    public record WsdlOperationDto(
        String name,
        String soapAction,
        String inputMessage,
        String outputMessage,
        List<String> detectedParameters
    ) {}

    public static WsdlValidationResultDto error(String errorMessage) {
        return new WsdlValidationResultDto(false, null, null, null, List.of(), errorMessage);
    }
}
