package com.bulkprocessor.service;

import com.bulkprocessor.dto.RouteTopologyDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyEdgeDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyNodeDto;
import com.bulkprocessor.storage.entity.RouteTopologyEntity;
import com.bulkprocessor.storage.repository.RouteTopologyRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class RouteTopologyService {

    private static final Logger log = LoggerFactory.getLogger(RouteTopologyService.class);
    private final RouteTopologyRepository topologyRepository;
    private final ObjectMapper objectMapper;

    public RouteTopologyService(RouteTopologyRepository topologyRepository, ObjectMapper objectMapper) {
        this.topologyRepository = topologyRepository;
        this.objectMapper = objectMapper;
    }

    public RouteTopologyDto getTopology(String routeId) {
        return topologyRepository.findByRouteId(routeId)
            .map(this::toDto)
            .orElseGet(() -> synthesizeDefaultTopology(routeId));
    }

    @Transactional
    public RouteTopologyDto saveTopology(RouteTopologyDto dto) {
        validateTopologyGraph(dto);

        String topologyId = (dto.topologyId() != null && !dto.topologyId().isBlank())
            ? dto.topologyId()
            : "top-" + dto.routeId();

        RouteTopologyEntity entity = topologyRepository.findByRouteId(dto.routeId())
            .orElseGet(() -> {
                RouteTopologyEntity e = new RouteTopologyEntity();
                e.setTopologyId(topologyId);
                e.setRouteId(dto.routeId());
                e.setCreatedAt(Instant.now());
                return e;
            });

        try {
            entity.setNodesJson(objectMapper.writeValueAsString(dto.nodes()));
            entity.setEdgesJson(objectMapper.writeValueAsString(dto.edges()));
            entity.setVersion(dto.version() > 0 ? dto.version() : entity.getVersion() + 1);
            entity.setUpdatedAt(Instant.now());
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize route topology: " + e.getMessage(), e);
        }

        RouteTopologyEntity saved = topologyRepository.save(entity);
        log.info("Saved route topology for route: {}, nodes={}, edges={}", dto.routeId(), dto.nodes().size(), dto.edges().size());
        return toDto(saved);
    }

    public List<String> validateTopologyGraph(RouteTopologyDto dto) {
        List<String> errors = new ArrayList<>();
        if (dto.nodes() == null || dto.nodes().isEmpty()) {
            errors.add("Topology must contain at least one node.");
            return errors;
        }

        Set<String> nodeIds = new HashSet<>();
        Map<String, TopologyNodeDto> nodeMap = new HashMap<>();
        boolean hasStart = false;
        boolean hasEnd = false;

        for (TopologyNodeDto node : dto.nodes()) {
            if (!nodeIds.add(node.id())) {
                errors.add("Duplicate node ID detected: " + node.id());
            }
            nodeMap.put(node.id(), node);
            String role = node.streamRole() != null ? node.streamRole() :
                ("SOURCE".equalsIgnoreCase(node.category()) ? "START" : ("SINK".equalsIgnoreCase(node.category()) ? "END" : "MIDDLE"));
            if ("START".equalsIgnoreCase(role)) {
                hasStart = true;
            } else if ("END".equalsIgnoreCase(role)) {
                hasEnd = true;
            }
        }

        if (!hasStart) {
            errors.add("Topology stream must contain at least one START connector (stream source).");
        }
        if (!hasEnd) {
            errors.add("Topology stream must contain at least one END connector (stream sink/terminal).");
        }

        if (dto.edges() != null) {
            for (TopologyEdgeDto edge : dto.edges()) {
                if (!nodeIds.contains(edge.fromNodeId())) {
                    errors.add("Edge references non-existent source node: " + edge.fromNodeId());
                } else {
                    TopologyNodeDto fromNode = nodeMap.get(edge.fromNodeId());
                    String fromRole = fromNode.streamRole() != null ? fromNode.streamRole() :
                        ("SOURCE".equalsIgnoreCase(fromNode.category()) ? "START" : ("SINK".equalsIgnoreCase(fromNode.category()) ? "END" : "MIDDLE"));
                    if ("END".equalsIgnoreCase(fromRole)) {
                        errors.add("End connector (terminal) cannot have outgoing stream connections: node " + edge.fromNodeId());
                    }
                }

                if (!nodeIds.contains(edge.toNodeId())) {
                    errors.add("Edge references non-existent target node: " + edge.toNodeId());
                } else {
                    TopologyNodeDto toNode = nodeMap.get(edge.toNodeId());
                    String toRole = toNode.streamRole() != null ? toNode.streamRole() :
                        ("SOURCE".equalsIgnoreCase(toNode.category()) ? "START" : ("SINK".equalsIgnoreCase(toNode.category()) ? "END" : "MIDDLE"));
                    if ("START".equalsIgnoreCase(toRole)) {
                        errors.add("Start connector (ingress source) cannot receive incoming stream connections: node " + edge.toNodeId());
                    }
                }
            }
        }

        return errors;
    }

    private RouteTopologyDto toDto(RouteTopologyEntity entity) {
        try {
            List<TopologyNodeDto> nodes = objectMapper.readValue(
                entity.getNodesJson(),
                new TypeReference<List<TopologyNodeDto>>() {}
            );
            List<TopologyEdgeDto> edges = objectMapper.readValue(
                entity.getEdgesJson(),
                new TypeReference<List<TopologyEdgeDto>>() {}
            );
            return new RouteTopologyDto(
                entity.getTopologyId(),
                entity.getRouteId(),
                nodes,
                edges,
                entity.getVersion()
            );
        } catch (Exception e) {
            log.warn("Failed to parse stored topology for route {}. Falling back to synthesized graph.", entity.getRouteId(), e);
            return synthesizeDefaultTopology(entity.getRouteId());
        }
    }

    private RouteTopologyDto synthesizeDefaultTopology(String routeId) {
        List<TopologyNodeDto> nodes = List.of(
            new TopologyNodeDto(
                "node-source-csv",
                "CONNECTOR",
                "conn-def-csv",
                "CSV Ingestion Connector",
                "Manual / S3 File Source",
                "SOURCE",
                100,
                140,
                List.of(),
                List.of("out_file_stream"),
                Map.of(
                    "sourceType", "MANUAL_UPLOAD",
                    "delimiter", ",",
                    "hasHeader", true,
                    "fields", List.of(
                        Map.of("name", "customer_id", "type", "INTEGER", "required", true),
                        Map.of("name", "name", "type", "STRING", "required", true),
                        Map.of("name", "email", "type", "STRING", "required", true),
                        Map.of("name", "balance", "type", "DECIMAL", "required", false)
                    )
                ),
                "START"
            ),
            new TopologyNodeDto(
                "node-splitter-comp",
                "COMPONENT",
                "splitter-csv-univocity",
                "Univocity Fast CSV Splitter",
                "Loom Virtual Chunk Splitter",
                "SPLITTER",
                380,
                140,
                List.of("in_file_stream"),
                List.of("out_records"),
                Map.of("batchSize", 500),
                "MIDDLE"
            ),
            new TopologyNodeDto(
                "node-rest-req",
                "CONNECTOR",
                "conn-def-rest-json",
                "JSON Request Connector",
                "POST /api/v1/enrich",
                "PROCESSOR",
                660,
                100,
                List.of("in_records"),
                List.of("out_http_req"),
                Map.of("method", "POST", "endpointUrl", "https://api.internal.corp/v1/enrich/${id}", "authType", "NONE"),
                "MIDDLE"
            ),
            new TopologyNodeDto(
                "node-rest-res",
                "CONNECTOR",
                "conn-def-rest-json",
                "JSON Response Connector",
                "JSONPath Enrichment Mapper",
                "PROCESSOR",
                940,
                100,
                List.of("in_http_req"),
                List.of("out_enriched_records"),
                Map.of("expectedStatus", List.of(200, 201), "extractMappings", Map.of("tier", "$.account_tier")),
                "MIDDLE"
            ),
            new TopologyNodeDto(
                "node-validator-comp",
                "COMPONENT",
                "val-customer-kyc",
                "Customer KYC Validator",
                "Rule & Constraint Checker",
                "VALIDATOR",
                1220,
                140,
                List.of("in_enriched_records"),
                List.of("out_validated_records"),
                Map.of("errorPolicy", "QUARANTINE_RECORD"),
                "MIDDLE"
            ),
            new TopologyNodeDto(
                "node-sink-db",
                "CONNECTOR",
                "conn-def-db-sink",
                "Database JDBC Sink",
                "Processed Records Table",
                "SINK",
                1500,
                140,
                List.of("in_validated_records"),
                List.of(),
                Map.of("targetTable", "processed_customers", "batchSize", 1000),
                "END"
            )
        );

        List<TopologyEdgeDto> edges = List.of(
            new TopologyEdgeDto("edge-1", "node-source-csv", "out_file_stream", "node-splitter-comp", "in_file_stream"),
            new TopologyEdgeDto("edge-2", "node-splitter-comp", "out_records", "node-rest-req", "in_records"),
            new TopologyEdgeDto("edge-3", "node-rest-req", "out_http_req", "node-rest-res", "in_http_req"),
            new TopologyEdgeDto("edge-4", "node-rest-res", "out_enriched_records", "node-validator-comp", "in_enriched_records"),
            new TopologyEdgeDto("edge-5", "node-validator-comp", "out_validated_records", "node-sink-db", "in_validated_records")
        );

        return new RouteTopologyDto(
            "top-" + routeId,
            routeId,
            nodes,
            edges,
            1
        );
    }
}
