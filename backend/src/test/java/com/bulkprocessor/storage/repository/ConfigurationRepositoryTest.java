package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("Database Entity & Repository Integration Tests")
class ConfigurationRepositoryTest {

    @Autowired
    private ComponentInstanceRepository componentInstanceRepository;

    @Autowired
    private RouteConfigRepository routeConfigRepository;

    @Autowired
    private BulkJobRepository bulkJobRepository;

    @Autowired
    private BulkRecordErrorRepository bulkRecordErrorRepository;

    @Test
    @DisplayName("Persists and retrieves a programmable component instance")
    void shouldPersistAndRetrieveComponentInstance() {
        ComponentInstanceEntity entity = new ComponentInstanceEntity();
        entity.setInstanceId("val-customer-email");
        entity.setComponentType("VALIDATOR");
        entity.setName("Customer Email Validator");
        entity.setDescription("Validates RFC email format");
        entity.setExecutionMode("CODE_SNIPPET");
        entity.setLanguage("JAVA");
        entity.setSourceCode("return record.containsKey(\"email\");");
        entity.setVersion(1);
        entity.setActive(true);

        componentInstanceRepository.save(entity);

        Optional<ComponentInstanceEntity> retrieved = componentInstanceRepository.findById("val-customer-email");
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getName()).isEqualTo("Customer Email Validator");
        assertThat(retrieved.get().getLanguage()).isEqualTo("JAVA");
    }

    @Test
    @DisplayName("Persists and queries route configurations by status")
    void shouldPersistAndQueryRoutesByStatus() {
        RouteConfigEntity route = new RouteConfigEntity();
        route.setRouteId("s3-incoming-customers");
        route.setRouteName("S3 Inbound Customer Files");
        route.setRouteType("S3");
        route.setEndpointUri("aws2-s3://enterprise-bulk-uploads?prefix=incoming/customers/");
        route.setProcessId("customer-import-process");
        route.setStatus("ACTIVE");
        route.setPollingIntervalMs(5000);
        route.setVersion(1);

        routeConfigRepository.save(route);

        var activeRoutes = routeConfigRepository.findByStatus("ACTIVE");
        assertThat(activeRoutes).hasSize(1);
        assertThat(activeRoutes.get(0).getRouteId()).isEqualTo("s3-incoming-customers");
    }

    @Test
    @DisplayName("Tracks BulkJob lifecycle and associated record errors")
    void shouldTrackJobAndRecordErrors() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-abc-123");
        job.setFileName("large_dataset.csv");
        job.setSourceUri("s3://bucket/large_dataset.csv");
        job.setProcessId("proc-1");
        job.setStatus("PROCESSING");
        job.setTotalRecords(100000L);
        job.setProcessedRecords(50000L);
        job.setSuccessfulRecords(49800L);
        job.setFailedRecords(200L);
        job.setStartTime(Instant.now());

        bulkJobRepository.save(job);

        BulkRecordErrorEntity error = new BulkRecordErrorEntity();
        error.setJobId("job-abc-123");
        error.setBatchId("batch-10");
        error.setSequenceNumber(1420L);
        error.setRawPayload("{\"id\": 1420, \"email\": \"invalid_email\"}");
        error.setStepName("EmailValidationStep");
        error.setErrorCode("INVALID_EMAIL");
        error.setErrorMessage("Email field does not contain @");
        error.setCreatedAt(Instant.now());

        bulkRecordErrorRepository.save(error);

        var errors = bulkRecordErrorRepository.findByJobId("job-abc-123");
        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).getErrorCode()).isEqualTo("INVALID_EMAIL");
        assertThat(errors.get(0).getSequenceNumber()).isEqualTo(1420L);
    }
}
