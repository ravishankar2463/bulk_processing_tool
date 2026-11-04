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
}

