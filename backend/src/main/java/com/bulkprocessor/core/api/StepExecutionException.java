package com.bulkprocessor.core.api;

/**
 * Thrown when an irrecoverable fatal error happens during step execution.
 */
public class StepExecutionException extends RuntimeException {
    private final String stepName;

    public StepExecutionException(String stepName, String message, Throwable cause) {
        super(message, cause);
        this.stepName = stepName;
    }

    public StepExecutionException(String stepName, String message) {
        super(message);
        this.stepName = stepName;
    }

    public String getStepName() {
        return stepName;
    }
}
