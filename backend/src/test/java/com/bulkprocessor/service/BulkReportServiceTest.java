package com.bulkprocessor.service;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BulkReportServiceTest {

    private final BulkReportService reportService = new BulkReportService();

    @Test
    @DisplayName("Should generate comprehensive CSV report with job metrics and error rows")
    void testGenerateCsvReport() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-xyz-101");
        job.setFileName("users.csv");
        job.setStatus("COMPLETED");
        job.setTotalRecords(100L);
        job.setProcessedRecords(100L);
        job.setSuccessfulRecords(98L);
        job.setFailedRecords(2L);
        job.setStartTime(Instant.parse("2026-11-04T10:00:00Z"));
        job.setEndTime(Instant.parse("2026-11-04T10:00:05Z"));

        BulkRecordErrorEntity err1 = new BulkRecordErrorEntity();
        err1.setJobId("job-xyz-101");
        err1.setBatchId("batch-001");
        err1.setSequenceNumber(12L);
        err1.setStepName("EMAIL_VALIDATOR");
        err1.setErrorCode("INVALID_FORMAT");
        err1.setErrorMessage("Email missing @ sign");
        err1.setRawPayload("{\"id\":12,\"email\":\"bad-email\"}");

        BulkRecordErrorEntity err2 = new BulkRecordErrorEntity();
        err2.setJobId("job-xyz-101");
        err2.setBatchId("batch-001");
        err2.setSequenceNumber(45L);
        err2.setStepName("TAX_PROCESSOR");
        err2.setErrorCode("CALC_OVERFLOW");
        err2.setErrorMessage("Amount out of bounds");
        err2.setRawPayload("{\"id\":45,\"amount\":-999}");

        String csvReport = reportService.generateCsvReport(job, List.of(err1, err2));

        assertThat(csvReport).isNotBlank();
        assertThat(csvReport).contains("Job Execution Summary");
        assertThat(csvReport).contains("job-xyz-101");
        assertThat(csvReport).contains("users.csv");
        assertThat(csvReport).contains("Total Records: 100");
        assertThat(csvReport).contains("Success: 98");
        assertThat(csvReport).contains("Failed: 2");
        assertThat(csvReport).contains("Row/Seq,Step,Error Code,Error Message,Raw Payload");
        assertThat(csvReport).contains("12,EMAIL_VALIDATOR,INVALID_FORMAT,Email missing @ sign");
        assertThat(csvReport).contains("45,TAX_PROCESSOR,CALC_OVERFLOW,Amount out of bounds");
    }

    @Test
    @DisplayName("Should generate empty error section when job has zero failures")
    void testGenerateCsvReportZeroFailures() {
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("job-clean-202");
        job.setFileName("clean.csv");
        job.setStatus("COMPLETED");
        job.setTotalRecords(50L);
        job.setProcessedRecords(50L);
        job.setSuccessfulRecords(50L);
        job.setFailedRecords(0L);

        String csvReport = reportService.generateCsvReport(job, List.of());

        assertThat(csvReport).contains("job-clean-202");
        assertThat(csvReport).contains("No record-level errors recorded for this job.");
    }
}

