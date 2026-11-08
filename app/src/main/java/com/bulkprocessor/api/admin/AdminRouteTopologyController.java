package com.bulkprocessor.api.admin;

import com.bulkprocessor.dto.RouteTopologyDto;
import com.bulkprocessor.service.RouteTopologyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/routes/{routeId}/topology")
@CrossOrigin(origins = "*")
public class AdminRouteTopologyController {

    private final RouteTopologyService topologyService;

    public AdminRouteTopologyController(RouteTopologyService topologyService) {
        this.topologyService = topologyService;
    }

    @GetMapping
    public ResponseEntity<RouteTopologyDto> getTopology(@PathVariable String routeId) {
        return ResponseEntity.ok(topologyService.getTopology(routeId));
    }

    @PutMapping
    public ResponseEntity<RouteTopologyDto> saveTopology(
        @PathVariable String routeId,
        @RequestBody RouteTopologyDto dto
    ) {
        // Ensure routeId matches path variable
        RouteTopologyDto normalized = new RouteTopologyDto(
            dto.topologyId(),
            routeId,
            dto.nodes(),
            dto.edges(),
            dto.version()
        );
        return ResponseEntity.ok(topologyService.saveTopology(normalized));
    }

    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateTopology(
        @PathVariable String routeId,
        @RequestBody RouteTopologyDto dto
    ) {
        List<String> errors = topologyService.validateTopologyGraph(dto);
        boolean valid = errors.isEmpty();
        return ResponseEntity.ok(Map.of(
            "valid", valid,
            "errors", errors
        ));
    }
}
