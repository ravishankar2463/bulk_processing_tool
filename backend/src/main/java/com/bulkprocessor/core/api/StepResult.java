package com.bulkprocessor.core.api;

/**
 * Result of executing an individual process step on a record.
 */
public record StepResult<O>(
    Status status,
    O outputPayload,
    String errorMessage,
    Throwable errorCause
) {
    public enum Status {
        SUCCESS,
        SKIPPED,
        FAILED_RETRYABLE,
        FAILED_FATAL
    }

    public static <O> StepResult<O> success(O payload) {
        return new StepResult<>(Status.SUCCESS, payload, null, null);
    }

    public static <O> StepResult<O> skipped() {
        return new StepResult<>(Status.SKIPPED, null, null, null);
    }

    public static <O> StepResult<O> failedRetryable(String errorMessage, Throwable cause) {
        return new StepResult<>(Status.FAILED_RETRYABLE, null, errorMessage, cause);
    }

    public static <O> StepResult<O> failedFatal(String errorMessage, Throwable cause) {
        return new StepResult<>(Status.FAILED_FATAL, null, errorMessage, cause);
    }
}
