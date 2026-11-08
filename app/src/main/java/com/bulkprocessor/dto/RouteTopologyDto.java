package com.bulkprocessor.dto;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public record RouteTopologyDto(
    String topologyId,
    String routeId,
    List<TopologyNodeDto> nodes,
    List<TopologyEdgeDto> edges,
    int version
) {
    public record BranchingPortDto(
        String portId,          // e.g. "pass", "fail", "retry", "fallback"
        String label,           // e.g. "PASS (2xx OK)", "FAIL (Timeout / 5xx)"
        String color,           // "#22c55e", "#ef4444", "#f59e0b", "#3b82f6"
        String conditionType,   // "STATUS_CODE", "JSON_PATH", "SCRIPT", "ALWAYS"
        String conditionExpr,   // "200..299", "$.error != null", "return status == 503;"
        String actionType       // "CONTINUE", "CHAIN_REQUEST", "RETRY", "FAIL_RECORD"
    ) {}

    public record TopologyNodeDto(
        String id,
        String type, // COMPONENT, CONNECTOR, or NODE
        String refId,
        String label,
        String subLabel,
        String category,
        double x,
        double y,
        List<String> inputPorts,
        List<String> outputPorts,
        Map<String, Object> config,
        String streamRole, // START, MIDDLE, END
        List<BranchingPortDto> branchingPorts,
        RouteTopologyDto subFlow,
        String barrierMode // STREAMING, FILE_COMPLETION_BARRIER
    ) {
        // Constructor without barrierMode (defaults to STREAMING)
        public TopologyNodeDto(
            String id,
            String type,
            String refId,
            String label,
            String subLabel,
            String category,
            double x,
            double y,
            List<String> inputPorts,
            List<String> outputPorts,
            Map<String, Object> config,
            String streamRole,
            List<BranchingPortDto> branchingPorts,
            RouteTopologyDto subFlow
        ) {
            this(id, type, refId, label, subLabel, category, x, y, inputPorts, outputPorts, config, streamRole,
                branchingPorts, subFlow, "STREAMING");
        }

        // Constructor with streamRole only (default branchingPorts and subFlow)
        public TopologyNodeDto(
            String id,
            String type,
            String refId,
            String label,
            String subLabel,
            String category,
            double x,
            double y,
            List<String> inputPorts,
            List<String> outputPorts,
            Map<String, Object> config,
            String streamRole
        ) {
            this(id, type, refId, label, subLabel, category, x, y, inputPorts, outputPorts, config, streamRole,
                Collections.emptyList(), null, "STREAMING");
        }

        // Backward compatibility constructor without streamRole
        public TopologyNodeDto(
            String id,
            String type,
            String refId,
            String label,
            String subLabel,
            String category,
            double x,
            double y,
            List<String> inputPorts,
            List<String> outputPorts,
            Map<String, Object> config
        ) {
            this(id, type, refId, label, subLabel, category, x, y, inputPorts, outputPorts, config,
                "SOURCE".equalsIgnoreCase(category) ? "START" : ("SINK".equalsIgnoreCase(category) ? "END" : "MIDDLE"),
                Collections.emptyList(), null, "STREAMING");
        }
    }

    public record TopologyEdgeDto(
        String id,
        String fromNodeId,
        String fromPort,
        String toNodeId,
        String toPort
    ) {}
}
