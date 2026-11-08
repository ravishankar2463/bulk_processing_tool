package com.bulkprocessor.api.user;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("User Job REST Controller Integration Tests")
class UserJobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BulkJobRepository bulkJobRepository;

    @Test
    @DisplayName("Uploads a CSV file to trigger a new bulk processing job")
    void shouldUploadCsvAndTriggerJob() throws Exception {
        String csvContent = "id,name,amount\n1,Alice,100\n2,Bob,200\n";
        MockMultipartFile file = new MockMultipartFile("file", "upload.csv", "text/csv", csvContent.getBytes());

        mockMvc.perform(multipart("/api/v1/user/jobs/upload")
                .file(file)
                .param("processId", "customer-process"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.jobId").exists())
            .andExpect(jsonPath("$.fileName").value("upload.csv"))
            .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Retrieves job status and metrics by jobId")
    void shouldGetJobMetrics() throws Exception {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-status-test");
        job.setFileName("data.csv");
        job.setSourceUri("upload://data.csv");
        job.setProcessId("process-1");
        job.setStatus("COMPLETED");
        job.setTotalRecords(500L);
        job.setProcessedRecords(500L);
        job.setSuccessfulRecords(495L);
        job.setFailedRecords(5L);
        job.setStartTime(Instant.now());
        bulkJobRepository.save(job);

        mockMvc.perform(get("/api/v1/user/jobs/{jobId}", "job-status-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jobId").value("job-status-test"))
            .andExpect(jsonPath("$.status").value("COMPLETED"))
            .andExpect(jsonPath("$.successfulRecords").value(495));
    }

    @Test
    @DisplayName("Downloads execution summary CSV report")
    void shouldDownloadCsvReport() throws Exception {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-report-test");
        job.setFileName("report_input.csv");
        job.setSourceUri("upload://report_input.csv");
        job.setProcessId("process-1");
        job.setStatus("COMPLETED");
        job.setTotalRecords(100L);
        job.setProcessedRecords(100L);
        job.setSuccessfulRecords(98L);
        job.setFailedRecords(2L);
        bulkJobRepository.save(job);

        mockMvc.perform(get("/api/v1/user/jobs/{jobId}/report", "job-report-test"))
            .andExpect(status().isOk())
            .andExpect(content().contentType("text/csv"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("Job ID,File Name,Status,Total Records")));
    }

    @Test
    @DisplayName("Retries an individual record with mode FROM_FAILED_STEP and FROM_START")
    void shouldRetryIndividualRecord() throws Exception {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-retry-rec-test");
        job.setFileName("retry_rec.csv");
        job.setSourceUri("upload://retry_rec.csv");
        job.setProcessId("process-1");
        job.setStatus("COMPLETED_WITH_ERRORS");
        job.setTotalRecords(10L);
        job.setProcessedRecords(10L);
        job.setSuccessfulRecords(9L);
        job.setFailedRecords(1L);
        bulkJobRepository.save(job);

        // Retry from failed step
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/user/jobs/{jobId}/records/{recordId}/retry", "job-retry-rec-test", "rec-101")
                .contentType("application/json")
                .content("{\"mode\":\"FROM_FAILED_STEP\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RETRY_QUEUED"))
            .andExpect(jsonPath("$.mode").value("FROM_FAILED_STEP"))
            .andExpect(jsonPath("$.recordId").value("rec-101"));

        // Replay full pipeline from start
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/user/jobs/{jobId}/records/{recordId}/retry", "job-retry-rec-test", "rec-101")
                .contentType("application/json")
                .content("{\"mode\":\"FROM_START\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RETRY_QUEUED"))
            .andExpect(jsonPath("$.mode").value("FROM_START"));
    }

    @Test
    @DisplayName("Retries a batch and triggers force-execute on End Node barrier")
    void shouldRetryBatchAndForceExecuteBarrier() throws Exception {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-batch-barrier-test");
        job.setFileName("batch_barrier.csv");
        job.setSourceUri("upload://batch_barrier.csv");
        job.setProcessId("process-1");
        job.setStatus("RUNNING");
        job.setTotalRecords(100L);
        job.setProcessedRecords(50L);
        bulkJobRepository.save(job);

        // Retry batch
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/user/jobs/{jobId}/batches/{batchId}/retry", "job-batch-barrier-test", "batch-1")
                .contentType("application/json")
                .content("{\"mode\":\"FROM_FAILED_STEP\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RETRY_QUEUED"))
            .andExpect(jsonPath("$.batchId").value("batch-1"));

        // Force execute barrier
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/user/jobs/{jobId}/barrier/force-execute", "job-batch-barrier-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("BARRIER_RELEASED"));
    }
}

