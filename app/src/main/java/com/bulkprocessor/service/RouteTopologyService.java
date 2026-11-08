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
        List<String> errors = validateTopologyGraph(dto);
        if (!errors.isEmpty()) {
            throw new IllegalArgumentException("Invalid topology graph: " + String.join("; ", errors));
        }

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

            // A Sub-DAG container node can never be an END node
            boolean isCapsule = (node.subFlow() != null) ||
                (node.config() != null && Boolean.TRUE.equals(node.config().get("isSubFlow"))) ||
                (node.refId() != null && (node.refId().contains("subflow") || node.refId().contains("capsule")));
            if (isCapsule && "END".equalsIgnoreCase(role)) {
                errors.add("Sub-DAG container node cannot be an END node: " + node.label());
            }
        }

        if (!hasStart) {
            errors.add("Topology stream must contain at least one START node (stream source).");
        }
        if (!hasEnd) {
            errors.add("Topology stream must contain at least one END node (stream sink/terminal).");
        }

        Set<String> nodesWithIncomingEdges = new HashSet<>();
        Set<String> nodesWithOutgoingEdges = new HashSet<>();

        if (dto.edges() != null) {
            for (TopologyEdgeDto edge : dto.edges()) {
                if (!nodeIds.contains(edge.fromNodeId())) {
                    errors.add("Edge references non-existent source node: " + edge.fromNodeId());
                } else {
                    nodesWithOutgoingEdges.add(edge.fromNodeId());
                    TopologyNodeDto fromNode = nodeMap.get(edge.fromNodeId());
                    String fromRole = fromNode.streamRole() != null ? fromNode.streamRole() :
                        ("SOURCE".equalsIgnoreCase(fromNode.category()) ? "START" : ("SINK".equalsIgnoreCase(fromNode.category()) ? "END" : "MIDDLE"));
                    if ("END".equalsIgnoreCase(fromRole)) {
                        errors.add("End node (terminal) cannot have outgoing stream connections: node " + edge.fromNodeId());
                    }
                }

                if (!nodeIds.contains(edge.toNodeId())) {
                    errors.add("Edge references non-existent target node: " + edge.toNodeId());
                } else {
                    nodesWithIncomingEdges.add(edge.toNodeId());
                    TopologyNodeDto toNode = nodeMap.get(edge.toNodeId());
                    String toRole = toNode.streamRole() != null ? toNode.streamRole() :
                        ("SOURCE".equalsIgnoreCase(toNode.category()) ? "START" : ("SINK".equalsIgnoreCase(toNode.category()) ? "END" : "MIDDLE"));
                    if ("START".equalsIgnoreCase(toRole)) {
                        errors.add("Start node (ingress source) cannot receive incoming stream connections: node " + edge.toNodeId());
                    }
                }
            }
        }

        // Connectivity invariant checks:
        for (TopologyNodeDto node : dto.nodes()) {
            String role = node.streamRole() != null ? node.streamRole() :
                ("SOURCE".equalsIgnoreCase(node.category()) ? "START" : ("SINK".equalsIgnoreCase(node.category()) ? "END" : "MIDDLE"));
            
            // All non-START nodes must receive an incoming stream
            if (!"START".equalsIgnoreCase(role) && !nodesWithIncomingEdges.contains(node.id())) {
                errors.add("Node '" + node.label() + "' (" + node.id() + ") has no incoming stream connections.");
            }
            // All non-END nodes must emit an outgoing stream to the next node
            if (!"END".equalsIgnoreCase(role) && !nodesWithOutgoingEdges.contains(node.id())) {
                errors.add("Node '" + node.label() + "' (" + node.id() + ") has no outgoing stream connections.");
            }

            // Barrier mode validation: only END nodes can act as File Completion Barrier
            if ("FILE_COMPLETION_BARRIER".equalsIgnoreCase(node.barrierMode()) && !"END".equalsIgnoreCase(role)) {
                errors.add("File Completion Barrier mode is only supported on END (terminal) nodes: node '" + node.label() + "'");
            }
        }

        return errors;
    }

    private RouteTopologyDto toDto(RouteTopologyEntity entity) {
        try {
            List<TopologyNodeDto> rawNodes = objectMapper.readValue(
                entity.getNodesJson(),
                new TypeReference<List<TopologyNodeDto>>() {}
            );
            List<TopologyEdgeDto> edges = objectMapper.readValue(
                entity.getEdgesJson(),
                new TypeReference<List<TopologyEdgeDto>>() {}
            );
            // Ensure all nodes and sub-DAG nodes have type="NODE" and cleaned "Node" labels
            List<TopologyNodeDto> nodes = rawNodes.stream().map(this::normalizeNode).toList();
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

    private TopologyNodeDto normalizeNode(TopologyNodeDto n) {
        String label = n.label();
        if (label != null) {
            label = label.replace(" Connector", " Node")
                         .replace(" Capsule", " Node (Sub-DAG)");
        }
        RouteTopologyDto subFlow = n.subFlow();
        if (subFlow != null && subFlow.nodes() != null) {
            List<TopologyNodeDto> normalizedSubNodes = subFlow.nodes().stream()
                .map(this::normalizeNode)
                .toList();
            subFlow = new RouteTopologyDto(subFlow.topologyId(), subFlow.routeId(), normalizedSubNodes, subFlow.edges(), subFlow.version());
        }
        return new TopologyNodeDto(
            n.id(),
            "NODE",
            n.refId(),
            label,
            n.subLabel(),
            n.category(),
            n.x(),
            n.y(),
            n.inputPorts(),
            n.outputPorts(),
            n.config(),
            n.streamRole(),
            n.branchingPorts(),
            subFlow,
            n.barrierMode()
        );
    }

    private RouteTopologyDto synthesizeDefaultTopology(String routeId) {
        // Synthesize internal 2-step Sub-DAG (JSON Request -> JSON Response)
        List<TopologyNodeDto> subNodes = List.of(
            new TopologyNodeDto(
                "sub-rest-req",
                "NODE",
                "conn-def-rest-json",
                "JSON Request Node",
                "POST /api/v1/enrich",
                "PROCESSOR",
                120,
                140,
                List.of("in_records"),
                List.of("out_http_req"),
                Map.of(
                    "method", "POST",
                    "endpointUrl", "https://api.internal.corp/v1/enrich/${id}",
                    "authType", "NONE",
                    "bodyTemplate", "{\"customerId\": \"${id}\", \"email\": \"${email}\"}"
                ),
                "START"
            ),
            new TopologyNodeDto(
                "sub-rest-res",
                "NODE",
                "conn-def-rest-json",
                "JSON Response Node",
                "JSONPath Enrichment Mapper",
                "PROCESSOR",
                460,
                140,
                List.of("in_http_req"),
                List.of("pass", "fail"),
                Map.of(
                    "expectedStatus", List.of(200, 201),
                    "extractMappings", Map.of("tier", "$.account_tier", "kyc_status", "$.data.status")
                ),
                "MIDDLE",
                List.of(
                    new RouteTopologyDto.BranchingPortDto("pass", "PASS (2xx OK)", "#22c55e", "STATUS_CODE", "200..299", "CONTINUE"),
                    new RouteTopologyDto.BranchingPortDto("fail", "FAIL (Error / DLQ)", "#ef4444", "STATUS_CODE", "400..599", "FAIL_RECORD")
                ),
                null
            )
        );

        List<TopologyEdgeDto> subEdges = List.of(
            new TopologyEdgeDto("sub-edge-1", "sub-rest-req", "out_http_req", "sub-rest-res", "in_http_req")
        );

        RouteTopologyDto internalSubFlow = new RouteTopologyDto(
            "subflow-rest-composite",
            "node-rest-composite",
            subNodes,
            subEdges,
            1
        );

        List<TopologyNodeDto> nodes = List.of(
            new TopologyNodeDto(
                "node-source-csv",
                "NODE",
                "conn-def-csv",
                "CSV Ingestion Node",
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
                "NODE",
                "splitter-csv-univocity",
                "Streaming CSV Splitter Node",
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
                "node-rest-composite",
                "NODE",
                "conn-def-rest-json",
                "Customer Enrichment Node (Sub-DAG)",
                "Sub-DAG Node (2 Steps: Req ➔ Res)",
                "PROCESSOR",
                680,
                140,
                List.of("in_records"),
                List.of("out", "completed", "fail"),
                Map.of(
                    "isSubFlow", true,
                    "serviceName", "REST Customer Enrichment Service",
                    "endpointUrl", "https://api.internal.corp/v1/enrich/${id}",
                    "method", "POST"
                ),
                "MIDDLE",
                List.of(
                    new RouteTopologyDto.BranchingPortDto("out", "Verified (Continue Pipeline)", "#22c55e", "STATUS_CODE", "200..299", "CONTINUE"),
                    new RouteTopologyDto.BranchingPortDto("completed", "Early Terminal (Blank Sink)", "#10b981", "EXPRESSION", "earlyTermination == true", "CONTINUE"),
                    new RouteTopologyDto.BranchingPortDto("fail", "FAIL (Error / DLQ)", "#ef4444", "STATUS_CODE", "400..599", "FAIL_RECORD")
                ),
                internalSubFlow
            ),
            new TopologyNodeDto(
                "node-validator-comp",
                "NODE",
                "val-customer-kyc",
                "Customer KYC Validator Node",
                "Rule & Constraint Checker",
                "VALIDATOR",
                1040,
                140,
                List.of("in_enriched_records"),
                List.of("out_validated_records"),
                Map.of("errorPolicy", "QUARANTINE_RECORD"),
                "MIDDLE"
            ),
            new TopologyNodeDto(
                "node-sink-db",
                "NODE",
                "conn-def-db-sink",
                "Database JDBC Sink Node",
                "Processed Records Table",
                "SINK",
                1380,
                140,
                List.of("in_validated_records"),
                List.of(),
                Map.of("targetTable", "processed_customers", "batchSize", 1000),
                "END"
            ),
            new TopologyNodeDto(
                "node-terminal-sink",
                "NODE",
                "conn-def-terminal-sink",
                "Terminal Completion Sink Node",
                "Blank End Node (Seals Stream)",
                "SINK",
                1040,
                300,
                List.of("in_stream"),
                List.of(),
                Map.of("sealStream", true, "markCompleted", true),
                "END"
            )
        );

        List<TopologyEdgeDto> edges = List.of(
            new TopologyEdgeDto("edge-1", "node-source-csv", "out_file_stream", "node-splitter-comp", "in_file_stream"),
            new TopologyEdgeDto("edge-2", "node-splitter-comp", "out_records", "node-rest-composite", "in_records"),
            new TopologyEdgeDto("edge-3", "node-rest-composite", "out", "node-validator-comp", "in_enriched_records"),
            new TopologyEdgeDto("edge-4", "node-validator-comp", "out_validated_records", "node-sink-db", "in_validated_records"),
            new TopologyEdgeDto("edge-5", "node-rest-composite", "completed", "node-terminal-sink", "in_stream")
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
