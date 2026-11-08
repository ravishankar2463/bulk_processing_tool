package com.bulkprocessor.service;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.splitter.batch.DynamicBatchChunker;
import com.bulkprocessor.splitter.csv.CsvSplitterConfig;
import com.bulkprocessor.splitter.csv.StreamingCsvSplitter;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Job Coordinator Service Unit Tests")
class JobCoordinatorServiceTest {

    @Mock
    private BulkJobRepository bulkJobRepository;

    @Mock
    private BulkProcessingWorkerService workerService;

    @Test
    @DisplayName("Streams CSV, splits, chunks into batches, and dispatches to worker service on Virtual Threads")
    void shouldCoordinateStreamingCsvJob() throws Exception {
        StreamingCsvSplitter splitter = new StreamingCsvSplitter(CsvSplitterConfig.builder().build());
        DynamicBatchChunker chunker = new DynamicBatchChunker();

        JobCoordinatorService coordinator = new JobCoordinatorService(
            bulkJobRepository,
            workerService,
            splitter,
            chunker
        );

        String jobId = "job-coord-1";
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId(jobId);
        job.setFileName("users.csv");
        job.setStatus("PENDING");
        job.setProcessId("user-process");

        when(bulkJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String csvData = "id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com\n3,Charlie,charlie@example.com\n";
        ByteArrayInputStream inputStream = new ByteArrayInputStream(csvData.getBytes(StandardCharsets.UTF_8));

        int batchSize = 2; // will produce 2 batches: [1, 2], [3]
        int dispatchedBatches = coordinator.executeJob(jobId, inputStream, batchSize);

        assertThat(dispatchedBatches).isEqualTo(2);
        verify(workerService, times(2)).processBatch(any());
        verify(bulkJobRepository, atLeastOnce()).save(job);
        assertThat(job.getStatus()).isEqualTo("PROCESSING");
        assertThat(job.getTotalRecords()).isEqualTo(3L);
    }
}

