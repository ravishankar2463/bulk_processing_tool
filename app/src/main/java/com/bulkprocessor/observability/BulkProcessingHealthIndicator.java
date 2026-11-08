package com.bulkprocessor.observability;

import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

/**
 * Custom Actuator Health Indicator for the Enterprise Bulk Processing Engine.
 * Evaluates operational readiness, repository responsiveness, and active jobs.
 */
@Component
public class BulkProcessingHealthIndicator implements HealthIndicator {

    private final RouteConfigRepository routeConfigRepository;
    private final BulkJobRepository bulkJobRepository;

    public BulkProcessingHealthIndicator(
            RouteConfigRepository routeConfigRepository,
            BulkJobRepository bulkJobRepository) {
        this.routeConfigRepository = routeConfigRepository;
        this.bulkJobRepository = bulkJobRepository;
    }

    @Override
    public Health health() {
        try {
            long routeCount = routeConfigRepository.count();
            long jobCount = bulkJobRepository.count();

            return Health.up()
                    .withDetail("engine", "BulkProcessingEngine")
                    .withDetail("configuredRoutes", routeCount)
                    .withDetail("trackedJobs", jobCount)
                    .withDetail("virtualThreads", "Enabled (Project Loom)")
                    .build();
        } catch (Exception ex) {
            return Health.down(ex)
                    .withDetail("error", "Failed to query repository state")
                    .build();
        }
    }
}
