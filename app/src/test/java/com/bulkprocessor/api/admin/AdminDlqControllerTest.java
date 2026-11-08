package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin DLQ Console Controller Integration Tests")
class AdminDlqControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BulkRecordErrorRepository bulkRecordErrorRepository;

    @Test
    @DisplayName("Lists all DLQ failed records and allows filtering by jobId")
    void shouldListDlqErrors() throws Exception {
        BulkRecordErrorEntity err = new BulkRecordErrorEntity();
        err.setJobId("job-dlq-test-1");
        err.setBatchId("batch-101");
        err.setSequenceNumber(5L);
        err.setStepName("VALIDATOR");
        err.setErrorCode("SCHEMA_MISMATCH");
        err.setErrorMessage("Age must be positive");
        err.setRawPayload("{\"id\":5,\"age\":-3}");
        err.setCreatedAt(Instant.now());
        bulkRecordErrorRepository.save(err);

        mockMvc.perform(get("/api/v1/admin/dlq")
                .param("jobId", "job-dlq-test-1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].jobId").value("job-dlq-test-1"))
            .andExpect(jsonPath("$[0].errorCode").value("SCHEMA_MISMATCH"));
    }

    @Test
    @DisplayName("Resubmits a failed DLQ record for re-processing")
    void shouldResubmitDlqRecord() throws Exception {
        BulkRecordErrorEntity err = new BulkRecordErrorEntity();
        err.setJobId("job-dlq-test-2");
        err.setBatchId("batch-102");
        err.setSequenceNumber(18L);
        err.setStepName("PROCESSOR");
        err.setErrorCode("TIMEOUT");
        err.setErrorMessage("External API timed out");
        err.setRawPayload("{\"id\":18,\"data\":\"retry-payload\"}");
        err.setCreatedAt(Instant.now());
        BulkRecordErrorEntity saved = bulkRecordErrorRepository.save(err);

        mockMvc.perform(post("/api/v1/admin/dlq/{errorId}/resubmit", saved.getErrorId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("RESUBMITTED"))
            .andExpect(jsonPath("$.errorId").value(saved.getErrorId()));
    }
}

