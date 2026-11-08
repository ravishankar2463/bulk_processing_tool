package com.bulkprocessor.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Enterprise Metrics & Telemetry Service.
 * Implements RED (Rate, Errors, Duration) and USE (Utilization, Saturation, Errors)
 * instrumentation over Micrometer and Prometheus.
 * Enforces strict label cardinality guardrails (no unbounded user IDs or payloads).
 */
@Service
public class BulkMetricsService {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger activeJobsInFlight = new AtomicInteger(0);
    private final AtomicInteger activeLoomVirtualThreads = new AtomicInteger(0);

    private final ConcurrentHashMap<String, Counter> recordsProcessedCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Counter> recordsFailedCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Counter> errorCounters = new ConcurrentHashMap<>();
    private final Timer jobExecutionTimer;
    private final Timer batchProcessingTimer;

    public BulkMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Register Gauges for Active Jobs & Virtual Thread saturation
        Gauge.builder("bulk.active.files.in_flight", activeJobsInFlight, AtomicInteger::get)
                .description("Number of bulk files currently being processed in flight")
                .register(meterRegistry);

        Gauge.builder("bulk.virtual_threads.active", activeLoomVirtualThreads, AtomicInteger::get)
                .description("Active Project Loom virtual threads executing batch worker pipelines")
                .register(meterRegistry);

        // Register Timers for Job and Batch duration
        this.jobExecutionTimer = Timer.builder("bulk.job.duration")
                .description("Total time taken to process an entire bulk job")
                .publishPercentiles(0.5, 0.90, 0.95, 0.99)
                .register(meterRegistry);

        this.batchProcessingTimer = Timer.builder("bulk.batch.duration")
                .description("Time taken to process an individual chunk/batch within a pipeline")
                .publishPercentiles(0.5, 0.90, 0.95, 0.99)
                .register(meterRegistry);
    }

    /**
     * Record records processed successfully.
     */
    public void recordRecordsProcessed(String processId, long count) {
        String safeProcessId = sanitizeTag(processId);
        recordsProcessedCounters.computeIfAbsent(safeProcessId, pid ->
                Counter.builder("bulk.job.records.processed")
                        .description("Total number of records successfully processed through pipeline")
                        .tag("process_id", pid)
                        .register(meterRegistry)
        ).increment(count);
    }

    /**
     * Record records failed.
     */
    public void recordRecordsFailed(String processId, String stepName, long count) {
        String safeProcessId = sanitizeTag(processId);
        String safeStep = sanitizeTag(stepName);
        String key = safeProcessId + ":" + safeStep;

        recordsFailedCounters.computeIfAbsent(key, k ->
                Counter.builder("bulk.job.records.failed")
                        .description("Total number of records that failed during processing")
                        .tag("process_id", safeProcessId)
                        .tag("step", safeStep)
                        .register(meterRegistry)
        ).increment(count);
    }

    /**
     * Record job duration.
     */
    public void recordJobDuration(long durationMillis) {
        jobExecutionTimer.record(durationMillis, TimeUnit.MILLISECONDS);
    }

    /**
     * Record batch processing duration.
     */
    public void recordBatchDuration(long durationMillis) {
        batchProcessingTimer.record(durationMillis, TimeUnit.MILLISECONDS);
    }

    /**
     * Increment active jobs in flight.
     */
    public void incrementActiveJobs() {
        activeJobsInFlight.incrementAndGet();
    }

    /**
     * Decrement active jobs in flight.
     */
    public void decrementActiveJobs() {
        activeJobsInFlight.updateAndGet(current -> Math.max(0, current - 1));
    }

    /**
     * Set active Project Loom virtual threads count.
     */
    public void recordLoomThreadsChange(int delta) {
        activeLoomVirtualThreads.updateAndGet(current -> Math.max(0, current + delta));
    }

    /**
     * Record application errors and exceptions.
     */
    public void recordError(String exceptionClass, String status) {
        String safeClass = sanitizeTag(exceptionClass);
        String safeStatus = sanitizeTag(status);
        String key = safeClass + ":" + safeStatus;

        errorCounters.computeIfAbsent(key, k ->
                Counter.builder("bulk.errors.total")
                        .description("Total count of backend exceptions and errors")
                        .tag("exception", safeClass)
                        .tag("status", safeStatus)
                        .register(meterRegistry)
        ).increment();
    }

    /**
     * Enforce bounded cardinality on Prometheus tag values.
     */
    private String sanitizeTag(String raw) {
        if (raw == null || raw.isBlank()) {
            return "unknown";
        }
        // Limit tag length to prevent memory leaks from malformed strings
        String clean = raw.replaceAll("[^a-zA-Z0-9_.-]", "_");
        return clean.length() > 64 ? clean.substring(0, 64) : clean;
    }
}
