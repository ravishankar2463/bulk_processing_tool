package com.bulkprocessor.service;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.dynamic.compiler.DynamicScriptCompiler;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.entity.ProcessDefinitionEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.ComponentInstanceRepository;
import com.bulkprocessor.storage.repository.ProcessDefinitionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BulkProcessingWorkerServiceTest {

    @Mock
    private BulkJobRepository bulkJobRepository;

    @Mock
    private BulkRecordErrorRepository bulkRecordErrorRepository;

    @Mock
    private ProcessDefinitionRepository processDefinitionRepository;

    @Mock
    private ComponentInstanceRepository componentInstanceRepository;

    private DynamicScriptCompiler scriptCompiler;
    private BulkReportService bulkReportService;
    private BulkProcessingWorkerService workerService;

    @BeforeEach
    void setUp() {
        scriptCompiler = new DynamicScriptCompiler();
        bulkReportService = new BulkReportService();
        workerService = new BulkProcessingWorkerService(
            bulkJobRepository,
            bulkRecordErrorRepository,
            processDefinitionRepository,
            componentInstanceRepository,
            scriptCompiler,
            bulkReportService
        );
    }

    @Test
    @DisplayName("Should process batch, execute dynamic validator, record errors, and update job metrics")
    void testProcessBatchWithValidatorAndErrors() throws Exception {
        String jobId = "job-worker-1";
        String processId = "proc-customer-ingest";

        BulkJobEntity job = new BulkJobEntity();
        job.setJobId(jobId);
        job.setProcessId(processId);
        job.setStatus("PROCESSING");
        job.setProcessedRecords(0L);
        job.setSuccessfulRecords(0L);
        job.setFailedRecords(0L);

        when(bulkJobRepository.findById(jobId)).thenReturn(Optional.of(job));

        ProcessDefinitionEntity procDef = new ProcessDefinitionEntity();
        procDef.setProcessId(processId);
        procDef.setName("Customer Ingestion");

        ComponentInstanceEntity validatorComponent = new ComponentInstanceEntity();
        validatorComponent.setInstanceId("val-email-check");
        validatorComponent.setComponentType("VALIDATOR");
        validatorComponent.setLanguage("JAVA");
        validatorComponent.setSourceCode(
            "if (!record.containsKey(\"email\") || !((String)record.get(\"email\")).contains(\"@\")) {" +
            "    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(\"INVALID_EMAIL\", \"Valid email required\");" +
            "}" +
            "return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();"
        );

        when(processDefinitionRepository.findById(processId)).thenReturn(Optional.of(procDef));
        when(componentInstanceRepository.findByComponentTypeAndIsActiveTrue("VALIDATOR"))
            .thenReturn(List.of(validatorComponent));

        // Create 2 records: 1 valid, 1 invalid
        RecordItem<Map<String, Object>> rec1 = new RecordItem<>("rec-1", 1L, 0, Map.of("id", "101", "email", "john@example.com"), Map.of());
        RecordItem<Map<String, Object>> rec2 = new RecordItem<>("rec-2", 2L, 0, Map.of("id", "102", "email", "invalid-email"), Map.of());

        FileBatch<Map<String, Object>> batch = new FileBatch<>(
            "batch-01",
            jobId,
            0,
            1,
            List.of(rec1, rec2),
            true // isLastBatch
        );

        workerService.processBatch(batch);

        // Verify error persisted for rec2
        ArgumentCaptor<BulkRecordErrorEntity> errorCaptor = ArgumentCaptor.forClass(BulkRecordErrorEntity.class);
        verify(bulkRecordErrorRepository).save(errorCaptor.capture());
        BulkRecordErrorEntity savedError = errorCaptor.getValue();
        assertThat(savedError.getJobId()).isEqualTo(jobId);
        assertThat(savedError.getSequenceNumber()).isEqualTo(2L);
        assertThat(savedError.getErrorCode()).isEqualTo("INVALID_EMAIL");

        // Verify job updated
        verify(bulkJobRepository).save(job);
        assertThat(job.getProcessedRecords()).isEqualTo(2L);
        assertThat(job.getSuccessfulRecords()).isEqualTo(1L);
        assertThat(job.getFailedRecords()).isEqualTo(1L);
        assertThat(job.getStatus()).isEqualTo("COMPLETED");
        assertThat(job.getEndTime()).isNotNull();
    }
}
