package com.bulkprocessor.api.admin;

import com.bulkprocessor.dto.HousekeepingReportDto;
import com.bulkprocessor.service.RouteHousekeepingService;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/routes")
@CrossOrigin(origins = "*")
public class AdminHousekeepingController {

    private static final Logger log = LoggerFactory.getLogger(AdminHousekeepingController.class);

    private final RouteHousekeepingService housekeepingService;
    private final RouteConfigRepository routeConfigRepository;

    public AdminHousekeepingController(
            RouteHousekeepingService housekeepingService,
            RouteConfigRepository routeConfigRepository) {
        this.housekeepingService = housekeepingService;
        this.routeConfigRepository = routeConfigRepository;
    }

    /**
     * Trigger immediate on-demand housekeeping purge for a specific route.
     */
    @PostMapping("/{routeId}/housekeeping/run")
    public ResponseEntity<HousekeepingReportDto> runHousekeepingForRoute(@PathVariable String routeId) {
        log.info("REST: Triggered on-demand housekeeping for route {}", routeId);
        HousekeepingReportDto report = housekeepingService.purgeExpiredFilesForRoute(routeId);
        return ResponseEntity.ok(report);
    }

    /**
     * Trigger immediate on-demand housekeeping purge across all registered routes.
     */
    @PostMapping("/housekeeping/run-all")
    public ResponseEntity<List<HousekeepingReportDto>> runHousekeepingForAll() {
        log.info("REST: Triggered on-demand housekeeping across all routes");
        List<HousekeepingReportDto> reports = housekeepingService.purgeAllExpiredFiles();
        return ResponseEntity.ok(reports);
    }

    /**
     * Get retention settings and housekeeping status for a specific route.
     */
    @GetMapping("/{routeId}/housekeeping/status")
    public ResponseEntity<Map<String, Object>> getHousekeepingStatus(@PathVariable String routeId) {
        RouteConfigEntity route = routeConfigRepository.findById(routeId).orElse(null);
        int retentionDays = (route != null && route.getRetentionDays() != null) ? route.getRetentionDays() : 30;

        return ResponseEntity.ok(Map.of(
                "routeId", routeId,
                "retentionDays", retentionDays,
                "retentionCeilingDays", 90,
                "policy", "Hard ceiling 90 days (3 months) enforced",
                "nextScheduledRun", "Nightly at 02:00 AM UTC",
                "status", "ACTIVE"
        ));
    }

    /**
     * Update route retention period (enforcing 1 to 90 days hard ceiling).
     */
    @PutMapping("/{routeId}/retention")
    public ResponseEntity<Map<String, Object>> updateRetention(
            @PathVariable String routeId,
            @RequestBody Map<String, Object> body) {
        Object val = body.get("retentionDays");
        if (val == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing retentionDays in payload"));
        }

        int requestedDays;
        try {
            requestedDays = Integer.parseInt(val.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid numeric value for retentionDays"));
        }

        if (requestedDays < 1 || requestedDays > 90) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Retention days must be between 1 and 90 days (3-month ceiling enforced)",
                    "requestedDays", requestedDays,
                    "maxCeiling", 90
            ));
        }

        RouteConfigEntity route = routeConfigRepository.findById(routeId).orElse(null);
        if (route == null) {
            return ResponseEntity.notFound().build();
        }

        route.setRetentionDays(requestedDays);
        route.setUpdatedAt(Instant.now());
        routeConfigRepository.save(route);

        return ResponseEntity.ok(Map.of(
                "routeId", routeId,
                "retentionDays", route.getRetentionDays(),
                "message", "Retention period updated successfully."
        ));
    }
}
