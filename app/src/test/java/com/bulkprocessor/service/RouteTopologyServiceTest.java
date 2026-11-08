package com.bulkprocessor.service;

import com.bulkprocessor.dto.RouteTopologyDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyEdgeDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyNodeDto;
import com.bulkprocessor.storage.repository.RouteTopologyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Route Topology Service & Graph Invariants Test")
class RouteTopologyServiceTest {

    private RouteTopologyRepository topologyRepository;
    private ObjectMapper objectMapper;
    private RouteTopologyService topologyService;

    @BeforeEach
    void setUp() {
        topologyRepository = Mockito.mock(RouteTopologyRepository.class);
        objectMapper = new ObjectMapper();
        topologyService = new RouteTopologyService(topologyRepository, objectMapper);
    }

    @Test
    @DisplayName("Synthesized default topology contains at least one START and one END node (including Terminal Completion Sink)")
    void defaultTopologyMustBeValid() {
        RouteTopologyDto topology = topologyService.getTopology("proc-customer-master");
        assertThat(topology).isNotNull();

        List<String> errors = topologyService.validateTopologyGraph(topology);
        assertThat(errors).isEmpty();

        boolean hasTerminalSink = topology.nodes().stream()
                .anyMatch(n -> "node-terminal-sink".equals(n.id()) || "Terminal Completion Sink".equals(n.label()));
        assertThat(hasTerminalSink).isTrue();
    }

    @Test
    @DisplayName("Validation fails when topology has no START node")
    void validationFailsWithoutStartNode() {
        List<TopologyNodeDto> nodes = List.of(
                new TopologyNodeDto("n1", "CONNECTOR", "c1", "Processor", "Sub", "PROCESSOR", 100, 100, List.of("in"), List.of("out"), Map.of(), "MIDDLE"),
                new TopologyNodeDto("n2", "CONNECTOR", "c2", "Sink", "Sub", "SINK", 300, 100, List.of("in"), List.of(), Map.of(), "END")
        );
        List<TopologyEdgeDto> edges = List.of(
                new TopologyEdgeDto("e1", "n1", "out", "n2", "in")
        );
        RouteTopologyDto dto = new RouteTopologyDto("top-1", "route-1", nodes, edges, 1);

        List<String> errors = topologyService.validateTopologyGraph(dto);
        assertThat(errors).anyMatch(e -> e.contains("START connector"));
    }

    @Test
    @DisplayName("Validation fails when topology has no END node")
    void validationFailsWithoutEndNode() {
        List<TopologyNodeDto> nodes = List.of(
                new TopologyNodeDto("n1", "CONNECTOR", "c1", "Start", "Sub", "SOURCE", 100, 100, List.of(), List.of("out"), Map.of(), "START"),
                new TopologyNodeDto("n2", "CONNECTOR", "c2", "Processor", "Sub", "PROCESSOR", 300, 100, List.of("in"), List.of("out"), Map.of(), "MIDDLE")
        );
        List<TopologyEdgeDto> edges = List.of(
                new TopologyEdgeDto("e1", "n1", "out", "n2", "in")
        );
        RouteTopologyDto dto = new RouteTopologyDto("top-2", "route-2", nodes, edges, 1);

        List<String> errors = topologyService.validateTopologyGraph(dto);
        assertThat(errors).anyMatch(e -> e.contains("END connector"));
    }

    @Test
    @DisplayName("Validation fails when a Composite Capsule is configured as an END node")
    void validationFailsWhenCapsuleIsEndNode() {
        List<TopologyNodeDto> nodes = List.of(
                new TopologyNodeDto("n1", "CONNECTOR", "c1", "Start", "Sub", "SOURCE", 100, 100, List.of(), List.of("out"), Map.of(), "START"),
                new TopologyNodeDto("n-capsule", "CONNECTOR", "conn-def-composite-subflow", "Composite Capsule", "Sub", "SINK", 300, 100, List.of("in"), List.of(), Map.of("isSubFlow", true), "END")
        );
        List<TopologyEdgeDto> edges = List.of(
                new TopologyEdgeDto("e1", "n1", "out", "n-capsule", "in")
        );
        RouteTopologyDto dto = new RouteTopologyDto("top-3", "route-3", nodes, edges, 1);

        List<String> errors = topologyService.validateTopologyGraph(dto);
        assertThat(errors).anyMatch(e -> e.contains("Composite Capsule cannot be an END node"));
    }

    @Test
    @DisplayName("Validation fails when intermediate node has no incoming or outgoing connections")
    void validationFailsWhenNodeIsDisconnected() {
        List<TopologyNodeDto> nodes = List.of(
                new TopologyNodeDto("n1", "CONNECTOR", "c1", "Start", "Sub", "SOURCE", 100, 100, List.of(), List.of("out"), Map.of(), "START"),
                new TopologyNodeDto("n2", "CONNECTOR", "c2", "Isolated", "Sub", "PROCESSOR", 200, 200, List.of("in"), List.of("out"), Map.of(), "MIDDLE"),
                new TopologyNodeDto("n3", "CONNECTOR", "c3", "End", "Sub", "SINK", 300, 100, List.of("in"), List.of(), Map.of(), "END")
        );
        List<TopologyEdgeDto> edges = List.of(
                new TopologyEdgeDto("e1", "n1", "out", "n3", "in")
        );
        RouteTopologyDto dto = new RouteTopologyDto("top-4", "route-4", nodes, edges, 1);

        List<String> errors = topologyService.validateTopologyGraph(dto);
        assertThat(errors).anyMatch(e -> e.contains("has no incoming stream connections"));
        assertThat(errors).anyMatch(e -> e.contains("has no outgoing stream connections"));
    }
}
