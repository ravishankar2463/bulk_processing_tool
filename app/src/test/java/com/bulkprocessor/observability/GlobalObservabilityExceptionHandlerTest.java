package com.bulkprocessor.observability;

import com.bulkprocessor.core.api.StepExecutionException;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalObservabilityExceptionHandler Unit Tests")
class GlobalObservabilityExceptionHandlerTest {

    private BulkMetricsService metricsService;
    private GlobalObservabilityExceptionHandler handler;

    @BeforeEach
    void setUp() {
        metricsService = new BulkMetricsService(new SimpleMeterRegistry());
        handler = new GlobalObservabilityExceptionHandler(metricsService);
    }

    @Test
    @DisplayName("Should handle SecurityViolationException and return 403 envelope with traceId")
    void testSecurityViolationException() {
        MDC.put(TraceContextFilter.MDC_TRACE_ID, "trace-sec-123");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/admin/components");

        try {
            SecurityViolationException ex = new SecurityViolationException("Access denied to root filesystem", "java.io.File");
            ResponseEntity<ObservabilityErrorResponse> response = handler.handleSecurityViolation(ex, request);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().status()).isEqualTo(403);
            assertThat(response.getBody().errorCode()).isEqualTo("SEC_VIOLATION_001");
            assertThat(response.getBody().traceId()).isEqualTo("trace-sec-123");
            assertThat(response.getBody().message()).contains("Access denied to root filesystem");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("Should handle StepExecutionException and return 422 envelope with traceId")
    void testStepExecutionException() {
        MDC.put(TraceContextFilter.MDC_TRACE_ID, "trace-step-456");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/user/jobs/upload");

        try {
            StepExecutionException ex = new StepExecutionException("VALIDATOR", "Validation failed on line 12");
            ResponseEntity<ObservabilityErrorResponse> response = handler.handleStepExecution(ex, request);

            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
            assertThat(response.getBody()).isNotNull();
            assertThat(response.getBody().status()).isEqualTo(422);
            assertThat(response.getBody().errorCode()).isEqualTo("STEP_EXECUTION_FAILURE");
            assertThat(response.getBody().traceId()).isEqualTo("trace-step-456");
        } finally {
            MDC.clear();
        }
    }

    @Test
    @DisplayName("Should handle unhandled generic Exception without exposing stack trace details to client")
    void testGenericExceptionMasking() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/routes/catalog");
        RuntimeException ex = new RuntimeException("Database connection timeout at 10.0.0.1:5432");

        ResponseEntity<ObservabilityErrorResponse> response = handler.handleGenericException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().status()).isEqualTo(500);
        assertThat(response.getBody().errorCode()).isEqualTo("INTERNAL_ERROR_500");
        assertThat(response.getBody().traceId()).isNotBlank();
        // Sensitive internal stack info must not leak in client error message
        assertThat(response.getBody().message()).doesNotContain("10.0.0.1:5432");
    }
}
