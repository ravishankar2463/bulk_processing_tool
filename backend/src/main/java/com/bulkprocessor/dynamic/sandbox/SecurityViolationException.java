package com.bulkprocessor.dynamic.sandbox;

/**
 * Thrown when user-supplied dynamic code attempts to call prohibited APIs or classes.
 */
public class SecurityViolationException extends RuntimeException {
    private final String prohibitedPattern;

    public SecurityViolationException(String message, String prohibitedPattern) {
        super(message);
        this.prohibitedPattern = prohibitedPattern;
    }

    public String getProhibitedPattern() {
        return prohibitedPattern;
    }
}
