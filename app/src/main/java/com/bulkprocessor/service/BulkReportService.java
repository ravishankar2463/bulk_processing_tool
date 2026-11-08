package com.bulkprocessor.service;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Generates audit summary and error reports for executed bulk processing jobs.
 * Enforces RFC 4180 compliance and CWE-1236 CSV/Formula Injection neutralization.
 */
@Service
public class BulkReportService {

    private static final Pattern FORMULA_TRIGGER_PATTERN = Pattern.compile("^[\\s\\uFEFF]*[=+\\-@\\t\\r]");

    public String generateCsvReport(BulkJobEntity job, List<BulkRecordErrorEntity> errors) {
        StringBuilder sb = new StringBuilder();

        // 1. Tabular Summary Line (matches standard CSV headers)
        sb.append("Job ID,File Name,Status,Total Records,Processed Records,Successful Records,Failed Records,Start Time\n");
        sb.append(String.format("%s,%s,%s,%d,%d,%d,%d,%s\n\n",
            escapeCsv(job.getJobId()),
            escapeCsv(job.getFileName()),
            escapeCsv(job.getStatus()),
            job.getTotalRecords() != null ? job.getTotalRecords() : 0,
            job.getProcessedRecords() != null ? job.getProcessedRecords() : 0,
            job.getSuccessfulRecords() != null ? job.getSuccessfulRecords() : 0,
            job.getFailedRecords() != null ? job.getFailedRecords() : 0,
            job.getStartTime() != null ? escapeCsv(job.getStartTime().toString()) : ""
        ));

        // 2. Executive Details
        sb.append("=========================================\n");
        sb.append("Job Execution Summary\n");
        sb.append("=========================================\n");
        sb.append("Job ID: ").append(job.getJobId()).append("\n");
        sb.append("File Name: ").append(job.getFileName()).append("\n");
        sb.append("Process Definition: ").append(job.getProcessId() != null ? job.getProcessId() : "N/A").append("\n");
        sb.append("Status: ").append(job.getStatus()).append("\n");
        sb.append("Total Records: ").append(job.getTotalRecords() != null ? job.getTotalRecords() : 0).append("\n");
        sb.append("Processed Records: ").append(job.getProcessedRecords() != null ? job.getProcessedRecords() : 0).append("\n");
        sb.append("Success: ").append(job.getSuccessfulRecords() != null ? job.getSuccessfulRecords() : 0).append("\n");
        sb.append("Failed: ").append(job.getFailedRecords() != null ? job.getFailedRecords() : 0).append("\n");
        sb.append("Start Time: ").append(job.getStartTime() != null ? job.getStartTime().toString() : "N/A").append("\n");
        sb.append("End Time: ").append(job.getEndTime() != null ? job.getEndTime().toString() : "N/A").append("\n\n");

        // 3. Error Breakdown Section
        sb.append("=========================================\n");
        sb.append("Record Errors Breakdown\n");
        sb.append("=========================================\n");

        if (errors == null || errors.isEmpty()) {
            sb.append("No record-level errors recorded for this job.\n");
        } else {
            sb.append("Row/Seq,Step,Error Code,Error Message,Raw Payload\n");
            for (BulkRecordErrorEntity err : errors) {
                sb.append(err.getSequenceNumber() != null ? err.getSequenceNumber() : 0).append(",")
                  .append(escapeCsv(err.getStepName())).append(",")
                  .append(escapeCsv(err.getErrorCode())).append(",")
                  .append(escapeCsv(err.getErrorMessage())).append(",")
                  .append(escapeCsv(err.getRawPayload())).append("\n");
            }
        }

        return sb.toString();
    }

    /**
     * Sanitizes and escapes CSV cell values.
     * Mitigates CWE-1236 formula injection by escaping trigger characters with a leading single quote.
     * Complies with RFC 4180 quoting rules.
     */
    public String escapeCsv(String value) {
        if (value == null) {
            return "";
        }

        // Neutralize formula triggers (CWE-1236)
        boolean isFormula = FORMULA_TRIGGER_PATTERN.matcher(value).find();
        String safeValue = isFormula ? "'" + value : value;

        // Escape double quotes and enclose in quotes if contains delimiter, quote, or newline
        if (isFormula || safeValue.contains(",") || safeValue.contains("\"") || safeValue.contains("\n") || safeValue.contains("\r")) {
            return "\"" + safeValue.replace("\"", "\"\"") + "\"";
        }

        return safeValue;
    }
}
