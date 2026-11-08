package com.bulkprocessor.api.catalog;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.ingestion.camel.DynamicRouteManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Process Catalog Controller Integration Tests")
class ProcessCatalogControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DynamicRouteManager dynamicRouteManager;

    @Autowired
    private com.bulkprocessor.storage.repository.RouteConfigRepository routeConfigRepository;

    @Test
    @DisplayName("Retrieves pre-seeded route catalog with health, throughput, and pipeline steps")
    void shouldReturnRouteCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/routes/catalog"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
            .andExpect(jsonPath("$[?(@.id == 'customer-master-onboarding')].status").value("ACTIVE"))
            .andExpect(jsonPath("$[?(@.id == 'customer-master-onboarding')].health").value("HEALTHY"))
            .andExpect(jsonPath("$[?(@.id == 'order-fulfillment-stream')].status").value("ACTIVE"))
            .andExpect(jsonPath("$[?(@.id == 'order-fulfillment-stream')].health").value("HEALTHY"))
            .andExpect(jsonPath("$[?(@.id == 'financial-reconciliation')].status").value("PAUSED"))
            .andExpect(jsonPath("$[?(@.id == 'financial-reconciliation')].health").value("DEGRADED"))
            .andExpect(jsonPath("$[0].pipelineSteps", hasSize(4)))
            .andExpect(jsonPath("$[0].pipelineSteps[0].type").value("STREAMING_CSV_SPLITTER"))
            .andExpect(jsonPath("$[0].pipelineSteps[1].type").value("JANINO_DYNAMIC_VALIDATOR"))
            .andExpect(jsonPath("$[0].pipelineSteps[2].type").value("LOOM_RECORD_ENRICHER"))
            .andExpect(jsonPath("$[0].pipelineSteps[3].type").value("AUDIT_CSV_REPORT_SINK"));
    }

    @Test
    @DisplayName("Supports legacy and admin alias catalog endpoints")
    void shouldSupportAlternateCatalogEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/routes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));

        mockMvc.perform(get("/api/v1/admin/routes/catalog"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))));
    }

    @Test
    @DisplayName("Starts a paused route and resumes it in Camel")
    void shouldStartRoute() throws Exception {
        com.bulkprocessor.storage.entity.RouteConfigEntity route = new com.bulkprocessor.storage.entity.RouteConfigEntity();
        route.setRouteId("custom-paused-route");
        route.setRouteName("Custom Paused Route");
        route.setRouteType("DIRECT");
        route.setEndpointUri("direct:customPaused");
        route.setProcessId("custom-paused-proc");
        route.setStatus("PAUSED");
        routeConfigRepository.save(route);

        mockMvc.perform(post("/api/v1/routes/{routeId}/start", "custom-paused-route"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("custom-paused-route"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(dynamicRouteManager, atLeastOnce()).resumeRoute("custom-paused-route");
    }

    @Test
    @DisplayName("Pauses an active route and updates its health to DEGRADED")
    void shouldPauseRoute() throws Exception {
        com.bulkprocessor.storage.entity.RouteConfigEntity route = new com.bulkprocessor.storage.entity.RouteConfigEntity();
        route.setRouteId("custom-active-route");
        route.setRouteName("Custom Active Route");
        route.setRouteType("DIRECT");
        route.setEndpointUri("direct:customActive");
        route.setProcessId("custom-active-proc");
        route.setStatus("ACTIVE");
        routeConfigRepository.save(route);

        mockMvc.perform(post("/api/v1/routes/{routeId}/pause", "custom-active-route"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("custom-active-route"))
            .andExpect(jsonPath("$.status").value("PAUSED"))
            .andExpect(jsonPath("$.health").value("DEGRADED"));

        verify(dynamicRouteManager, atLeastOnce()).pauseRoute("custom-active-route");
    }

    @Test
    @DisplayName("Returns 404 when attempting to start a non-existent route")
    void shouldReturn404WhenStartingNonExistentRoute() throws Exception {
        mockMvc.perform(post("/api/v1/routes/{routeId}/start", "non-existent-route-xyz"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Returns 404 when attempting to pause a non-existent route")
    void shouldReturn404WhenPausingNonExistentRoute() throws Exception {
        mockMvc.perform(post("/api/v1/routes/{routeId}/pause", "non-existent-route-xyz"))
            .andExpect(status().isNotFound());
    }
}

