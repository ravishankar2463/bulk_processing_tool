package com.bulkprocessor.service;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.splitter.batch.DynamicBatchChunker;
import com.bulkprocessor.splitter.csv.StreamingCsvSplitter;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;

/**
 * Coordinates streaming file ingestion, dynamic batch chunking, and pipeline execution
 * using Java 21 Project Loom virtual threads.
 */
@Service
public class JobCoordinatorService {

    private static final Logger log = LoggerFactory.getLogger(JobCoordinatorService.class);

    private final BulkJobRepository bulkJobRepository;
    private final BulkProcessingWorkerService workerService;
    private final StreamingCsvSplitter csvSplitter;
    private final DynamicBatchChunker defaultChunker;

    public JobCoordinatorService(
            BulkJobRepository bulkJobRepository,
            BulkProcessingWorkerService workerService,
            StreamingCsvSplitter csvSplitter,
            DynamicBatchChunker defaultChunker) {
        this.bulkJobRepository = bulkJobRepository;
        this.workerService = workerService;
        this.csvSplitter = csvSplitter;
        this.defaultChunker = defaultChunker;
    }

    /**
     * Executes bulk job synchronously on the current thread.
     */
    public int executeJob(String jobId, InputStream inputStream, int batchSize) throws Exception {
        BulkJobEntity job = bulkJobRepository.findById(jobId)
            .orElseThrow(() -> new IllegalArgumentException("Job not found: " + jobId));

        job.setStatus("PROCESSING");
        job.setStartTime(Instant.now());
        bulkJobRepository.save(job);

        JobContext context = new JobContext(
            jobId,
            jobId,
            job.getFileName() != null ? job.getFileName() : "uploaded.csv",
            job.getSourceUri() != null ? job.getSourceUri() : "upload://",
            job.getProcessId() != null ? job.getProcessId() : "default-process",
            Map.of(),
            Instant.now().toEpochMilli()
        );

        Iterator<RecordItem<Map<String, String>>> stringRecordIterator = csvSplitter.split(inputStream, context);

        // Convert string map to generic Map<String, Object>
        Iterator<RecordItem<Map<String, Object>>> recordIterator = new Iterator<>() {
            @Override
            public boolean hasNext() {
                return stringRecordIterator.hasNext();
            }

            @Override
            public RecordItem<Map<String, Object>> next() {
                RecordItem<Map<String, String>> item = stringRecordIterator.next();
                Map<String, Object> objMap = new LinkedHashMap<>(item.payload());
                return new RecordItem<>(
                    item.recordId(),
                    item.sequenceNumber(),
                    item.batchIndex(),
                    objMap,
                    item.metadata()
                );
            }
        };

        DynamicBatchChunker chunker = batchSize > 0 ? new DynamicBatchChunker(batchSize) : defaultChunker;
        Iterator<FileBatch<Map<String, Object>>> batchIterator = chunker.chunk(recordIterator, context);

        int batchCount = 0;
        long totalRecords = 0;

        while (batchIterator.hasNext()) {
            FileBatch<Map<String, Object>> batch = batchIterator.next();
            totalRecords += batch.records().size();
            workerService.processBatch(batch);
            batchCount++;
        }

        job.setTotalRecords(totalRecords);
        bulkJobRepository.save(job);

        log.info("Finished executing job {} with {} batches (total records: {})", jobId, batchCount, totalRecords);
        return batchCount;
    }

    /**
     * Executes bulk job asynchronously on a Project Loom Virtual Thread.
     */
    public CompletableFuture<Integer> executeJobAsync(String jobId, InputStream inputStream, int batchSize) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return executeJob(jobId, inputStream, batchSize);
            } catch (Exception e) {
                log.error("Error executing job {} on virtual thread", jobId, e);
                bulkJobRepository.findById(jobId).ifPresent(j -> {
                    j.setStatus("FAILED");
                    j.setEndTime(Instant.now());
                    bulkJobRepository.save(j);
                });
                throw new RuntimeException("Async job execution failed for " + jobId, e);
            }
        }, Executors.newVirtualThreadPerTaskExecutor());
    }
}

