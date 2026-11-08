package com.bulkprocessor.dto;

public record ConnectorInstanceDto(
    String instanceId,
    String definitionId,
    String name,
    String description,
    String configuration,
    int version,
    boolean active,
    String createdBy
) {}
