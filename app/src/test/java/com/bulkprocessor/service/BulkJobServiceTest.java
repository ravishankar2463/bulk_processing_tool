package com.bulkprocessor.service;

import com.bulkprocessor.dto.FileDiagnosticsResponse;
import com.bulkprocessor.storage.entity.BulkJobBatchEntity;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.BulkJobBatchRepository;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BulkJobService Unit Tests")
class BulkJobServiceTest {

    @Mock
    private BulkJobRepository bulkJobRepository;

    @Mock
    private BulkRecordErrorRepository bulkRecordErrorRepository;

    @Mock
    private BulkJobBatchRepository bulkJobBatchRepository;

    @Mock
    private RouteConfigRepository routeConfigRepository;

    @Mock
    private JobCoordinatorService jobCoordinatorService;

    private ObjectMapper objectMapper;
    private BulkJobService bulkJobService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        bulkJobService = new BulkJobService(
            bulkJobRepository,
            bulkRecordErrorRepository,
            bulkJobBatchRepository,
            routeConfigRepository,
            jobCoordinatorService,
            objectMapper
        );
    }

    @Test
    @DisplayName("Resolves processId aliases to canonical IDs")
    void shouldResolveProcessAliases() {
        assertThat(bulkJobService.resolveProcessId("customer-master-onboarding"))
            .isEqualTo("proc-customer-master");
        assertThat(bulkJobService.resolveProcessId("order-fulfillment-stream"))
            .isEqualTo("proc-order-fulfillment");
        assertThat(bulkJobService.resolveProcessId("financial-reconciliation"))
            .isEqualTo("proc-financial-reconciliation");
        assertThat(bulkJobService.resolveProcessId("custom-proc"))
            .isEqualTo("custom-proc");
        assertThat(bulkJobService.resolveProcessId(null))
            .isEqualTo("proc-customer-master");
    }

    @Test
    @DisplayName("Retrieves jobs by process ID with alias fallback")
    void shouldGetJobsByProcessId() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-1");
        job.setProcessId("proc-customer-master");

        when(bulkJobRepository.findByProcessIdOrderByStartTimeDesc("proc-customer-master"))
            .thenReturn(List.of(job));

        List<BulkJobEntity> result = bulkJobService.getJobsByProcessId("customer-master-onboarding");
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getJobId()).isEqualTo("job-1");
    }

    @Test
    @DisplayName("Handles single file upload and async virtual thread coordination")
    void shouldUploadSingleFile() {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "customers.csv",
            "text/csv",
            "id,name\n1,Alice".getBytes()
        );

        when(bulkJobRepository.save(any(BulkJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BulkJobEntity job = bulkJobService.uploadFile(file, "proc-customer-master");

        assertThat(job).isNotNull();
        assertThat(job.getFileName()).isEqualTo("customers.csv");
        assertThat(job.getStatus()).isEqualTo("PENDING");
        assertThat(job.getStage()).isEqualTo("INGESTING");
        verify(jobCoordinatorService, times(1)).executeJobAsync(anyString(), any(), anyInt());
    }

    @Test
    @DisplayName("Handles batch file uploads and creates distinct jobs")
    void shouldBatchUploadFiles() {
        MockMultipartFile file1 = new MockMultipartFile("files", "file1.csv", "text/csv", "col\n1".getBytes());
        MockMultipartFile file2 = new MockMultipartFile("files", "file2.csv", "text/csv", "col\n2".getBytes());

        when(bulkJobRepository.save(any(BulkJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<BulkJobEntity> jobs = bulkJobService.batchUpload(new MockMultipartFile[]{file1, file2}, "proc-customer-master");

        assertThat(jobs).hasSize(2);
        verify(jobCoordinatorService, times(2)).executeJobAsync(anyString(), any(), anyInt());
    }

    @Test
    @DisplayName("Transitions job lifecycle state: pause, resume, retry, cancel")
    void shouldTransitionJobLifecycle() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-lifecycle");
        job.setStatus("RUNNING");
        job.setStage("IN_FLIGHT");
        job.setFailedRecords(10L);

        when(bulkJobRepository.findById("job-lifecycle")).thenReturn(Optional.of(job));
        when(bulkJobRepository.save(any(BulkJobEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Pause
        Optional<BulkJobEntity> paused = bulkJobService.pauseJob("job-lifecycle");
        assertThat(paused).isPresent();
        assertThat(paused.get().getStatus()).isEqualTo("PAUSED");

        // Resume
        Optional<BulkJobEntity> resumed = bulkJobService.resumeJob("job-lifecycle");
        assertThat(resumed).isPresent();
        assertThat(resumed.get().getStatus()).isEqualTo("PROCESSING");

        // Retry
        Optional<BulkJobEntity> retried = bulkJobService.retryJob("job-lifecycle");
        assertThat(retried).isPresent();
        assertThat(retried.get().getFailedRecords()).isEqualTo(0L);

        // Cancel
        Optional<BulkJobEntity> cancelled = bulkJobService.cancelJob("job-lifecycle");
        assertThat(cancelled).isPresent();
        assertThat(cancelled.get().getStatus()).isEqualTo("FAILED");
        assertThat(cancelled.get().getStage()).isEqualTo("DONE");
    }

    @Test
    @DisplayName("Synthesizes deep file diagnostics with metadata, latencies, chunks, and errors")
    void shouldSynthesizeJobDiagnostics() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-diag");
        job.setFileSizeBytes(500000L);
        job.setDetectedEncoding("UTF-8");
        job.setDetectedDelimiter(",");
        job.setTotalRecords(1500L);
        job.setChecksumSha256("sha-mock");
        job.setLoomThreadAllocation("VirtualThread-Worker-1");
        job.setFailedRecords(1L);

        when(bulkJobRepository.findById("job-diag")).thenReturn(Optional.of(job));

        BulkJobBatchEntity batch = new BulkJobBatchEntity("job-diag-batch-0", "job-diag", 0, 500, "DONE", 85000L, "partition-0");
        when(bulkJobBatchRepository.findByJobIdOrderByBatchIndexAsc("job-diag")).thenReturn(List.of(batch));

        BulkRecordErrorEntity error = new BulkRecordErrorEntity();
        error.setErrorId(101L);
        error.setJobId("job-diag");
        error.setSequenceNumber(14L);
        error.setErrorCode("VALIDATION_ERROR");
        error.setErrorMessage("Bad field");
        error.setRawPayload("{\"id\": 14, \"email\": \"invalid\"}");
        when(bulkRecordErrorRepository.findByJobId("job-diag")).thenReturn(List.of(error));

        Optional<FileDiagnosticsResponse> diagOpt = bulkJobService.getJobDiagnostics("job-diag");

        assertThat(diagOpt).isPresent();
        FileDiagnosticsResponse diag = diagOpt.get();
        assertThat(diag.jobId()).isEqualTo("job-diag");
        assertThat(diag.metadata().sizeBytes()).isEqualTo(500000L);
        assertThat(diag.stageLatencies()).hasSize(4);
        assertThat(diag.batchChunks()).hasSize(1);
        assertThat(diag.errorRecords()).hasSize(1);
        assertThat(diag.errorRecords().get(0).schemaTuple()).containsEntry("id", "14");
    }
}
