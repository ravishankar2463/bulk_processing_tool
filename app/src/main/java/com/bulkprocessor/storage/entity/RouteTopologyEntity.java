package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "route_topology")
public class RouteTopologyEntity {

    @Id
    @Column(name = "topology_id", length = 64)
    private String topologyId;

    @Column(name = "route_id", nullable = false, unique = true, length = 64)
    private String routeId;

    @Column(name = "nodes_json", nullable = false, columnDefinition = "TEXT")
    private String nodesJson;

    @Column(name = "edges_json", nullable = false, columnDefinition = "TEXT")
    private String edgesJson;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    // Getters and Setters
    public String getTopologyId() { return topologyId; }
    public void setTopologyId(String topologyId) { this.topologyId = topologyId; }

    public String getRouteId() { return routeId; }
    public void setRouteId(String routeId) { this.routeId = routeId; }

    public String getNodesJson() { return nodesJson; }
    public void setNodesJson(String nodesJson) { this.nodesJson = nodesJson; }

    public String getEdgesJson() { return edgesJson; }
    public void setEdgesJson(String edgesJson) { this.edgesJson = edgesJson; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
