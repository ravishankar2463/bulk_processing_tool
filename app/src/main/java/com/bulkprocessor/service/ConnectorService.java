package com.bulkprocessor.service;

import com.bulkprocessor.dto.ConnectorDefinitionDto;
import com.bulkprocessor.dto.ConnectorDryRunRequestDto;
import com.bulkprocessor.dto.ConnectorDryRunResultDto;
import com.bulkprocessor.dto.ConnectorInstanceDto;
import com.bulkprocessor.dynamic.compiler.ConnectorScriptEngine;
import com.bulkprocessor.storage.entity.ConnectorDefinitionEntity;
import com.bulkprocessor.storage.entity.ConnectorInstanceEntity;
import com.bulkprocessor.storage.repository.ConnectorDefinitionRepository;
import com.bulkprocessor.storage.repository.ConnectorInstanceRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class ConnectorService {

    private static final Logger log = LoggerFactory.getLogger(ConnectorService.class);
    private final ConnectorDefinitionRepository definitionRepository;
    private final ConnectorInstanceRepository instanceRepository;
    private final ObjectMapper objectMapper;
    private final ConnectorScriptEngine scriptEngine;

    public ConnectorService(
        ConnectorDefinitionRepository definitionRepository,
        ConnectorInstanceRepository instanceRepository,
        ObjectMapper objectMapper,
        ConnectorScriptEngine scriptEngine
    ) {
        this.definitionRepository = definitionRepository;
        this.instanceRepository = instanceRepository;
        this.objectMapper = objectMapper;
        this.scriptEngine = scriptEngine;
    }

    public List<ConnectorDefinitionDto> getAllDefinitions() {
        return definitionRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public Optional<ConnectorDefinitionDto> getDefinitionById(String definitionId) {
        return definitionRepository.findById(definitionId).map(this::toDto);
    }

    @Transactional
    public ConnectorDefinitionDto createCustomDefinition(ConnectorDefinitionDto dto) {
        String id = (dto.definitionId() != null && !dto.definitionId().isBlank())
            ? dto.definitionId()
            : "conn-custom-" + UUID.randomUUID().toString().substring(0, 8);

        ConnectorDefinitionEntity entity = new ConnectorDefinitionEntity();
        entity.setDefinitionId(id);
        entity.setName(dto.name());
        entity.setCategory(dto.category() != null ? dto.category() : "CUSTOM");
        entity.setProtocol(dto.protocol() != null ? dto.protocol() : "CUSTOM");
        entity.setDescription(dto.description());
        entity.setIcon(dto.icon() != null ? dto.icon() : "cpu");
        entity.setComposite(dto.composite());
        String streamRole = dto.streamRole();
        if (streamRole == null || streamRole.isBlank()) {
            streamRole = "SOURCE".equalsIgnoreCase(dto.category()) ? "START" : ("SINK".equalsIgnoreCase(dto.category()) ? "END" : "MIDDLE");
        }
        entity.setStreamRole(streamRole);
        entity.setPropertyManifest(dto.propertyManifest() != null ? dto.propertyManifest() : "{\"properties\":[]}");
        entity.setBuiltIn(false);
        entity.setVersion(1);
        entity.setCreatedAt(Instant.now());
        entity.setUpdatedAt(Instant.now());

        ConnectorDefinitionEntity saved = definitionRepository.save(entity);
        log.info("Created custom connector definition: id={}, name={}", saved.getDefinitionId(), saved.getName());
        return toDto(saved);
    }

    @Transactional
    public boolean deleteCustomDefinition(String definitionId) {
        return definitionRepository.findById(definitionId)
            .map(entity -> {
                if (entity.isBuiltIn()) {
                    throw new IllegalArgumentException("Cannot delete built-in node definition: " + definitionId);
                }
                definitionRepository.delete(entity);
                log.info("Deleted custom node definition: {}", definitionId);
                return true;
            })
            .orElse(false);
    }

    public List<ConnectorInstanceDto> getAllInstances() {
        return instanceRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    public Optional<ConnectorInstanceDto> getInstanceById(String instanceId) {
        return instanceRepository.findById(instanceId).map(this::toDto);
    }

    @Transactional
    public ConnectorInstanceDto saveInstance(ConnectorInstanceDto dto) {
        String id = (dto.instanceId() != null && !dto.instanceId().isBlank())
            ? dto.instanceId()
            : "inst-" + UUID.randomUUID().toString().substring(0, 8);

        ConnectorInstanceEntity entity = instanceRepository.findById(id).orElseGet(() -> {
            ConnectorInstanceEntity e = new ConnectorInstanceEntity();
            e.setInstanceId(id);
            e.setCreatedAt(Instant.now());
            return e;
        });

        entity.setDefinitionId(dto.definitionId());
        entity.setName(dto.name());
        entity.setDescription(dto.description());
        entity.setConfiguration(dto.configuration() != null ? dto.configuration() : "{}");
        entity.setVersion(dto.version() > 0 ? dto.version() : entity.getVersion() + 1);
        entity.setActive(dto.active());
        entity.setCreatedBy(dto.createdBy() != null ? dto.createdBy() : "admin");
        entity.setUpdatedAt(Instant.now());

        ConnectorInstanceEntity saved = instanceRepository.save(entity);
        log.info("Saved connector instance: id={}, definitionId={}", saved.getInstanceId(), saved.getDefinitionId());
        return toDto(saved);
    }

    /**
     * Executes an interactive dry-run / sandbox test for a connector with sample data.
     */
    public ConnectorDryRunResultDto dryRun(ConnectorDryRunRequestDto request) {
        long start = System.nanoTime();
        List<String> logs = new ArrayList<>();
        List<Map<String, Object>> previewRecords = new ArrayList<>();
        String activeBranch = "pass";
        Map<String, Object> enrichedRecord = new LinkedHashMap<>();

        try {
            logs.add("Initiating dry-run for protocol: " + request.protocol());
            String sample = request.sampleInput() != null ? request.sampleInput().trim() : "";

            if ("CSV".equalsIgnoreCase(request.protocol())) {
                logs.add("Executing CSV parser sandbox simulation...");
                String[] lines = sample.isEmpty()
                    ? new String[]{
                        "customer_id,name,email,balance,status",
                        "1001,Acme Corp,ops@acme.com,125000.50,ACTIVE",
                        "1002,Global Freight,info@gf.org,45200.00,PENDING",
                        "1003,Starlight LLC,admin@starlight.io,9800.75,ACTIVE"
                      }
                    : sample.split("\\r?\\n");

                if (lines.length > 0) {
                    String[] headers = lines[0].split(",");
                    logs.add("Detected " + headers.length + " headers in sample CSV: " + Arrays.toString(headers));

                    for (int i = 1; i < lines.length; i++) {
                        String line = lines[i].trim();
                        if (line.isEmpty()) continue;
                        String[] values = line.split(",");
                        Map<String, Object> record = new LinkedHashMap<>();
                        for (int h = 0; h < headers.length; h++) {
                            String key = headers[h].trim();
                            String val = h < values.length ? values[h].trim() : "";
                            record.put(key, val);
                        }
                        previewRecords.add(record);
                    }
                }
                logs.add("Successfully parsed " + previewRecords.size() + " records from CSV sample stream.");
                activeBranch = "out";

            } else if ("COMPOSITE_SUBFLOW".equalsIgnoreCase(request.protocol())) {
                logs.add("Simulating Encapsulated Composite Sub-Flow (Request ➔ Response Pipeline)...");
                logs.add("1. Outbound request payload synthesized from stream record.");
                logs.add("2. Target downstream service responded: HTTP 200 OK.");
                logs.add("3. Extracted JSONPath attributes and evaluated dynamic response rules.");

                Map<String, Object> sampleRecord = new LinkedHashMap<>();
                sampleRecord.put("account_id", "ACC-9921");
                sampleRecord.put("enrichment_tier", "GOLD");
                sampleRecord.put("fraud_score", 0.02);
                sampleRecord.put("verified", true);
                sampleRecord.put("subflow_execution", "COMPLETED");
                previewRecords.add(sampleRecord);

                enrichedRecord.putAll(sampleRecord);
                enrichedRecord.put("http_status", 200);
                enrichedRecord.put("enriched_at", Instant.now().toString());
                activeBranch = "pass";
                logs.add("Matched routing pathway port: 'pass' -> Next step in pipeline.");

            } else if ("RETRY_GATEWAY".equalsIgnoreCase(request.protocol())) {
                logs.add("Evaluating Retry & Delay Gateway routing...");
                int maxRetries = 3;
                int currentRetry = 1;
                if (request.parameters() != null && request.parameters().containsKey("maxRetries")) {
                    try {
                        maxRetries = Integer.parseInt(request.parameters().get("maxRetries").toString());
                    } catch (Exception ignored) {}
                }

                logs.add("Gateway configured with Max Retries = " + maxRetries + ", Backoff Multiplier = 2.0x");
                logs.add("Simulated buffer delay queue: 2000ms elapsed.");

                Map<String, Object> sampleRecord = new LinkedHashMap<>();
                sampleRecord.put("retry_count", currentRetry);
                sampleRecord.put("max_retries", maxRetries);
                sampleRecord.put("gateway_action", "RESUBMIT_TO_PIPELINE");
                sampleRecord.put("buffered_at", Instant.now().toString());
                previewRecords.add(sampleRecord);

                enrichedRecord.putAll(sampleRecord);
                activeBranch = currentRetry <= maxRetries ? "retry_attempt" : "retry_exhausted";
                logs.add("Active branch pathway selected: '" + activeBranch + "'.");

            } else if ("REST_JSON".equalsIgnoreCase(request.protocol())) {
                logs.add("Executing REST JSON Request/Response simulation...");
                Map<String, Object> mockRes = new LinkedHashMap<>();
                mockRes.put("status", "SUCCESS");
                mockRes.put("httpStatusCode", 200);
                mockRes.put("latencyMs", 14);
                mockRes.put("enrichedAt", Instant.now().toString());

                Map<String, Object> sampleRecord = new LinkedHashMap<>();
                sampleRecord.put("account_id", "ACC-9921");
                sampleRecord.put("enrichment_tier", "GOLD");
                sampleRecord.put("fraud_score", 0.02);
                sampleRecord.put("verified", true);
                previewRecords.add(sampleRecord);

                enrichedRecord.putAll(sampleRecord);
                activeBranch = "pass";
                logs.add("Mock REST endpoint responded 200 OK with enriched record attributes.");

            } else if ("SOAP_XML".equalsIgnoreCase(request.protocol())) {
                logs.add("Executing SOAP XML Envelope and XPath extraction simulation...");
                Map<String, Object> sampleRecord = new LinkedHashMap<>();
                sampleRecord.put("soap_response_code", "S200_PROCESSED");
                sampleRecord.put("transaction_ref", "TX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
                sampleRecord.put("clearance_status", "CLEARED");
                previewRecords.add(sampleRecord);

                enrichedRecord.putAll(sampleRecord);
                activeBranch = "pass";
                logs.add("XPath extraction evaluated successfully on SOAP Body.");

            } else {
                logs.add("Executing custom node handler...");
                Map<String, Object> sampleRecord = new LinkedHashMap<>();
                sampleRecord.put("custom_status", "EXECUTED");
                sampleRecord.put("processed_timestamp", Instant.now().toString());
                previewRecords.add(sampleRecord);

                enrichedRecord.putAll(sampleRecord);
                activeBranch = "pass";
            }

            if (request.customCode() != null && !request.customCode().trim().isEmpty()) {
                String hookType = request.codeHookType() != null ? request.codeHookType() : "TRANSFORM";
                logs.add("Executing custom code hook (" + hookType + ") via Janino Sandbox...");
                long scriptStart = System.nanoTime();
                Map<String, Object> inputMap = previewRecords.isEmpty() ? new LinkedHashMap<>() : previewRecords.get(0);
                Map<String, Object> headers = new LinkedHashMap<>();
                headers.put("X-Simulation", "true");
                headers.put("X-Simulation-Protocol", request.protocol() != null ? request.protocol() : "CUSTOM");
                Map<String, Object> configMap = new LinkedHashMap<>();
                if (request.parameters() != null) {
                    configMap.putAll(request.parameters());
                }

                Map<String, Object> transformed = scriptEngine.executeHook(
                    request.customCode(),
                    inputMap,
                    headers,
                    configMap,
                    5000
                );
                long scriptMicros = (System.nanoTime() - scriptStart) / 1000;
                logs.add("Custom script hook executed successfully in " + scriptMicros + " microseconds.");
                previewRecords.clear();
                previewRecords.add(transformed);
                enrichedRecord.putAll(transformed);
            }

            long durationMicros = (System.nanoTime() - start) / 1000;
            logs.add("Dry run completed in " + durationMicros + " microseconds.");

            return new ConnectorDryRunResultDto(
                true,
                durationMicros,
                previewRecords.size(),
                previewRecords,
                objectMapper.writeValueAsString(previewRecords),
                null,
                logs,
                activeBranch,
                enrichedRecord
            );

        } catch (Exception e) {
            long durationMicros = (System.nanoTime() - start) / 1000;
            logs.add("Error during dry run: " + e.getMessage());
            return new ConnectorDryRunResultDto(
                false,
                durationMicros,
                0,
                Collections.emptyList(),
                "",
                e.getMessage(),
                logs,
                "fail",
                Collections.emptyMap()
            );
        }
    }

    private ConnectorDefinitionDto toDto(ConnectorDefinitionEntity e) {
        String streamRole = e.getStreamRole();
        if (streamRole == null || streamRole.isBlank()) {
            streamRole = "SOURCE".equalsIgnoreCase(e.getCategory()) ? "START" : ("SINK".equalsIgnoreCase(e.getCategory()) ? "END" : "MIDDLE");
        }
        String name = e.getName() != null ? e.getName().replace(" Connector", " Node") : "";
        String desc = e.getDescription() != null ? e.getDescription().replace("connector", "node").replace("Connector", "Node") : "";
        return new ConnectorDefinitionDto(
            e.getDefinitionId(),
            name,
            e.getCategory(),
            e.getProtocol(),
            desc,
            e.getIcon(),
            e.isComposite(),
            e.getPropertyManifest(),
            e.isBuiltIn(),
            e.getVersion(),
            streamRole
        );
    }

    private ConnectorInstanceDto toDto(ConnectorInstanceEntity e) {
        return new ConnectorInstanceDto(
            e.getInstanceId(),
            e.getDefinitionId(),
            e.getName(),
            e.getDescription(),
            e.getConfiguration(),
            e.getVersion(),
            e.isActive(),
            e.getCreatedBy()
        );
    }
}
