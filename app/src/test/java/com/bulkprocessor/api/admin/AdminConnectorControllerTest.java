package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.dto.ConnectorDefinitionDto;
import com.bulkprocessor.dto.ConnectorDryRunRequestDto;
import com.bulkprocessor.dto.ConnectorInstanceDto;
import com.bulkprocessor.storage.repository.ConnectorDefinitionRepository;
import com.bulkprocessor.storage.repository.ConnectorInstanceRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Connector Controller Integration Tests")
class AdminConnectorControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ConnectorDefinitionRepository definitionRepository;

    @Autowired
    private ConnectorInstanceRepository instanceRepository;

    @Test
    @DisplayName("Fetches connector definitions catalog including built-ins")
    void shouldFetchDefinitions() throws Exception {
        mockMvc.perform(get("/api/v1/admin/connectors/definitions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", not(empty())))
            .andExpect(jsonPath("$[?(@.definitionId == 'conn-def-csv')].protocol", contains("CSV")))
            .andExpect(jsonPath("$[?(@.definitionId == 'conn-def-csv')].streamRole", contains("START")));
    }

    @Test
    @DisplayName("Fetches node definitions catalog via /api/v1/admin/nodes/definitions")
    void shouldFetchNodeDefinitionsViaNodesEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/admin/nodes/definitions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", not(empty())))
            .andExpect(jsonPath("$[?(@.definitionId == 'conn-def-csv')].protocol", contains("CSV")))
            .andExpect(jsonPath("$[?(@.definitionId == 'conn-def-csv')].streamRole", contains("START")));
    }

    @Test
    @DisplayName("Creates, fetches and deletes a custom connector definition")
    void shouldCreateAndManageCustomConnector() throws Exception {
        ConnectorDefinitionDto customDto = new ConnectorDefinitionDto(
            "conn-custom-kafka-test",
            "Kafka Event Publisher",
            "SINK",
            "KAFKA",
            "Streams records to Kafka topic",
            "send",
            false,
            "{\"properties\":[{\"key\":\"topic\",\"label\":\"Kafka Topic\",\"type\":\"string\",\"required\":true}]}",
            false,
            1,
            "END"
        );

        // Create
        mockMvc.perform(post("/api/v1/admin/connectors/definitions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(customDto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.definitionId", is("conn-custom-kafka-test")))
            .andExpect(jsonPath("$.protocol", is("KAFKA")))
            .andExpect(jsonPath("$.streamRole", is("END")));

        // Fetch
        mockMvc.perform(get("/api/v1/admin/connectors/definitions/conn-custom-kafka-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name", is("Kafka Event Publisher")));

        // Delete
        mockMvc.perform(delete("/api/v1/admin/connectors/definitions/conn-custom-kafka-test"))
            .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Saves and fetches a connector instance configuration")
    void shouldSaveAndFetchConnectorInstance() throws Exception {
        ConnectorInstanceDto instanceDto = new ConnectorInstanceDto(
            "inst-csv-orders-test",
            "conn-def-csv",
            "Orders CSV Ingestion",
            "Configured CSV source for bulk orders",
            "{\"sourceType\":\"S3_BUCKET\",\"s3Uri\":\"s3://orders-bucket/*.csv\",\"delimiter\":\",\",\"hasHeader\":true,\"fields\":[{\"name\":\"order_id\",\"type\":\"INTEGER\",\"required\":true}]}",
            1,
            true,
            "admin"
        );

        mockMvc.perform(post("/api/v1/admin/connectors/instances")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(instanceDto)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.instanceId", is("inst-csv-orders-test")))
            .andExpect(jsonPath("$.name", is("Orders CSV Ingestion")));

        mockMvc.perform(get("/api/v1/admin/connectors/instances/inst-csv-orders-test"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.definitionId", is("conn-def-csv")));
    }

    @Test
    @DisplayName("Executes an interactive dry-run sandbox test for CSV connector")
    void shouldExecuteDryRunForCsv() throws Exception {
        ConnectorDryRunRequestDto dryRun = new ConnectorDryRunRequestDto(
            "CSV",
            "{\"delimiter\":\",\",\"hasHeader\":true}",
            "id,sku,amount\n101,ITEM-A,49.99\n102,ITEM-B,12.50",
            Map.of()
        );

        mockMvc.perform(post("/api/v1/admin/connectors/dry-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dryRun)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.recordsExtracted", is(2)))
            .andExpect(jsonPath("$.previewRecords[0].sku", is("ITEM-A")));
    }

    @Test
    @DisplayName("Validates valid and insecure Janino Java 21 scripts")
    void shouldValidateJaninoScripts() throws Exception {
        // 1. Valid script
        String validScript = "input.put(\"transformed_by\", \"JaninoCompiler\"); return input;";
        com.bulkprocessor.dto.ScriptValidationRequestDto validReq = new com.bulkprocessor.dto.ScriptValidationRequestDto(validScript, "TRANSFORM");

        mockMvc.perform(post("/api/v1/admin/connectors/validate-script")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid", is(true)))
            .andExpect(jsonPath("$.errorMessage", nullValue()));

        // 2. Insecure script (System.exit violation)
        String insecureScript = "System.exit(1); return input;";
        com.bulkprocessor.dto.ScriptValidationRequestDto insecureReq = new com.bulkprocessor.dto.ScriptValidationRequestDto(insecureScript, "TRANSFORM");

        mockMvc.perform(post("/api/v1/admin/connectors/validate-script")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(insecureReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid", is(false)))
            .andExpect(jsonPath("$.errorMessage", containsString("Security Violation")));
    }

    @Test
    @DisplayName("Parses sample JSON and JSON Schema to auto-generate request body templates and JSONPaths")
    void shouldParseJsonSampleAndSchema() throws Exception {
        // Sample JSON parse
        String sampleJson = "{\"customerId\": 4021, \"name\": \"Global Logistics\", \"active\": true, \"address\": {\"city\": \"Singapore\"}}";
        com.bulkprocessor.dto.SchemaParseRequestDto parseReq = new com.bulkprocessor.dto.SchemaParseRequestDto(sampleJson, false, "REQUEST");

        mockMvc.perform(post("/api/v1/admin/connectors/parse-json-structure")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(parseReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.generatedTemplate", containsString("$${customerId}")))
            .andExpect(jsonPath("$.jsonPathMappings['$.customerId']", is("customer_id")))
            .andExpect(jsonPath("$.jsonPathMappings['$.address.city']", is("city")));
    }

    @Test
    @DisplayName("Validates WSDL, discovers operations, synthesizes SOAP envelopes and extracts XPaths")
    void shouldInspectWsdlAndGenerateSoapArtifacts() throws Exception {
        String sampleWsdl = """
            <definitions xmlns="http://schemas.xmlsoap.org/wsdl/"
                         xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
                         xmlns:tns="http://banking.enterprise.corp/account"
                         targetNamespace="http://banking.enterprise.corp/account">
              <portType name="AccountPortType">
                <operation name="GetAccountBalance">
                  <input message="tns:GetAccountBalanceRequest"/>
                  <output message="tns:GetAccountBalanceResponse"/>
                </operation>
              </portType>
            </definitions>
            """;

        com.bulkprocessor.dto.WsdlValidationRequestDto wsdlReq = new com.bulkprocessor.dto.WsdlValidationRequestDto(sampleWsdl, false);

        mockMvc.perform(post("/api/v1/admin/connectors/validate-wsdl")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(wsdlReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid", is(true)))
            .andExpect(jsonPath("$.targetNamespace", is("http://banking.enterprise.corp/account")))
            .andExpect(jsonPath("$.operations[0].name", is("GetAccountBalance")));

        // Generate SOAP Envelope
        com.bulkprocessor.dto.SoapEnvelopeGenerateRequestDto envReq = new com.bulkprocessor.dto.SoapEnvelopeGenerateRequestDto(
            "GetAccountBalance",
            "http://banking.enterprise.corp/account",
            "1.1",
            java.util.List.of("accountId", "currency")
        );

        mockMvc.perform(post("/api/v1/admin/connectors/generate-soap-envelope")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(envReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.envelopeXml", containsString("$${accountId}")))
            .andExpect(jsonPath("$.envelopeXml", containsString("<ns:GetAccountBalance>")));

        // Extract XPath mappings from XML response
        String sampleSoapRes = """
            <AccountResponse>
              <Status>ACTIVE</Status>
              <Balance currency="USD">95400.25</Balance>
            </AccountResponse>
            """;
        com.bulkprocessor.dto.XPathExtractRequestDto xpathReq = new com.bulkprocessor.dto.XPathExtractRequestDto(sampleSoapRes);

        mockMvc.perform(post("/api/v1/admin/connectors/generate-xpath-mappings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(xpathReq)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.xpathMappings['//AccountResponse/Status/text()']", is("status")))
            .andExpect(jsonPath("$.xpathMappings['//AccountResponse/Balance/@currency']", is("balance_currency")));
    }

    @Test
    @DisplayName("Executes dry-run with custom Janino code execution hook")
    void shouldExecuteDryRunWithCustomCodeHook() throws Exception {
        String customCode = """
            input.put("vip_customer", true);
            input.put("risk_category", "LOW");
            return input;
            """;

        ConnectorDryRunRequestDto dryRun = new ConnectorDryRunRequestDto(
            "REST_JSON",
            "{}",
            "",
            Map.of("tier", "ENTERPRISE"),
            customCode,
            "TRANSFORM"
        );

        mockMvc.perform(post("/api/v1/admin/connectors/dry-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dryRun)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success", is(true)))
            .andExpect(jsonPath("$.previewRecords[0].vip_customer", is(true)))
            .andExpect(jsonPath("$.previewRecords[0].risk_category", is("LOW")));
    }
}
