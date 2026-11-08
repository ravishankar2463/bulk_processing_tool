package com.bulkprocessor.service;

import com.bulkprocessor.dto.HousekeepingReportDto;
import com.bulkprocessor.storage.entity.BulkJobBatchEntity;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.BulkJobBatchRepository;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.File;
import java.nio.file.Files;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Route Housekeeping & Deletion Cascade Service Test")
class RouteHousekeepingServiceTest {

    private RouteConfigRepository routeConfigRepository;
    private BulkJobRepository bulkJobRepository;
    private BulkJobBatchRepository bulkJobBatchRepository;
    private BulkRecordErrorRepository bulkRecordErrorRepository;
    private RouteHousekeepingService housekeepingService;

    @BeforeEach
    void setUp() {
        routeConfigRepository = Mockito.mock(RouteConfigRepository.class);
        bulkJobRepository = Mockito.mock(BulkJobRepository.class);
        bulkJobBatchRepository = Mockito.mock(BulkJobBatchRepository.class);
        bulkRecordErrorRepository = Mockito.mock(BulkRecordErrorRepository.class);

        housekeepingService = new RouteHousekeepingService(
                routeConfigRepository,
                bulkJobRepository,
                bulkJobBatchRepository,
                bulkRecordErrorRepository
        );
    }

    @Test
    @DisplayName("Enforces 90-day ceiling and cascades deletion of expired jobs, chunks, errors, and files")
    void shouldPurgeExpiredFilesWithCascadeAndCeiling() throws Exception {
        // Arrange
        String routeId = "route-payments";
        RouteConfigEntity route = new RouteConfigEntity();
        route.setRouteId(routeId);
        route.setProcessId(routeId);
        // Attempt to configure 120 days -> should be clamped to 90 days ceiling
        route.setRetentionDays(120);
        assertThat(route.getRetentionDays()).isEqualTo(90);

        when(routeConfigRepository.findById(routeId)).thenReturn(Optional.of(route));

        // Create temporary physical test file on disk
        File tempFile = File.createTempFile("housekeeping-test-", ".csv");
        Files.writeString(tempFile.toPath(), "test-data-for-purge");
        assertThat(tempFile.exists()).isTrue();

        BulkJobEntity expiredJob = new BulkJobEntity();
        expiredJob.setJobId("job-expired-100");
        expiredJob.setProcessId(routeId);
        expiredJob.setSourceUri(tempFile.getAbsolutePath());
        expiredJob.setFileSizeBytes(tempFile.length());
        expiredJob.setStartTime(Instant.now().minus(95, ChronoUnit.DAYS));

        when(bulkJobRepository.findByProcessIdAndStartTimeBefore(eq(routeId), any(Instant.class)))
                .thenReturn(List.of(expiredJob));

        BulkRecordErrorEntity mockError = new BulkRecordErrorEntity();
        mockError.setJobId("job-expired-100");
        when(bulkRecordErrorRepository.findByJobId("job-expired-100")).thenReturn(List.of(mockError));

        BulkJobBatchEntity mockBatch = new BulkJobBatchEntity();
        mockBatch.setJobId("job-expired-100");
        when(bulkJobBatchRepository.findByJobIdOrderByBatchIndexAsc("job-expired-100")).thenReturn(List.of(mockBatch));

        // Act
        HousekeepingReportDto report = housekeepingService.purgeExpiredFilesForRoute(routeId);

        // Assert
        assertThat(report).isNotNull();
        assertThat(report.routeId()).isEqualTo(routeId);
        assertThat(report.retentionDays()).isEqualTo(90);
        assertThat(report.purgedJobsCount()).isEqualTo(1);
        assertThat(report.purgedErrorsCount()).isEqualTo(1);
        assertThat(report.purgedBatchChunksCount()).isEqualTo(1);
        assertThat(report.purgedBytes()).isGreaterThan(0L);

        // Verify cascade deletion methods invoked
        verify(bulkRecordErrorRepository).deleteByJobId("job-expired-100");
        verify(bulkJobBatchRepository).deleteByJobId("job-expired-100");
        verify(bulkJobRepository).delete(expiredJob);

        // Verify physical file was deleted from disk
        assertThat(tempFile.exists()).isFalse();
    }
}
