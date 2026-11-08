package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "bulk_job")
public class BulkJobEntity {

    @Id
    @Column(name = "job_id", length = 64)
    private String jobId;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "source_uri", nullable = false, columnDefinition = "TEXT")
    private String sourceUri;

    @Column(name = "process_id", nullable = false, length = 64)
    private String processId;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "total_records")
    private Long totalRecords = 0L;

    @Column(name = "processed_records")
    private Long processedRecords = 0L;

    @Column(name = "successful_records")
    private Long successfulRecords = 0L;

    @Column(name = "failed_records")
    private Long failedRecords = 0L;

    @Column(name = "stage", length = 32)
    private String stage = "DONE";

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes = 0L;

    @Column(name = "detected_encoding", length = 32)
    private String detectedEncoding = "UTF-8";

    @Column(name = "detected_delimiter", length = 16)
    private String detectedDelimiter = ",";

    @Column(name = "checksum_sha256", length = 128)
    private String checksumSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    @Column(name = "loom_thread_allocation", length = 64)
    private String loomThreadAllocation = "VirtualThread-Worker-1";

    @Column(name = "start_time")
    private Instant startTime = Instant.now();

    @Column(name = "end_time")
    private Instant endTime;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    // Getters and Setters
    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    @com.fasterxml.jackson.annotation.JsonProperty("id")
    public String getId() { return jobId; }

    @com.fasterxml.jackson.annotation.JsonProperty("submittedAt")
    public Instant getSubmittedAt() { return startTime; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getSourceUri() { return sourceUri; }
    public void setSourceUri(String sourceUri) { this.sourceUri = sourceUri; }

    public String getProcessId() { return processId; }
    public void setProcessId(String processId) { this.processId = processId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getTotalRecords() { return totalRecords; }
    public void setTotalRecords(Long totalRecords) { this.totalRecords = totalRecords; }

    public Long getProcessedRecords() { return processedRecords; }
    public void setProcessedRecords(Long processedRecords) { this.processedRecords = processedRecords; }

    public Long getSuccessfulRecords() { return successfulRecords; }
    public void setSuccessfulRecords(Long successfulRecords) { this.successfulRecords = successfulRecords; }

    public Long getFailedRecords() { return failedRecords; }
    public void setFailedRecords(Long failedRecords) { this.failedRecords = failedRecords; }

    public Instant getStartTime() { return startTime; }
    public void setStartTime(Instant startTime) { this.startTime = startTime; }

    public Instant getEndTime() { return endTime; }
    public void setEndTime(Instant endTime) { this.endTime = endTime; }

    public String getStage() { return stage != null ? stage : "DONE"; }
    public void setStage(String stage) { this.stage = stage; }

    public Long getFileSizeBytes() { return fileSizeBytes != null ? fileSizeBytes : 0L; }
    public void setFileSizeBytes(Long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }

    public String getDetectedEncoding() { return detectedEncoding != null ? detectedEncoding : "UTF-8"; }
    public void setDetectedEncoding(String detectedEncoding) { this.detectedEncoding = detectedEncoding; }

    public String getDetectedDelimiter() { return detectedDelimiter != null ? detectedDelimiter : ","; }
    public void setDetectedDelimiter(String detectedDelimiter) { this.detectedDelimiter = detectedDelimiter; }

    public String getChecksumSha256() { return checksumSha256 != null ? checksumSha256 : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; }
    public void setChecksumSha256(String checksumSha256) { this.checksumSha256 = checksumSha256; }

    public String getLoomThreadAllocation() { return loomThreadAllocation != null ? loomThreadAllocation : "VirtualThread-Worker-1"; }
    public void setLoomThreadAllocation(String loomThreadAllocation) { this.loomThreadAllocation = loomThreadAllocation; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}

