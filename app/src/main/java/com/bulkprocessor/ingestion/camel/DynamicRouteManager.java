package com.bulkprocessor.ingestion.camel;

import com.bulkprocessor.storage.entity.RouteConfigEntity;
import org.apache.camel.CamelContext;
import org.apache.camel.builder.RouteBuilder;
import org.apache.camel.model.RouteDefinition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Manages runtime Apache Camel route lifecycles dynamically from database configurations.
 */
@Service
public class DynamicRouteManager {

    private static final Logger log = LoggerFactory.getLogger(DynamicRouteManager.class);
    private final CamelContext camelContext;

    public DynamicRouteManager(CamelContext camelContext) {
        this.camelContext = Objects.requireNonNull(camelContext, "camelContext must not be null");
    }

    /**
     * Dynamically registers or hot-swaps an active route at runtime.
     */
    public synchronized void deployOrUpdateRoute(RouteConfigEntity config) throws Exception {
        String routeId = config.getRouteId();

        // 1. Remove existing route if already present
        if (camelContext.getRoute(routeId) != null) {
            log.info("Stopping and removing existing route: {}", routeId);
            camelContext.getRouteController().stopRoute(routeId);
            camelContext.removeRoute(routeId);
        }

        if (!"ACTIVE".equalsIgnoreCase(config.getStatus())) {
            log.info("Route {} is not ACTIVE (status={}). Skipping deployment.", routeId, config.getStatus());
            return;
        }

        // 2. Add dynamic RouteBuilder
        camelContext.addRoutes(new RouteBuilder() {
            @Override
            public void configure() {
                RouteDefinition routeDef = from(config.getEndpointUri())
                    .routeId(routeId)
                    .setHeader("processId", constant(config.getProcessId()))
                    .setHeader("routeId", constant(routeId))
                    .log("Dynamic route " + routeId + " processed incoming item.");

                if (config.getErrorUri() != null && !config.getErrorUri().isBlank()) {
                    routeDef.onException(Exception.class)
                        .handled(true)
                        .to(config.getErrorUri());
                }
            }
        });

        log.info("Successfully deployed dynamic route: {}", routeId);
    }

    /**
     * Pauses an active route without removing its definition.
     */
    public synchronized void pauseRoute(String routeId) throws Exception {
        if (camelContext.getRoute(routeId) != null) {
            camelContext.getRouteController().stopRoute(routeId);
            log.info("Paused route: {}", routeId);
        }
    }

    /**
     * Resumes a paused route.
     */
    public synchronized void resumeRoute(String routeId) throws Exception {
        if (camelContext.getRoute(routeId) != null) {
            camelContext.getRouteController().startRoute(routeId);
            log.info("Resumed route: {}", routeId);
        }
    }

    /**
     * Stops and removes a route from the running CamelContext.
     */
    public synchronized void removeRoute(String routeId) throws Exception {
        if (camelContext.getRoute(routeId) != null) {
            camelContext.getRouteController().stopRoute(routeId);
            camelContext.removeRoute(routeId);
            log.info("Removed route: {}", routeId);
        }
    }
}

