package com.bulkprocessor.service;

import java.util.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.bulkprocessor.dto.SchemaParseRequestDto;
import com.bulkprocessor.dto.SchemaParseResultDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Service to parse JSON Schema documents or raw JSON sample payloads
 * to auto-generate request body templates and response JSONPath extraction mappings.
 */
@Service
public class SchemaStructureService {

    private static final Logger log = LoggerFactory.getLogger(SchemaStructureService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SchemaParseResultDto parseJsonStructure(SchemaParseRequestDto request) {
        if (request == null || request.input() == null || request.input().trim().isEmpty()) {
            return SchemaParseResultDto.failure(
                request != null ? request.targetMode() : "REQUEST",
                "Input JSON payload or Schema cannot be empty."
            );
        }

        String mode = request.targetMode() != null ? request.targetMode().toUpperCase() : "REQUEST";
        String trimmedInput = request.input().trim();

        try {
            JsonNode rootNode = objectMapper.readTree(trimmedInput);

            boolean isSchemaInput = request.isSchema() || isJsonSchema(rootNode);

            if (isSchemaInput) {
                return parseFormalJsonSchema(rootNode, mode);
            } else {
                return parseSampleJsonPayload(rootNode, mode);
            }
        } catch (Exception e) {
            log.warn("Failed to parse JSON input structure: {}", e.getMessage());
            return SchemaParseResultDto.failure(mode, "JSON parsing syntax error: " + e.getMessage());
        }
    }

    private boolean isJsonSchema(JsonNode node) {
        if (!node.isObject()) return false;
        return node.has("$schema") 
            || (node.has("properties") && node.has("type") && "object".equalsIgnoreCase(node.path("type").asText()));
    }

    private SchemaParseResultDto parseFormalJsonSchema(JsonNode schemaNode, String mode) {
        Map<String, String> fieldTypes = new LinkedHashMap<>();
        Map<String, String> jsonPathMappings = new LinkedHashMap<>();
        Map<String, Object> templateMap = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();

        JsonNode propertiesNode = schemaNode.path("properties");
        if (propertiesNode.isMissingNode() || !propertiesNode.isObject()) {
            warnings.add("Schema has no top-level 'properties' object defined.");
        } else {
            Iterator<Map.Entry<String, JsonNode>> fields = propertiesNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String fieldName = entry.getKey();
                JsonNode propDef = entry.getValue();

                String typeStr = propDef.path("type").asText("string").toUpperCase();
                fieldTypes.put(fieldName, typeStr);

                // Use double dollar sign for Flyway placeholder safety
                templateMap.put(fieldName, "$${" + fieldName + "}");
                jsonPathMappings.put("$." + fieldName, toSnakeCase(fieldName));
            }
        }

        String generatedTemplate = "";
        try {
            generatedTemplate = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(templateMap);
        } catch (Exception ignored) {}

        return new SchemaParseResultDto(
            true,
            mode,
            fieldTypes,
            generatedTemplate,
            jsonPathMappings,
            warnings
        );
    }

    private SchemaParseResultDto parseSampleJsonPayload(JsonNode rootNode, String mode) {
        Map<String, String> fieldTypes = new LinkedHashMap<>();
        Map<String, String> jsonPathMappings = new LinkedHashMap<>();
        Map<String, Object> templateMap = new LinkedHashMap<>();
        List<String> warnings = new ArrayList<>();

        if (rootNode.isObject()) {
            traverseObjectNode("$", rootNode, fieldTypes, jsonPathMappings, templateMap);
        } else if (rootNode.isArray() && rootNode.size() > 0) {
            JsonNode firstElem = rootNode.get(0);
            if (firstElem.isObject()) {
                traverseObjectNode("$[0]", firstElem, fieldTypes, jsonPathMappings, templateMap);
                warnings.add("Top-level array detected. Mapped structure from the first array element.");
            } else {
                fieldTypes.put("items", "ARRAY_" + inferType(firstElem));
                templateMap.put("items", List.of("$${item}"));
                jsonPathMappings.put("$[*]", "items");
            }
        } else {
            return SchemaParseResultDto.failure(mode, "JSON input must be a valid JSON Object or Array of Objects.");
        }

        String generatedTemplate = "";
        try {
            generatedTemplate = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(templateMap);
        } catch (Exception ignored) {}

        return new SchemaParseResultDto(
            true,
            mode,
            fieldTypes,
            generatedTemplate,
            jsonPathMappings,
            warnings
        );
    }

    private void traverseObjectNode(
        String currentPath,
        JsonNode node,
        Map<String, String> fieldTypes,
        Map<String, String> jsonPathMappings,
        Map<String, Object> templateMap
    ) {
        Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            String key = entry.getKey();
            JsonNode val = entry.getValue();
            String nextPath = "$".equals(currentPath) ? "$." + key : currentPath + "." + key;
            String normalizedKey = toSnakeCase(key);

            if (val.isObject()) {
                Map<String, Object> childTemplate = new LinkedHashMap<>();
                traverseObjectNode(nextPath, val, fieldTypes, jsonPathMappings, childTemplate);
                templateMap.put(key, childTemplate);
                fieldTypes.put(key, "OBJECT");
            } else if (val.isArray()) {
                fieldTypes.put(key, "ARRAY");
                jsonPathMappings.put(nextPath + "[*]", normalizedKey);
                if (val.size() > 0 && val.get(0).isObject()) {
                    Map<String, Object> childTemplate = new LinkedHashMap<>();
                    traverseObjectNode(nextPath + "[0]", val.get(0), fieldTypes, jsonPathMappings, childTemplate);
                    templateMap.put(key, List.of(childTemplate));
                } else {
                    templateMap.put(key, List.of("$${" + key + "_item}"));
                }
            } else {
                fieldTypes.put(key, inferType(val));
                templateMap.put(key, "$${" + key + "}");
                jsonPathMappings.put(nextPath, normalizedKey);
            }
        }
    }

    private String inferType(JsonNode val) {
        if (val.isBoolean()) return "BOOLEAN";
        if (val.isInt() || val.isLong()) return "INTEGER";
        if (val.isDouble() || val.isFloat() || val.isBigDecimal()) return "DECIMAL";
        if (val.isNull()) return "STRING";
        return "STRING";
    }

    private String toSnakeCase(String str) {
        if (str == null) return "";
        return str.replaceAll("([a-z])([A-Z]+)", "$1_$2")
                  .replaceAll("[^a-zA-Z0-9_]", "_")
                  .toLowerCase();
    }
}
