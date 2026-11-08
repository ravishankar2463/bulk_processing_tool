package com.bulkprocessor.service;

import com.bulkprocessor.dto.HousekeepingReportDto;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.BulkJobBatchRepository;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class RouteHousekeepingService {

    private static final Logger log = LoggerFactory.getLogger(RouteHousekeepingService.class);

    private final RouteConfigRepository routeConfigRepository;
    private final BulkJobRepository bulkJobRepository;
    private final BulkJobBatchRepository bulkJobBatchRepository;
    private final BulkRecordErrorRepository bulkRecordErrorRepository;

    public RouteHousekeepingService(
            RouteConfigRepository routeConfigRepository,
            BulkJobRepository bulkJobRepository,
            BulkJobBatchRepository bulkJobBatchRepository,
            BulkRecordErrorRepository bulkRecordErrorRepository) {
        this.routeConfigRepository = routeConfigRepository;
        this.bulkJobRepository = bulkJobRepository;
        this.bulkJobBatchRepository = bulkJobBatchRepository;
        this.bulkRecordErrorRepository = bulkRecordErrorRepository;
    }

    /**
     * Automated nightly housekeeping runner (defaults to 2:00 AM daily).
     */
    @Scheduled(cron = "${bulkprocessor.housekeeping.cron:0 0 2 * * ?}")
    public List<HousekeepingReportDto> runDailyScheduledHousekeeping() {
        log.info("Starting automated daily route housekeeping purge...");
        return purgeAllExpiredFiles();
    }

    @Transactional
    public List<HousekeepingReportDto> purgeAllExpiredFiles() {
        List<RouteConfigEntity> routes = routeConfigRepository.findAll();
        List<HousekeepingReportDto> reports = new ArrayList<>();
        for (RouteConfigEntity route : routes) {
            reports.add(purgeExpiredFilesForRoute(route.getRouteId()));
        }
        return reports;
    }

    @Transactional
    public HousekeepingReportDto purgeExpiredFilesForRoute(String routeId) {
        RouteConfigEntity route = routeConfigRepository.findById(routeId).orElse(null);
        int retentionDays = 30;
        String processId = routeId;

        if (route != null) {
            retentionDays = route.getRetentionDays() != null ? route.getRetentionDays() : 30;
            // Strict 90-day ceiling invariant (3 months max)
            retentionDays = Math.max(1, Math.min(90, retentionDays));
            if (route.getProcessId() != null && !route.getProcessId().isBlank()) {
                processId = route.getProcessId();
            }
        }

        Instant cutoff = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        List<BulkJobEntity> expiredJobs = bulkJobRepository.findByProcessIdAndStartTimeBefore(processId, cutoff);

        int purgedJobsCount = 0;
        int purgedErrorsCount = 0;
        int purgedBatchChunksCount = 0;
        long purgedBytes = 0L;

        for (BulkJobEntity job : expiredJobs) {
            String jobId = job.getJobId();

            // 1. Purge DLQ errors for expired file job
            var errors = bulkRecordErrorRepository.findByJobId(jobId);
            purgedErrorsCount += errors.size();
            bulkRecordErrorRepository.deleteByJobId(jobId);

            // 2. Purge Batch Chunks for expired file job
            var batches = bulkJobBatchRepository.findByJobIdOrderByBatchIndexAsc(jobId);
            purgedBatchChunksCount += batches.size();
            bulkJobBatchRepository.deleteByJobId(jobId);

            // 3. Purge physical file on storage/disk
            if (job.getSourceUri() != null && !job.getSourceUri().isBlank()) {
                try {
                    String uri = job.getSourceUri();
                    if (uri.startsWith("file://")) {
                        uri = uri.substring(7);
                    }
                    Path filePath = Path.of(uri);
                    if (Files.exists(filePath)) {
                        long size = Files.size(filePath);
                        Files.deleteIfExists(filePath);
                        purgedBytes += size;
                    }
                } catch (Exception e) {
                    log.warn("Housekeeping: Could not delete physical file for job {}: {}", jobId, e.getMessage());
                }
            }
            if (job.getFileSizeBytes() != null && job.getFileSizeBytes() > 0) {
                purgedBytes += job.getFileSizeBytes();
            }

            // 4. Purge Master Job Entity
            bulkJobRepository.delete(job);
            purgedJobsCount++;
        }

        log.info("Completed housekeeping for route {}: purged {} jobs, {} errors, {} batch chunks, {} bytes",
                routeId, purgedJobsCount, purgedErrorsCount, purgedBatchChunksCount, purgedBytes);

        return new HousekeepingReportDto(
                routeId,
                retentionDays,
                cutoff,
                purgedJobsCount,
                purgedErrorsCount,
                purgedBatchChunksCount,
                purgedBytes,
                Instant.now()
        );
    }
}
