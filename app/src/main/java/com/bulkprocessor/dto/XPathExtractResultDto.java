package com.bulkprocessor.dto;

import java.util.List;
import java.util.Map;

public record XPathExtractResultDto(
    boolean success,
    Map<String, String> xpathMappings,
    List<String> detectedElements,
    String errorMessage
) {
    public static XPathExtractResultDto error(String errorMessage) {
        return new XPathExtractResultDto(false, Map.of(), List.of(), errorMessage);
    }
}
