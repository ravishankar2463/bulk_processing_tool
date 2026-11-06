package com.bulkprocessor.api.workspace;

import com.bulkprocessor.BulkProcessorApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Process Workspace Controller Integration Tests")
class ProcessWorkspaceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Retrieves process jobs by processId")
    void shouldGetJobsByProcessId() throws Exception {
        mockMvc.perform(get("/api/v1/processes/{processId}/jobs", "proc-customer-master"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(2))))
            .andExpect(jsonPath("$[0].processId").value("proc-customer-master"));
    }

    @Test
    @DisplayName("Uploads batch files to process workspace")
    void shouldUploadBatchToProcessWorkspace() throws Exception {
        MockMultipartFile file1 = new MockMultipartFile(
            "files", "orders_upload_1.csv", "text/csv", "orderId,sku,qty\nORD-1,SKU-A,10\n".getBytes()
        );
        MockMultipartFile file2 = new MockMultipartFile(
            "files", "orders_upload_2.csv", "text/csv", "orderId,sku,qty\nORD-2,SKU-B,25\n".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/processes/{processId}/upload", "proc-order-fulfillment")
                .file(file1)
                .file(file2))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$", hasSize(2)))
            .andExpect(jsonPath("$[0].fileName").value("orders_upload_1.csv"))
            .andExpect(jsonPath("$[0].processId").value("proc-order-fulfillment"))
            .andExpect(jsonPath("$[1].fileName").value("orders_upload_2.csv"))
            .andExpect(jsonPath("$[1].processId").value("proc-order-fulfillment"));
    }

    @Test
    @DisplayName("Uploads a single file using 'file' param to process workspace")
    void shouldUploadSingleFileToProcessWorkspace() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "file", "single_recon.csv", "text/csv", "account,amount\nACC-1,500.00\n".getBytes()
        );

        mockMvc.perform(multipart("/api/v1/processes/{processId}/upload", "proc-financial-reconciliation")
                .file(file))
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].fileName").value("single_recon.csv"))
            .andExpect(jsonPath("$[0].processId").value("proc-financial-reconciliation"));
    }

    @Test
    @DisplayName("Returns 400 Bad Request when no file or files are supplied")
    void shouldReturnBadRequestWhenNoFileProvided() throws Exception {
        mockMvc.perform(multipart("/api/v1/processes/{processId}/upload", "proc-customer-master"))
            .andExpect(status().isBadRequest());
    }
}

