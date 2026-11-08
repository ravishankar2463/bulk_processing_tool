package com.bulkprocessor.observability;

import java.time.Instant;

/**
 * Standardized, secure API error envelope.
 * Exposes audit trace IDs for SRE / DevOps diagnosis without leaking sensitive stack traces.
 */
public record ObservabilityErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String errorCode,
        String traceId,
        String path
) {
    public static ObservabilityErrorResponse of(
            int status,
            String error,
            String message,
            String errorCode,
            String traceId,
            String path) {
        return new ObservabilityErrorResponse(
                Instant.now(),
                status,
                error,
                message != null ? message : error,
                errorCode,
                traceId,
                path
        );
    }
}
