package com.bulkprocessor.storage.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "connector_definition")
public class ConnectorDefinitionEntity {

    @Id
    @Column(name = "definition_id", length = 64)
    private String definitionId;

    @Column(name = "name", nullable = false, length = 128)
    private String name;

    @Column(name = "category", nullable = false, length = 32)
    private String category; // SOURCE, PROCESSOR, SINK, TRANSFORM

    @Column(name = "stream_role", length = 16)
    private String streamRole = "MIDDLE"; // START, MIDDLE, END

    @Column(name = "protocol", nullable = false, length = 32)
    private String protocol; // CSV, REST_JSON, SOAP_XML, DATABASE, KAFKA, CUSTOM

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "icon", length = 64)
    private String icon = "plug";

    @Column(name = "is_composite", nullable = false)
    private boolean composite = false;

    @Column(name = "property_manifest", nullable = false, columnDefinition = "TEXT")
    private String propertyManifest;

    @Column(name = "is_built_in", nullable = false)
    private boolean builtIn = false;

    @Column(name = "version", nullable = false)
    private int version = 1;

    @Column(name = "created_at")
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();

    // Getters and Setters
    public String getDefinitionId() { return definitionId; }
    public void setDefinitionId(String definitionId) { this.definitionId = definitionId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getStreamRole() { return streamRole; }
    public void setStreamRole(String streamRole) { this.streamRole = streamRole; }

    public String getProtocol() { return protocol; }
    public void setProtocol(String protocol) { this.protocol = protocol; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public boolean isComposite() { return composite; }
    public void setComposite(boolean composite) { this.composite = composite; }

    public String getPropertyManifest() { return propertyManifest; }
    public void setPropertyManifest(String propertyManifest) { this.propertyManifest = propertyManifest; }

    public boolean isBuiltIn() { return builtIn; }
    public void setBuiltIn(boolean builtIn) { this.builtIn = builtIn; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
