package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.dto.RouteTopologyDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyEdgeDto;
import com.bulkprocessor.dto.RouteTopologyDto.TopologyNodeDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Route Topology Controller Integration Tests")
class AdminRouteTopologyControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Fetches default synthesized topology for an existing or new route")
    void shouldFetchDefaultTopology() throws Exception {
        mockMvc.perform(get("/api/v1/admin/routes/order-fulfillment-stream/topology"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.routeId", is("order-fulfillment-stream")))
            .andExpect(jsonPath("$.nodes", not(empty())))
            .andExpect(jsonPath("$.edges", not(empty())));
    }

    @Test
    @DisplayName("Saves and updates a custom route topology graph")
    void shouldSaveAndFetchCustomTopology() throws Exception {
        List<TopologyNodeDto> nodes = List.of(
            new TopologyNodeDto(
                "n-csv", "CONNECTOR", "conn-def-csv", "CSV Source", "S3 Upload",
                "SOURCE", 50, 100, List.of(), List.of("out"), Map.of(), "START"
            ),
            new TopologyNodeDto(
                "n-proc", "COMPONENT", "proc-enricher", "Enricher", "Loom Worker",
                "PROCESSOR", 350, 100, List.of("in"), List.of("out"), Map.of(), "MIDDLE"
            ),
            new TopologyNodeDto(
                "n-sink", "CONNECTOR", "conn-def-db-sink", "Database Sink", "DB Writer",
                "SINK", 650, 100, List.of("in"), List.of(), Map.of(), "END"
            )
        );
        List<TopologyEdgeDto> edges = List.of(
            new TopologyEdgeDto("e-1", "n-csv", "out", "n-proc", "in"),
            new TopologyEdgeDto("e-2", "n-proc", "out", "n-sink", "in")
        );

        RouteTopologyDto topologyDto = new RouteTopologyDto(
            "top-custom-route",
            "custom-route-1",
            nodes,
            edges,
            1
        );

        mockMvc.perform(put("/api/v1/admin/routes/custom-route-1/topology")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(topologyDto)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.routeId", is("custom-route-1")))
            .andExpect(jsonPath("$.nodes", hasSize(3)))
            .andExpect(jsonPath("$.nodes[0].streamRole", is("START")))
            .andExpect(jsonPath("$.edges", hasSize(2)));

        // Retrieve saved
        mockMvc.perform(get("/api/v1/admin/routes/custom-route-1/topology"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nodes[0].id", is("n-csv")))
            .andExpect(jsonPath("$.nodes[2].streamRole", is("END")));
    }

    @Test
    @DisplayName("Validates route topology graph structure and detects broken links")
    void shouldValidateTopology() throws Exception {
        // Graph with an invalid edge referencing non-existent node
        List<TopologyNodeDto> nodes = List.of(
            new TopologyNodeDto("n-1", "CONNECTOR", "conn-def-csv", "CSV", "", "SOURCE", 0, 0, List.of(), List.of("out"), Map.of())
        );
        List<TopologyEdgeDto> brokenEdges = List.of(
            new TopologyEdgeDto("e-broken", "n-1", "out", "non-existent-node", "in")
        );

        RouteTopologyDto invalidTopology = new RouteTopologyDto(
            "top-test", "val-route", nodes, brokenEdges, 1
        );

        mockMvc.perform(post("/api/v1/admin/routes/val-route/topology/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidTopology)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid", is(false)))
            .andExpect(jsonPath("$.errors", hasItem(containsString("non-existent target node"))));
    }

    @Test
    @DisplayName("Enforces Stream Role invariants: rejects invalid incoming edges to START or outgoing from END")
    void shouldEnforceStreamRoleTerminalInvariants() throws Exception {
        List<TopologyNodeDto> nodes = List.of(
            new TopologyNodeDto("n-start", "CONNECTOR", "conn-def-csv", "CSV Source", "", "SOURCE", 0, 0, List.of(), List.of("out"), Map.of(), "START"),
            new TopologyNodeDto("n-end", "CONNECTOR", "conn-def-db-sink", "DB Sink", "", "SINK", 300, 0, List.of("in"), List.of(), Map.of(), "END")
        );
        // Invalid edge: trying to route FROM an END node into a START node
        List<TopologyEdgeDto> illegalEdges = List.of(
            new TopologyEdgeDto("e-illegal", "n-end", "out", "n-start", "in")
        );

        RouteTopologyDto invalidStreamTopology = new RouteTopologyDto(
            "top-stream-test", "val-route", nodes, illegalEdges, 1
        );

        mockMvc.perform(post("/api/v1/admin/routes/val-route/topology/validate")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidStreamTopology)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid", is(false)))
            .andExpect(jsonPath("$.errors", hasItem(containsString("End connector (terminal) cannot have outgoing stream connections"))))
            .andExpect(jsonPath("$.errors", hasItem(containsString("Start connector (ingress source) cannot receive incoming stream connections"))));
    }
}
