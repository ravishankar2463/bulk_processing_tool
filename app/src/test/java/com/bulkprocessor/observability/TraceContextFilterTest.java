package com.bulkprocessor.observability;

import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

@DisplayName("TraceContextFilter Unit Tests")
class TraceContextFilterTest {

    @Test
    @DisplayName("Should parse incoming W3C traceparent and inject into response and MDC")
    void testExtractsW3cTraceparent() throws Exception {
        Tracer tracer = mock(Tracer.class);
        TraceContextFilter filter = new TraceContextFilter(tracer);

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/routes/catalog");
        String incomingTrace = "4bf92f3577b34da6a3ce929d0e0e4736";
        String incomingSpan = "00f067aa0ba902b7";
        request.addHeader("traceparent", "00-" + incomingTrace + "-" + incomingSpan + "-01");
        request.addHeader("X-Request-Id", "req-12345");

        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = (req, res) -> {
            // Verify MDC inside the filter execution
            assertThat(MDC.get(TraceContextFilter.MDC_TRACE_ID)).isEqualTo(incomingTrace);
            assertThat(MDC.get(TraceContextFilter.MDC_SPAN_ID)).isEqualTo(incomingSpan);
            assertThat(MDC.get(TraceContextFilter.MDC_REQUEST_ID)).isEqualTo("req-12345");
            assertThat(MDC.get(TraceContextFilter.MDC_METHOD)).isEqualTo("GET");
            assertThat(MDC.get(TraceContextFilter.MDC_URI)).isEqualTo("/api/v1/routes/catalog");
        };

        filter.doFilter(request, response, filterChain);

        // Verify response headers
        assertThat(response.getHeader(TraceContextFilter.TRACE_ID_HEADER)).isEqualTo(incomingTrace);
        assertThat(response.getHeader(TraceContextFilter.REQUEST_ID_HEADER)).isEqualTo("req-12345");

        // Verify MDC was cleaned up after request execution
        assertThat(MDC.get(TraceContextFilter.MDC_TRACE_ID)).isNull();
        assertThat(MDC.get(TraceContextFilter.MDC_REQUEST_ID)).isNull();
    }

    @Test
    @DisplayName("Should generate fallback traceId and requestId when headers are absent")
    void testGeneratesFallbackTraceId() throws Exception {
        TraceContextFilter filter = new TraceContextFilter(null);

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/user/jobs/upload");
        MockHttpServletResponse response = new MockHttpServletResponse();

        FilterChain filterChain = (req, res) -> {
            assertThat(MDC.get(TraceContextFilter.MDC_TRACE_ID)).isNotBlank();
            assertThat(MDC.get(TraceContextFilter.MDC_REQUEST_ID)).isNotBlank();
        };

        filter.doFilter(request, response, filterChain);

        assertThat(response.getHeader(TraceContextFilter.TRACE_ID_HEADER)).isNotBlank();
        assertThat(response.getHeader(TraceContextFilter.REQUEST_ID_HEADER)).isNotBlank();
        assertThat(MDC.get(TraceContextFilter.MDC_TRACE_ID)).isNull();
    }
}
