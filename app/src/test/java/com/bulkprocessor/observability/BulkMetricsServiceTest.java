package com.bulkprocessor.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("BulkMetricsService Unit Tests")
class BulkMetricsServiceTest {

    private MeterRegistry meterRegistry;
    private BulkMetricsService metricsService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metricsService = new BulkMetricsService(meterRegistry);
    }

    @Test
    @DisplayName("Should increment records processed and failed counters with bounded tags")
    void testRecordMetrics() {
        metricsService.recordRecordsProcessed("proc-customer-master", 100);
        metricsService.recordRecordsProcessed("proc-customer-master", 50);
        metricsService.recordRecordsFailed("proc-customer-master", "VALIDATOR", 5);

        double processedCount = meterRegistry.get("bulk.job.records.processed")
                .tag("process_id", "proc-customer-master")
                .counter().count();

        double failedCount = meterRegistry.get("bulk.job.records.failed")
                .tag("process_id", "proc-customer-master")
                .tag("step", "VALIDATOR")
                .counter().count();

        assertThat(processedCount).isEqualTo(150.0);
        assertThat(failedCount).isEqualTo(5.0);
    }

    @Test
    @DisplayName("Should track active jobs gauge and timers accurately")
    void testActiveJobsAndTimers() {
        metricsService.incrementActiveJobs();
        metricsService.incrementActiveJobs();
        assertThat(meterRegistry.get("bulk.active.files.in_flight").gauge().value()).isEqualTo(2.0);

        metricsService.decrementActiveJobs();
        assertThat(meterRegistry.get("bulk.active.files.in_flight").gauge().value()).isEqualTo(1.0);

        metricsService.recordJobDuration(250);
        assertThat(meterRegistry.get("bulk.job.duration").timer().count()).isEqualTo(1);
    }
}
