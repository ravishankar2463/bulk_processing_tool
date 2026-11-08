package com.bulkprocessor.dto;

public record ScriptValidationResultDto(
    boolean valid,
    String errorMessage,
    int errorLine,
    long compilationTimeMicros
) {
    public static ScriptValidationResultDto success(long compilationTimeMicros) {
        return new ScriptValidationResultDto(true, null, 0, compilationTimeMicros);
    }

    public static ScriptValidationResultDto error(String errorMessage, int errorLine, long compilationTimeMicros) {
        return new ScriptValidationResultDto(false, errorMessage, errorLine, compilationTimeMicros);
    }
}
