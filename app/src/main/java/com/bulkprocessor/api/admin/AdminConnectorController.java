package com.bulkprocessor.api.admin;

import com.bulkprocessor.dto.*;
import com.bulkprocessor.dynamic.compiler.ConnectorScriptEngine;
import com.bulkprocessor.service.ConnectorService;
import com.bulkprocessor.service.SchemaStructureService;
import com.bulkprocessor.service.WsdlInspectorService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/admin/nodes", "/api/v1/admin/connectors"})
@CrossOrigin(origins = "*")
public class AdminConnectorController {

    private final ConnectorService connectorService;
    private final SchemaStructureService schemaStructureService;
    private final WsdlInspectorService wsdlInspectorService;
    private final ConnectorScriptEngine scriptEngine;

    public AdminConnectorController(
        ConnectorService connectorService,
        SchemaStructureService schemaStructureService,
        WsdlInspectorService wsdlInspectorService,
        ConnectorScriptEngine scriptEngine
    ) {
        this.connectorService = connectorService;
        this.schemaStructureService = schemaStructureService;
        this.wsdlInspectorService = wsdlInspectorService;
        this.scriptEngine = scriptEngine;
    }

    @GetMapping("/definitions")
    public ResponseEntity<List<ConnectorDefinitionDto>> getDefinitions() {
        return ResponseEntity.ok(connectorService.getAllDefinitions());
    }

    @GetMapping("/definitions/{id}")
    public ResponseEntity<ConnectorDefinitionDto> getDefinitionById(@PathVariable String id) {
        return connectorService.getDefinitionById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/definitions")
    public ResponseEntity<ConnectorDefinitionDto> createCustomDefinition(@RequestBody ConnectorDefinitionDto dto) {
        ConnectorDefinitionDto created = connectorService.createCustomDefinition(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @DeleteMapping("/definitions/{id}")
    public ResponseEntity<Void> deleteCustomDefinition(@PathVariable String id) {
        boolean deleted = connectorService.deleteCustomDefinition(id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/instances")
    public ResponseEntity<List<ConnectorInstanceDto>> getInstances() {
        return ResponseEntity.ok(connectorService.getAllInstances());
    }

    @GetMapping("/instances/{id}")
    public ResponseEntity<ConnectorInstanceDto> getInstanceById(@PathVariable String id) {
        return connectorService.getInstanceById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/instances")
    public ResponseEntity<ConnectorInstanceDto> saveInstance(@RequestBody ConnectorInstanceDto dto) {
        ConnectorInstanceDto saved = connectorService.saveInstance(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/dry-run")
    public ResponseEntity<ConnectorDryRunResultDto> dryRun(@RequestBody ConnectorDryRunRequestDto request) {
        return ResponseEntity.ok(connectorService.dryRun(request));
    }

    @PostMapping("/parse-json-structure")
    public ResponseEntity<SchemaParseResultDto> parseJsonStructure(@RequestBody SchemaParseRequestDto request) {
        return ResponseEntity.ok(schemaStructureService.parseJsonStructure(request));
    }

    @PostMapping("/validate-wsdl")
    public ResponseEntity<WsdlValidationResultDto> validateWsdl(@RequestBody WsdlValidationRequestDto request) {
        return ResponseEntity.ok(wsdlInspectorService.validateAndInspectWsdl(request));
    }

    @PostMapping("/generate-soap-envelope")
    public ResponseEntity<SoapEnvelopeGenerateResultDto> generateSoapEnvelope(@RequestBody SoapEnvelopeGenerateRequestDto request) {
        return ResponseEntity.ok(wsdlInspectorService.generateSoapRequestEnvelope(request));
    }

    @PostMapping("/generate-xpath-mappings")
    public ResponseEntity<XPathExtractResultDto> generateXPathMappings(@RequestBody XPathExtractRequestDto request) {
        return ResponseEntity.ok(wsdlInspectorService.generateXPathMappings(request));
    }

    @PostMapping("/validate-script")
    public ResponseEntity<ScriptValidationResultDto> validateScript(@RequestBody ScriptValidationRequestDto request) {
        String script = request != null ? request.script() : "";
        String hookType = request != null ? request.hookType() : "TRANSFORM";
        return ResponseEntity.ok(scriptEngine.validateScript(script, hookType));
    }
}
