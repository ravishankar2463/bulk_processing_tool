package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "bulk_job_batch")
public class BulkJobBatchEntity {

    @Id
    @Column(name = "batch_id", length = 64)
    private String batchId;

    @Column(name = "job_id", nullable = false, length = 64)
    private String jobId;

    @Column(name = "batch_index", nullable = false)
    private Integer batchIndex;

    @Column(name = "record_count", nullable = false)
    private Integer recordCount;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "duration_micros")
    private Long durationMicros = 0L;

    @Column(name = "partition_id", length = 64)
    private String partitionId;

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    public BulkJobBatchEntity() {}

    public BulkJobBatchEntity(String batchId, String jobId, Integer batchIndex, Integer recordCount, String status, Long durationMicros, String partitionId) {
        this.batchId = batchId;
        this.jobId = jobId;
        this.batchIndex = batchIndex;
        this.recordCount = recordCount;
        this.status = status;
        this.durationMicros = durationMicros;
        this.partitionId = partitionId;
        this.updatedAt = Instant.now();
    }

    public String getBatchId() { return batchId; }
    public void setBatchId(String batchId) { this.batchId = batchId; }

    public String getJobId() { return jobId; }
    public void setJobId(String jobId) { this.jobId = jobId; }

    public Integer getBatchIndex() { return batchIndex; }
    public void setBatchIndex(Integer batchIndex) { this.batchIndex = batchIndex; }

    public Integer getRecordCount() { return recordCount; }
    public void setRecordCount(Integer recordCount) { this.recordCount = recordCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getErrorSummary() { return errorSummary; }
    public void setErrorSummary(String errorSummary) { this.errorSummary = errorSummary; }

    public Long getDurationMicros() { return durationMicros != null ? durationMicros : 0L; }
    public void setDurationMicros(Long durationMicros) { this.durationMicros = durationMicros; }

    public String getPartitionId() { return partitionId != null ? partitionId : "partition-0"; }
    public void setPartitionId(String partitionId) { this.partitionId = partitionId; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

