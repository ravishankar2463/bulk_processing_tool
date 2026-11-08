package com.bulkprocessor.api.admin;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.dynamic.compiler.DynamicScriptCompiler;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.repository.ComponentInstanceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/components")
@CrossOrigin(origins = "*")
public class AdminComponentController {

    private final ComponentInstanceRepository repository;
    private final DynamicScriptCompiler scriptCompiler;
    private final ObjectMapper objectMapper;

    public AdminComponentController(ComponentInstanceRepository repository) {
        this.repository = repository;
        this.scriptCompiler = new DynamicScriptCompiler();
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public ResponseEntity<List<ComponentInstanceEntity>> listComponents(
            @RequestParam(required = false) String type) {
        if (type != null && !type.isBlank()) {
            return ResponseEntity.ok(repository.findByComponentType(type.toUpperCase()));
        }
        return ResponseEntity.ok(repository.findAll());
    }

    @GetMapping("/{instanceId}")
    public ResponseEntity<ComponentInstanceEntity> getComponent(@PathVariable String instanceId) {
        return repository.findById(instanceId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<ComponentInstanceEntity> createComponent(@RequestBody ComponentInstanceEntity entity) {
        if (entity.getCreatedAt() == null) {
            entity.setCreatedAt(Instant.now());
        }
        entity.setUpdatedAt(Instant.now());

        // Pre-compile into cache if code snippet provided
        if ("CODE_SNIPPET".equalsIgnoreCase(entity.getExecutionMode()) &&
            "VALIDATOR".equalsIgnoreCase(entity.getComponentType()) &&
            entity.getSourceCode() != null && !entity.getSourceCode().isBlank()) {
            try {
                scriptCompiler.compileValidator(entity.getInstanceId(), entity.getSourceCode());
            } catch (Exception e) {
                // Keep entity but compilation warning
            }
        }

        ComponentInstanceEntity saved = repository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/test-run")
    public ResponseEntity<Map<String, Object>> testRun(@RequestBody Map<String, Object> request) {
        String componentType = (String) request.getOrDefault("componentType", "VALIDATOR");
        String sourceCode = (String) request.get("sourceCode");
        String samplePayload = (String) request.get("samplePayload");

        long start = System.nanoTime();
        try {
            if ("VALIDATOR".equalsIgnoreCase(componentType)) {
                DynamicValidatorScript validator = scriptCompiler.compileValidator("test-transient-" + System.currentTimeMillis(), sourceCode);
                Map<String, Object> recordMap = samplePayload != null && !samplePayload.isBlank()
                    ? objectMapper.readValue(samplePayload, new TypeReference<Map<String, Object>>() {})
                    : Map.of();

                JobContext dummyCtx = new JobContext("test-job", "test-file", "test.csv", "local://test", "test-proc", Map.of(), System.currentTimeMillis());
                DynamicValidatorScript.ValidationResult valResult = validator.validate(recordMap, dummyCtx);
                long durationMicros = (System.nanoTime() - start) / 1000;

                return ResponseEntity.ok(Map.of(
                    "compilationSuccessful", true,
                    "executionDurationMicros", durationMicros,
                    "result", valResult,
                    "logs", List.of()
                ));
            }

            return ResponseEntity.ok(Map.of(
                "compilationSuccessful", true,
                "executionDurationMicros", (System.nanoTime() - start) / 1000,
                "result", "Component type not yet wired for test-run"
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of(
                "compilationSuccessful", false,
                "executionDurationMicros", (System.nanoTime() - start) / 1000,
                "errorMessage", e.getMessage()
            ));
        }
    }
}

