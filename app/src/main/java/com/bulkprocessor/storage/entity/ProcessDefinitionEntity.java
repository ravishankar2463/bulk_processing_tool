package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "process_definition")
public class ProcessDefinitionEntity {

    @Id
    @Column(name = "process_id", length = 64)
    private String processId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "input_format", nullable = false, length = 32)
    private String inputFormat = "CSV";

    @Column(name = "splitter_instance_id", length = 64)
    private String splitterInstanceId;

    @Column(name = "report_writer_instance_id", length = 64)
    private String reportWriterInstanceId;

    @Column(name = "concurrency_config", columnDefinition = "TEXT")
    private String concurrencyConfig;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    // Getters and Setters
    public String getProcessId() { return processId; }
    public void setProcessId(String processId) { this.processId = processId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getInputFormat() { return inputFormat; }
    public void setInputFormat(String inputFormat) { this.inputFormat = inputFormat; }

    public String getSplitterInstanceId() { return splitterInstanceId; }
    public void setSplitterInstanceId(String splitterInstanceId) { this.splitterInstanceId = splitterInstanceId; }

    public String getReportWriterInstanceId() { return reportWriterInstanceId; }
    public void setReportWriterInstanceId(String reportWriterInstanceId) { this.reportWriterInstanceId = reportWriterInstanceId; }

    public String getConcurrencyConfig() { return concurrencyConfig; }
    public void setConcurrencyConfig(String concurrencyConfig) { this.concurrencyConfig = concurrencyConfig; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

