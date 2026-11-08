package com.bulkprocessor.dto;

public record SoapEnvelopeGenerateResultDto(
    String envelopeXml,
    String soapAction,
    String contentType
) {}
