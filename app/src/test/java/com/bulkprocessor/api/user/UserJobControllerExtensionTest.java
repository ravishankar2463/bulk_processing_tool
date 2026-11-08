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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("User Job Controller Extension Integration Tests (Batch, Lifecycle, Diagnostics)")
class UserJobControllerExtensionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BulkJobRepository bulkJobRepository;

    @Test
    @DisplayName("Uploads multiple CSV files via batch-upload endpoint")
    void shouldBatchUploadFiles() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
            "files", "batch1.csv", "text/csv", "id,name\n101,Acme Corp\n".getBytes()
        );
        MockMultipartFile file2 = new MockMultipartFile(
            "files", "batch2.csv", "text/csv", "id,name\n102,Globex Inc\n".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/user/jobs/batch-upload")
                .file(file1)
                .file(file2)
                .param("processId", "proc-customer-master"))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].fileName").value("batch1.csv"))
            .andExpect(jsonPath("$[0].processId").value("proc-customer-master"))
            .andExpect(jsonPath("$[1].fileName").value("batch2.csv"))
            .andExpect(jsonPath("$[1].processId").value("proc-customer-master"));
    }

    @Test
    @DisplayName("Retrieves jobs filtered by processId query parameter")
    void shouldFilterJobsByProcessId() throws Exception {
        mockMvc.perform(get("/api/v1/user/jobs").param("processId", "proc-customer-master"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))))
            .andExpect(jsonPath("$[*].processId", everyItem(equalTo("proc-customer-master"))));
    }

    @Test
    @DisplayName("Executes full job lifecycle: pause, resume, retry, and cancel")
    void shouldExecuteJobLifecycleActions() throws Exception {
        String testJobId = "job-lifecycle-integration-" + System.currentTimeMillis();
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId(testJobId);
        job.setFileName("lifecycle_test.csv");
        job.setSourceUri("upload://lifecycle_test.csv");
        job.setProcessId("proc-customer-master");
        job.setStatus("PROCESSING");
        job.setStage("ENRICHMENT");
        job.setTotalRecords(100L);
        job.setProcessedRecords(50L);
        job.setSuccessfulRecords(45L);
        job.setFailedRecords(5L);
        job.setStartTime(Instant.now());
        bulkJobRepository.save(job);

        // 1. Pause
        mockMvc.perform(post("/api/v1/user/jobs/{jobId}/pause", testJobId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PAUSED"));

        // 2. Resume
        mockMvc.perform(post("/api/v1/user/jobs/{jobId}/resume", testJobId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PROCESSING"));

        // 3. Retry
        mockMvc.perform(post("/api/v1/user/jobs/{jobId}/retry", testJobId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PROCESSING"))
            .andExpect(jsonPath("$.failedRecords").value(0));

        // 4. Cancel
        mockMvc.perform(post("/api/v1/user/jobs/{jobId}/cancel", testJobId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("FAILED"));
    }

    @Test
    @DisplayName("Retrieves complete diagnostics data with metadata, stage latencies, batch chunks, and record errors")
    void shouldGetJobDiagnostics() throws Exception {
        mockMvc.perform(get("/api/v1/user/jobs/{jobId}/diagnostics", "job-cmo-001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.jobId").value("job-cmo-001"))
            .andExpect(jsonPath("$.metadata.sizeBytes").value(4528190))
            .andExpect(jsonPath("$.metadata.encoding").value("UTF-8"))
            .andExpect(jsonPath("$.metadata.delimiter").value(","))
            .andExpect(jsonPath("$.metadata.checksum").value("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"))
            .andExpect(jsonPath("$.metadata.loomThread").value("virtual-worker-101-loom-04"))
            .andExpect(jsonPath("$.stageLatencies", hasSize(4)))
            .andExpect(jsonPath("$.stageLatencies[0].stepName").value("Streaming CSV Splitter"))
            .andExpect(jsonPath("$.stageLatencies[1].stepName").value("Dynamic Schema Validator"))
            .andExpect(jsonPath("$.stageLatencies[2].stepName").value("Enrichment & Transformation"))
            .andExpect(jsonPath("$.stageLatencies[3].stepName").value("Audit Report Sink"))
            .andExpect(jsonPath("$.batchChunks", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$.batchChunks[0].recordCount").value(500))
            .andExpect(jsonPath("$.batchChunks[0].partitionId").value(containsString("partition-")))
            .andExpect(jsonPath("$.errorRecords", hasSize(greaterThan(0))))
            .andExpect(jsonPath("$.errorRecords[0].errorCode").value(containsString("INVALID_EMAIL_SYNTAX")))
            .andExpect(jsonPath("$.errorRecords[0].errorMessage").value(containsString("RFC 5322")));
    }

    @Test
    @DisplayName("Returns 404 when querying diagnostics for a non-existent jobId")
    void shouldReturn404ForNonExistentDiagnostics() throws Exception {
        mockMvc.perform(get("/api/v1/user/jobs/{jobId}/diagnostics", "non-existent-job-xyz"))
            .andExpect(status().isNotFound());
    }
}

