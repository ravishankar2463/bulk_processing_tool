package com.bulkprocessor.observability;

import io.micrometer.tracing.Span;
import io.micrometer.tracing.Tracer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Enterprise HTTP Trace Context Filter.
 * - Extracts or propagates W3C Trace Context and correlation IDs.
 * - Enriches SLF4J MDC with traceId, spanId, clientIp, and requestId.
 * - Injects X-Trace-Id and X-Request-Id into HTTP response headers for end-to-end auditability.
 * - Ensures guaranteed cleanup of MDC variables across thread switches.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceContextFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TraceContextFilter.class);

    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String REQUEST_ID_HEADER = "X-Request-Id";
    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";
    public static final String W3C_TRACEPARENT_HEADER = "traceparent";

    public static final String MDC_TRACE_ID = "traceId";
    public static final String MDC_SPAN_ID = "spanId";
    public static final String MDC_REQUEST_ID = "requestId";
    public static final String MDC_URI = "uri";
    public static final String MDC_METHOD = "method";

    private final Tracer tracer;

    public TraceContextFilter(Tracer tracer) {
        this.tracer = tracer;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        long startTime = System.currentTimeMillis();
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }

        // Extract traceId from Micrometer tracer current span, or W3C traceparent, or generate fallback
        String traceId = null;
        String spanId = null;

        Span currentSpan = tracer != null ? tracer.currentSpan() : null;
        if (currentSpan != null && currentSpan.context() != null) {
            traceId = currentSpan.context().traceId();
            spanId = currentSpan.context().spanId();
        }

        // If Micrometer trace wasn't active yet, parse W3C traceparent (format: 00-traceid-spanid-flags)
        if (traceId == null || traceId.isBlank()) {
            String traceparent = request.getHeader(W3C_TRACEPARENT_HEADER);
            if (traceparent != null && traceparent.startsWith("00-")) {
                String[] parts = traceparent.split("-");
                if (parts.length >= 3) {
                    traceId = parts[1];
                    spanId = parts[2];
                }
            }
        }

        // Fallback traceId if none present
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString().replace("-", "");
            spanId = UUID.randomUUID().toString().substring(0, 16).replace("-", "");
        }

        // Populate MDC context
        MDC.put(MDC_TRACE_ID, traceId);
        MDC.put(MDC_SPAN_ID, spanId);
        MDC.put(MDC_REQUEST_ID, requestId);
        MDC.put(MDC_URI, request.getRequestURI());
        MDC.put(MDC_METHOD, request.getMethod());

        // Inject into Response headers
        response.setHeader(TRACE_ID_HEADER, traceId);
        response.setHeader(REQUEST_ID_HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;
            if (log.isDebugEnabled()) {
                log.debug("HTTP {} {} returned status {} in {} ms [traceId={}]",
                        request.getMethod(), request.getRequestURI(), response.getStatus(), duration, traceId);
            }
            MDC.remove(MDC_TRACE_ID);
            MDC.remove(MDC_SPAN_ID);
            MDC.remove(MDC_REQUEST_ID);
            MDC.remove(MDC_URI);
            MDC.remove(MDC_METHOD);
        }
    }
}
