package com.bulkprocessor.dto;

public record ConnectorDefinitionDto(
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
    public ConnectorDefinitionDto(
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
}
