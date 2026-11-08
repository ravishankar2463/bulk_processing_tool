package com.bulkprocessor.api.admin;

import com.bulkprocessor.ingestion.camel.DynamicRouteManager;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/routes")
@CrossOrigin(origins = "*")
public class AdminRouteController {

    private static final Logger log = LoggerFactory.getLogger(AdminRouteController.class);

    private final RouteConfigRepository routeConfigRepository;
    private final DynamicRouteManager dynamicRouteManager;

    public AdminRouteController(RouteConfigRepository routeConfigRepository, DynamicRouteManager dynamicRouteManager) {
        this.routeConfigRepository = routeConfigRepository;
        this.dynamicRouteManager = dynamicRouteManager;
    }

    @GetMapping
    public ResponseEntity<List<RouteConfigEntity>> listRoutes() {
        return ResponseEntity.ok(routeConfigRepository.findAll());
    }

    @GetMapping("/{routeId}")
    public ResponseEntity<RouteConfigEntity> getRoute(@PathVariable String routeId) {
        return routeConfigRepository.findById(routeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RouteConfigEntity> createOrUpdateRoute(@RequestBody RouteConfigEntity config) throws Exception {
        config.setUpdatedAt(Instant.now());
        if (config.getStatus() == null || config.getStatus().isBlank()) {
            config.setStatus("ACTIVE");
        }

        RouteConfigEntity saved = routeConfigRepository.save(config);

        if ("ACTIVE".equalsIgnoreCase(saved.getStatus())) {
            dynamicRouteManager.deployOrUpdateRoute(saved);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{routeId}/pause")
    public ResponseEntity<RouteConfigEntity> pauseRoute(@PathVariable String routeId) throws Exception {
        return routeConfigRepository.findById(routeId)
            .map(route -> {
                try {
                    dynamicRouteManager.pauseRoute(routeId);
                    route.setStatus("PAUSED");
                    route.setUpdatedAt(Instant.now());
                    return ResponseEntity.ok(routeConfigRepository.save(route));
                } catch (Exception e) {
                    throw new RuntimeException("Failed to pause route: " + routeId, e);
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{routeId}/resume")
    public ResponseEntity<RouteConfigEntity> resumeRoute(@PathVariable String routeId) throws Exception {
        return routeConfigRepository.findById(routeId)
            .map(route -> {
                try {
                    dynamicRouteManager.resumeRoute(routeId);
                    route.setStatus("ACTIVE");
                    route.setUpdatedAt(Instant.now());
                    return ResponseEntity.ok(routeConfigRepository.save(route));
                } catch (Exception e) {
                    throw new RuntimeException("Failed to resume route: " + routeId, e);
                }
            })
            .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{routeId}")
    public ResponseEntity<Void> deleteRoute(@PathVariable String routeId) throws Exception {
        dynamicRouteManager.removeRoute(routeId);
        routeConfigRepository.deleteById(routeId);
        return ResponseEntity.noContent().build();
    }
}

