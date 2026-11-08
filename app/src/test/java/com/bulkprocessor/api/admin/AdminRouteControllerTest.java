package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.ingestion.camel.DynamicRouteManager;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Dynamic Route REST Controller Integration Tests")
class AdminRouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private DynamicRouteManager dynamicRouteManager;

    @Autowired
    private RouteConfigRepository routeConfigRepository;

    @Test
    @DisplayName("Creates and dynamically deploys a new route into Camel")
    void shouldCreateAndDeployRoute() throws Exception {
        RouteConfigEntity route = new RouteConfigEntity();
        route.setRouteId("csv-inbound-test");
        route.setRouteName("Inbound Test CSV Route");
        route.setRouteType("DIRECT");
        route.setEndpointUri("direct:testCsvInput");
        route.setProcessId("customer-proc");
        route.setStatus("ACTIVE");
        route.setVersion(1);

        mockMvc.perform(post("/api/v1/admin/routes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(route)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.routeId").value("csv-inbound-test"))
            .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(dynamicRouteManager, times(1)).deployOrUpdateRoute(any(RouteConfigEntity.class));
    }

    @Test
    @DisplayName("Pauses an active route in Camel and updates DB")
    void shouldPauseActiveRoute() throws Exception {
        RouteConfigEntity route = new RouteConfigEntity();
        route.setRouteId("route-to-pause");
        route.setRouteName("Pausable Route");
        route.setRouteType("DIRECT");
        route.setEndpointUri("direct:pauseMe");
        route.setProcessId("proc-1");
        route.setStatus("ACTIVE");
        routeConfigRepository.save(route);

        mockMvc.perform(post("/api/v1/admin/routes/{routeId}/pause", "route-to-pause"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("PAUSED"));

        verify(dynamicRouteManager, times(1)).pauseRoute("route-to-pause");
    }

    @Test
    @DisplayName("Resumes a paused route in Camel and updates DB")
    void shouldResumePausedRoute() throws Exception {
        RouteConfigEntity route = new RouteConfigEntity();
        route.setRouteId("route-to-resume");
        route.setRouteName("Resumable Route");
        route.setRouteType("DIRECT");
        route.setEndpointUri("direct:resumeMe");
        route.setProcessId("proc-2");
        route.setStatus("PAUSED");
        routeConfigRepository.save(route);

        mockMvc.perform(post("/api/v1/admin/routes/{routeId}/resume", "route-to-resume"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(dynamicRouteManager, times(1)).resumeRoute("route-to-resume");
    }
}

