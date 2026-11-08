import { describe, it, expect } from 'vitest';
import {
  generateTraceContext,
  getTraceHeaders,
  logTelemetryEvent,
  getRecentTelemetryEvents,
  recordApiTelemetry
} from '../utils/telemetry';

describe('Frontend Telemetry & W3C Trace Context Utilities', () => {
  it('generates valid W3C Trace Context (32-hex traceId, 16-hex spanId)', () => {
    const context = generateTraceContext();
    expect(context.traceId).toHaveLength(32);
    expect(context.spanId).toHaveLength(16);
    expect(context.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it('generates W3C trace headers for outgoing requests', () => {
    const headers = getTraceHeaders({ 'Content-Type': 'application/json' });
    expect(headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    expect(headers['X-Request-Id']).toMatch(/^req-[a-z0-9]+$/);
    expect(headers['X-Trace-Id']).toHaveLength(32);
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('records client telemetry events into bounded circular buffer', () => {
    logTelemetryEvent({
      type: 'ERROR',
      message: 'Simulated client component error',
      metadata: { code: 'ERR_COMPONENT' }
    });

    const recent = getRecentTelemetryEvents();
    expect(recent.length).toBeGreaterThan(0);
    const last = recent[recent.length - 1];
    expect(last.type).toBe('ERROR');
    expect(last.message).toBe('Simulated client component error');
  });

  it('records API failure telemetry when status >= 400', () => {
    recordApiTelemetry('/api/v1/routes/invalid', 404, 120.5, 'trace-test-404');
    const recent = getRecentTelemetryEvents();
    const last = recent[recent.length - 1];
    expect(last.type).toBe('API_FAILURE');
    expect(last.traceId).toBe('trace-test-404');
    expect(last.message).toContain('404');
  });
});
