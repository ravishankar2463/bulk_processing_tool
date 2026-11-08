package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "route_config")
public class RouteConfigEntity {

    @Id
    @Column(name = "route_id", length = 64)
    private String routeId;

    @Column(name = "route_name", nullable = false, length = 128)
    private String routeName;

    @Column(name = "route_type", nullable = false, length = 32)
    private String routeType;

    @Column(name = "endpoint_uri", nullable = false, length = 512)
    private String endpointUri;

    @Column(name = "processed_uri", length = 512)
    private String processedUri;

    @Column(name = "error_uri", length = 512)
    private String errorUri;

    @Column(name = "cron_expression", length = 64)
    private String cronExpression;

    @Column(name = "polling_interval_ms")
    private Integer pollingIntervalMs = 5000;

    @Column(name = "credentials_encrypted", columnDefinition = "TEXT")
    private String credentialsEncrypted;

    @Column(name = "parameters", columnDefinition = "TEXT")
    private String parameters;

    @Column(name = "process_id", nullable = false, length = 64)
    private String processId;

    @Column(name = "status", nullable = false, length = 32)
    private String status = "ACTIVE";

    @Column(name = "retention_days", nullable = false)
    private Integer retentionDays = 30;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_by", length = 64)
    private String createdBy;

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    // Getters and Setters
    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getRouteName() { return routeName; }
    public void setRouteName(String routeName) { this.routeName = routeName; }

    public String getRouteType() { return routeType; }
    public void setRouteType(String routeType) { this.routeType = routeType; }

    public String getEndpointUri() { return endpointUri; }
    public void setEndpointUri(String endpointUri) { this.endpointUri = endpointUri; }

    public String getProcessedUri() { return processedUri; }
    public void setProcessedUri(String processedUri) { this.processedUri = processedUri; }

    public String getErrorUri() { return errorUri; }
    public void setErrorUri(String errorUri) { this.errorUri = errorUri; }

    public String getCronExpression() { return cronExpression; }
    public void setCronExpression(String cronExpression) { this.cronExpression = cronExpression; }

    public Integer getPollingIntervalMs() { return pollingIntervalMs; }
    public void setPollingIntervalMs(Integer pollingIntervalMs) { this.pollingIntervalMs = pollingIntervalMs; }

    public String getCredentialsEncrypted() { return credentialsEncrypted; }
    public void setCredentialsEncrypted(String credentialsEncrypted) { this.credentialsEncrypted = credentialsEncrypted; }

    public String getParameters() { return parameters; }
    public void setParameters(String parameters) { this.parameters = parameters; }

    public String getProcessId() { return processId; }
    public void setProcessId(String processId) { this.processId = processId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getRetentionDays() { return retentionDays != null ? retentionDays : 30; }
    public void setRetentionDays(Integer retentionDays) {
        if (retentionDays == null) {
            this.retentionDays = 30;
        } else {
            // Hard ceiling invariant: min 1, max 90 days (3 months ceiling)
            this.retentionDays = Math.max(1, Math.min(90, retentionDays));
        }
    }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

