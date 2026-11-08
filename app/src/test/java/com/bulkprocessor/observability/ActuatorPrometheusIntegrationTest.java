package com.bulkprocessor.observability;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@DisplayName("Actuator & Prometheus Observability Integration Tests")
class ActuatorPrometheusIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private BulkMetricsService metricsService;

    @Test
    @DisplayName("Actuator /actuator/health should return UP status with custom BulkProcessingEngine details")
    void testActuatorHealthEndpoint() {
        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/health", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).contains("\"status\":\"UP\"");
        assertThat(response.getBody()).contains("BulkProcessingEngine");
    }

    @Test
    @DisplayName("Actuator /actuator/prometheus should export Prometheus-compatible metrics including custom bulk counters")
    void testActuatorPrometheusEndpoint() {
        metricsService.recordRecordsProcessed("proc-order-fulfillment", 250);

        ResponseEntity<String> response = restTemplate.getForEntity("/actuator/prometheus", String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        // Verify standard JVM metrics are present
        assertThat(response.getBody()).contains("jvm_memory_used_bytes");
        // Verify custom bulk engine metrics are exported
        assertThat(response.getBody()).contains("bulk_job_records_processed_total");
        assertThat(response.getBody()).contains("proc-order-fulfillment");
    }
}
