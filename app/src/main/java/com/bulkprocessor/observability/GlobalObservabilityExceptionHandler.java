package com.bulkprocessor.observability;

import com.bulkprocessor.core.api.StepExecutionException;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Enterprise Global Exception Handler and Observability Interceptor.
 * - Enforces zero stack trace leakage to external callers.
 * - Embeds W3C / MDC traceId into every error response envelope.
 * - Streams structured exception events into SLF4J MDC and Prometheus error metrics.
 */
@RestControllerAdvice
public class GlobalObservabilityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalObservabilityExceptionHandler.class);

    private final BulkMetricsService metricsService;

    public GlobalObservabilityExceptionHandler(BulkMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    private String getTraceId() {
        String traceId = MDC.get(TraceContextFilter.MDC_TRACE_ID);
        return traceId != null ? traceId : "untraced-" + System.currentTimeMillis();
    }

    @ExceptionHandler(SecurityViolationException.class)
    public ResponseEntity<ObservabilityErrorResponse> handleSecurityViolation(
            SecurityViolationException ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.warn("Security violation detected [traceId={}] path={}: {}", traceId, request.getRequestURI(), ex.getMessage());
        metricsService.recordError("SecurityViolationException", "403");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.FORBIDDEN.value(),
                HttpStatus.FORBIDDEN.getReasonPhrase(),
                ex.getMessage(),
                "SEC_VIOLATION_001",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
    }

    @ExceptionHandler(StepExecutionException.class)
    public ResponseEntity<ObservabilityErrorResponse> handleStepExecution(
            StepExecutionException ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.warn("Pipeline step execution failure [traceId={}] path={}: {}", traceId, request.getRequestURI(), ex.getMessage());
        metricsService.recordError("StepExecutionException", "422");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.UNPROCESSABLE_ENTITY.value(),
                HttpStatus.UNPROCESSABLE_ENTITY.getReasonPhrase(),
                ex.getMessage(),
                "STEP_EXECUTION_FAILURE",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(body);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ObservabilityErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.info("Request payload validation error [traceId={}] path={}: {}", traceId, request.getRequestURI(), ex.getMessage());
        metricsService.recordError("MethodArgumentNotValidException", "400");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                "Validation failed for request arguments",
                "VALIDATION_ERROR",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ObservabilityErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.warn("Invalid client argument [traceId={}] path={}: {}", traceId, request.getRequestURI(), ex.getMessage());
        metricsService.recordError("IllegalArgumentException", "400");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                HttpStatus.BAD_REQUEST.getReasonPhrase(),
                ex.getMessage(),
                "INVALID_ARGUMENT",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ObservabilityErrorResponse> handleNotFound(
            NoResourceFoundException ex, HttpServletRequest request) {
        String traceId = getTraceId();
        metricsService.recordError("NoResourceFoundException", "404");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                HttpStatus.NOT_FOUND.getReasonPhrase(),
                ex.getMessage(),
                "RESOURCE_NOT_FOUND",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ObservabilityErrorResponse> handleGenericException(
            Exception ex, HttpServletRequest request) {
        String traceId = getTraceId();
        log.error("Unhandled server exception encountered [traceId={}] path={}", traceId, request.getRequestURI(), ex);
        metricsService.recordError(ex.getClass().getSimpleName(), "500");

        ObservabilityErrorResponse body = ObservabilityErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase(),
                "An internal error occurred while processing the request. Contact support with trace ID.",
                "INTERNAL_ERROR_500",
                traceId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
    }
}
