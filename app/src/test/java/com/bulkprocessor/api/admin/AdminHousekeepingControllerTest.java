package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.dto.HousekeepingReportDto;
import com.bulkprocessor.service.RouteHousekeepingService;
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

import java.time.Instant;
import java.util.Map;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Housekeeping & Retention Controller Integration Tests")
class AdminHousekeepingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RouteHousekeepingService housekeepingService;

    @Autowired
    private RouteConfigRepository routeConfigRepository;

    @Test
    @DisplayName("POST /api/v1/admin/routes/{routeId}/housekeeping/run triggers on-demand purge")
    void shouldRunHousekeepingForRoute() throws Exception {
        HousekeepingReportDto mockReport = new HousekeepingReportDto(
                "proc-customer-master",
                30,
                Instant.now(),
                5,
                12,
                10,
                204800L,
                Instant.now()
        );
        when(housekeepingService.purgeExpiredFilesForRoute(eq("proc-customer-master")))
                .thenReturn(mockReport);

        mockMvc.perform(post("/api/v1/admin/routes/proc-customer-master/housekeeping/run"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routeId").value("proc-customer-master"))
                .andExpect(jsonPath("$.purgedJobsCount").value(5))
                .andExpect(jsonPath("$.purgedErrorsCount").value(12))
                .andExpect(jsonPath("$.purgedBytes").value(204800));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/routes/{routeId}/retention rejects values above 90 days ceiling")
    void shouldRejectRetentionAboveCeiling() throws Exception {
        mockMvc.perform(put("/api/v1/admin/routes/proc-customer-master/retention")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("retentionDays", 120))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.maxCeiling").value(90))
                .andExpect(jsonPath("$.error").value("Retention days must be between 1 and 90 days (3-month ceiling enforced)"));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/routes/{routeId}/retention updates retention within 1..90 days")
    void shouldUpdateRetentionWithinCeiling() throws Exception {
        RouteConfigEntity entity = new RouteConfigEntity();
        entity.setRouteId("proc-retention-test");
        entity.setRouteName("Retention Test Route");
        entity.setRouteType("DIRECT");
        entity.setEndpointUri("direct:retentionTest");
        entity.setProcessId("proc-retention-test");
        entity.setRetentionDays(30);
        routeConfigRepository.save(entity);

        mockMvc.perform(put("/api/v1/admin/routes/proc-retention-test/retention")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("retentionDays", 45))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.retentionDays").value(45));
    }
}
