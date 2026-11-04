package com.bulkprocessor.core.pipeline;

/**
 * Encapsulates the end result of passing a record through a ProcessPipeline.
 */
public record PipelineRecordResult<T>(
    boolean isSuccess,
    T finalPayload,
    String failedStepName,
    String errorMessage,
    Throwable errorCause
) {
    public static <T> PipelineRecordResult<T> success(T payload) {
        return new PipelineRecordResult<>(true, payload, null, null, null);
    }

    public static <T> PipelineRecordResult<T> failure(String stepName, String message, Throwable cause) {
        return new PipelineRecordResult<>(false, null, stepName, message, cause);
    }
}
