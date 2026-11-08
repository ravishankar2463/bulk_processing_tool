package com.bulkprocessor.dto;

/**
 * Unified Node Instance contract.
 * Represents a configured instance of a topological node.
 */
public record NodeInstanceDto(
    String instanceId,
    String definitionId,
    String name,
    String description,
    String configuration,
    int version,
    boolean active,
    String createdBy
) {
    public static NodeInstanceDto fromConnector(ConnectorInstanceDto dto) {
        if (dto == null) return null;
        return new NodeInstanceDto(
            dto.instanceId(),
            dto.definitionId(),
            dto.name(),
            dto.description(),
            dto.configuration(),
            dto.version(),
            dto.active(),
            dto.createdBy()
        );
    }

    public ConnectorInstanceDto toConnector() {
        return new ConnectorInstanceDto(
            instanceId,
            definitionId,
            name,
            description,
            configuration,
            version,
            active,
            createdBy
        );
    }
}
