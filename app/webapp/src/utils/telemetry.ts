/**
 * Enterprise Frontend Observability & Telemetry Subsystem.
 * Provides W3C Trace Context generation, API metric recording,
 * Core Web Vitals observation, and uncaught error tracking.
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceparent: string;
}

export interface ClientTelemetryEvent {
  timestamp: string;
  type: 'ERROR' | 'API_FAILURE' | 'WEB_VITAL' | 'UNHANDLED_REJECTION';
  message: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

// In-memory bounded circular telemetry buffer (max 100 entries)
const TELEMETRY_BUFFER: ClientTelemetryEvent[] = [];
const MAX_BUFFER_SIZE = 100;

/**
 * Generate a random 32-hex trace ID and 16-hex span ID adhering to W3C Trace Context spec.
 */
export function generateTraceContext(): TraceContext {
  const hex = (len: number) => {
    let s = '';
    while (s.length < len) {
      s += Math.floor(Math.random() * 0xffffffff).toString(16);
    }
    return s.substring(0, len).padStart(len, '0');
  };

  const traceId = hex(32);
  const spanId = hex(16);
  const traceparent = `00-${traceId}-${spanId}-01`;

  return { traceId, spanId, traceparent };
}

/**
 * Returns W3C trace headers to merge into outgoing fetch requests.
 */
export function getTraceHeaders(existingHeaders?: HeadersInit): Record<string, string> {
  const { traceId, traceparent } = generateTraceContext();
  const requestId = 'req-' + Math.random().toString(36).substring(2, 11);

  const base: Record<string, string> = {
    'traceparent': traceparent,
    'X-Request-Id': requestId,
    'X-Trace-Id': traceId
  };

  if (existingHeaders) {
    if (existingHeaders instanceof Headers) {
      existingHeaders.forEach((v, k) => { base[k] = v; });
    } else if (Array.isArray(existingHeaders)) {
      existingHeaders.forEach(([k, v]) => { base[k] = v; });
    } else {
      Object.assign(base, existingHeaders);
    }
  }

  return base;
}

/**
 * Push an event into the local diagnostic telemetry buffer.
 */
export function logTelemetryEvent(event: Omit<ClientTelemetryEvent, 'timestamp'>): void {
  const fullEvent: ClientTelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString()
  };

  if (TELEMETRY_BUFFER.length >= MAX_BUFFER_SIZE) {
    TELEMETRY_BUFFER.shift();
  }
  TELEMETRY_BUFFER.push(fullEvent);
}

/**
 * Retrieve recent client telemetry events.
 */
export function getRecentTelemetryEvents(): ClientTelemetryEvent[] {
  return [...TELEMETRY_BUFFER];
}

/**
 * Record API call latency and failure diagnostics.
 */
export function recordApiTelemetry(endpoint: string, status: number, durationMs: number, traceId?: string): void {
  if (status >= 400 || status === 0) {
    logTelemetryEvent({
      type: 'API_FAILURE',
      message: `API request to ${endpoint} failed with status ${status} in ${durationMs.toFixed(1)}ms`,
      traceId,
      metadata: { endpoint, status, durationMs }
    });
  }
}

let isInitialized = false;

/**
 * Initialize global browser telemetry listeners (uncaught errors, rejections, web vitals).
 * Safe for SSR and JSDOM test runners.
 */
export function initFrontendObservability(): void {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }
  isInitialized = true;

  // 1. Uncaught runtime error handler
  window.addEventListener('error', (event: ErrorEvent) => {
    logTelemetryEvent({
      type: 'ERROR',
      message: event.message || 'Uncaught browser error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      }
    });
  });

  // 2. Unhandled Promise rejection handler
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    logTelemetryEvent({
      type: 'UNHANDLED_REJECTION',
      message: `Unhandled Promise rejection: ${reason}`,
      metadata: {
        stack: event.reason instanceof Error ? event.reason.stack : undefined
      }
    });
  });

  // 3. Core Web Vitals observer (if supported by the browser)
  try {
    if (typeof PerformanceObserver !== 'undefined') {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          logTelemetryEvent({
            type: 'WEB_VITAL',
            message: `${entry.name}: ${entry.startTime.toFixed(1)}ms`,
            metadata: { metric: entry.name, value: entry.startTime }
          });
        }
      });
      paintObserver.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
    }
  } catch {
    // Unsupported entry type in this environment -> safe ignore
  }
}
