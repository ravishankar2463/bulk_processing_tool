package com.bulkprocessor.ingestion.camel;

import com.bulkprocessor.storage.entity.RouteConfigEntity;
import org.apache.camel.CamelContext;
import org.apache.camel.ServiceStatus;
import org.apache.camel.impl.DefaultCamelContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Apache Camel Dynamic Route Manager Unit Tests")
class DynamicRouteManagerTest {

    private CamelContext camelContext;
    private DynamicRouteManager routeManager;

    @BeforeEach
    void setUp() throws Exception {
        camelContext = new DefaultCamelContext();
        camelContext.start();
        routeManager = new DynamicRouteManager(camelContext);
    }

    @AfterEach
    void tearDown() throws Exception {
        if (camelContext != null) {
            camelContext.stop();
        }
    }

    @Test
    @DisplayName("Dynamically deploys an active route to running CamelContext")
    void shouldDeployActiveRouteDynamically() throws Exception {
        RouteConfigEntity config = new RouteConfigEntity();
        config.setRouteId("dynamic-test-route");
        config.setRouteName("Dynamic File Route");
        config.setRouteType("DIRECT");
        config.setEndpointUri("direct:startDynamic");
        config.setProcessId("process-101");
        config.setStatus("ACTIVE");

        routeManager.deployOrUpdateRoute(config);

        assertThat(camelContext.getRoute("dynamic-test-route")).isNotNull();
        assertThat(camelContext.getRouteController().getRouteStatus("dynamic-test-route")).isEqualTo(ServiceStatus.Started);
    }

    @Test
    @DisplayName("Pauses and resumes a running route at runtime")
    void shouldPauseAndResumeRoute() throws Exception {
        RouteConfigEntity config = new RouteConfigEntity();
        config.setRouteId("pausable-route");
        config.setRouteType("DIRECT");
        config.setEndpointUri("direct:pausable");
        config.setProcessId("process-102");
        config.setStatus("ACTIVE");

        routeManager.deployOrUpdateRoute(config);
        assertThat(camelContext.getRouteController().getRouteStatus("pausable-route")).isEqualTo(ServiceStatus.Started);

        // Pause
        routeManager.pauseRoute("pausable-route");
        assertThat(camelContext.getRouteController().getRouteStatus("pausable-route")).isEqualTo(ServiceStatus.Stopped);

        // Resume
        routeManager.resumeRoute("pausable-route");
        assertThat(camelContext.getRouteController().getRouteStatus("pausable-route")).isEqualTo(ServiceStatus.Started);
    }

    @Test
    @DisplayName("Removes a route gracefully from CamelContext")
    void shouldRemoveRouteGracefully() throws Exception {
        RouteConfigEntity config = new RouteConfigEntity();
        config.setRouteId("removable-route");
        config.setRouteType("DIRECT");
        config.setEndpointUri("direct:removable");
        config.setProcessId("process-103");
        config.setStatus("ACTIVE");

        routeManager.deployOrUpdateRoute(config);
        assertThat(camelContext.getRoute("removable-route")).isNotNull();

        routeManager.removeRoute("removable-route");
        assertThat(camelContext.getRoute("removable-route")).isNull();
    }
}
