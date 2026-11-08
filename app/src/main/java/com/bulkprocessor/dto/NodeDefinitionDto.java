package com.bulkprocessor.dto;

/**
 * Unified Node Definition contract.
 * Everything in the processing topology is a Node (START, MIDDLE, END, or SUB-DAG).
 */
public record NodeDefinitionDto(
    String definitionId,
    String name,
    String category,
    String protocol,
    String description,
    String icon,
    boolean composite,
    String propertyManifest,
    boolean builtIn,
    int version,
    String streamRole
) {
    public NodeDefinitionDto(
        String definitionId,
        String name,
        String category,
        String protocol,
        String description,
        String icon,
        boolean composite,
        String propertyManifest,
        boolean builtIn,
        int version
    ) {
        this(definitionId, name, category, protocol, description, icon, composite, propertyManifest, builtIn, version,
            "SOURCE".equalsIgnoreCase(category) ? "START" : ("SINK".equalsIgnoreCase(category) ? "END" : "MIDDLE"));
    }

    public static NodeDefinitionDto fromConnector(ConnectorDefinitionDto dto) {
        if (dto == null) return null;
        return new NodeDefinitionDto(
            dto.definitionId(),
            dto.name(),
            dto.category(),
            dto.protocol(),
            dto.description(),
            dto.icon(),
            dto.composite(),
            dto.propertyManifest(),
            dto.builtIn(),
            dto.version(),
            dto.streamRole()
        );
    }

    public ConnectorDefinitionDto toConnector() {
        return new ConnectorDefinitionDto(
            definitionId,
            name,
            category,
            protocol,
            description,
            icon,
            composite,
            propertyManifest,
            builtIn,
            version,
            streamRole
        );
    }
}
