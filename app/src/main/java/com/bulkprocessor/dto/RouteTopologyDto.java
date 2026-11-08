package com.bulkprocessor.dto;

import java.util.List;
import java.util.Map;

public record RouteTopologyDto(
    String topologyId,
    String routeId,
    List<TopologyNodeDto> nodes,
    List<TopologyEdgeDto> edges,
    int version
) {
    public record TopologyNodeDto(
        String id,
        String type, // COMPONENT or CONNECTOR
        String refId,
        String label,
        String subLabel,
        String category,
        double x,
        double y,
        List<String> inputPorts,
        List<String> outputPorts,
        Map<String, Object> config,
        String streamRole // START, MIDDLE, END
    ) {
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
                "SOURCE".equalsIgnoreCase(category) ? "START" : ("SINK".equalsIgnoreCase(category) ? "END" : "MIDDLE"));
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
