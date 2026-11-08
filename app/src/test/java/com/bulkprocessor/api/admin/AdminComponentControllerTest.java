package com.bulkprocessor.api.admin;

import com.bulkprocessor.BulkProcessorApplication;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.repository.ComponentInstanceRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = BulkProcessorApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Admin Component REST Controller Integration Tests")
class AdminComponentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ComponentInstanceRepository componentInstanceRepository;

    @Test
    @DisplayName("Creates a new programmable component instance via Admin API")
    void shouldCreateComponentInstance() throws Exception {
        String requestJson = """
            {
              "instanceId": "api-cust-val",
              "componentType": "VALIDATOR",
              "name": "API Customer Validator",
              "description": "Validation rule created via API",
              "executionMode": "CODE_SNIPPET",
              "language": "JAVA",
              "sourceCode": "return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();"
            }
            """;

        mockMvc.perform(post("/api/v1/admin/components")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.instanceId").value("api-cust-val"))
            .andExpect(jsonPath("$.name").value("API Customer Validator"));

        assertThat(componentInstanceRepository.findById("api-cust-val")).isPresent();
    }

    @Test
    @DisplayName("Executes a sandbox test run for user-supplied code snippet")
    void shouldExecuteSandboxTestRun() throws Exception {
        String testPayload = """
            {
              "componentType": "VALIDATOR",
              "language": "JAVA",
              "sourceCode": "if (!record.containsKey(\\"email\\")) return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(\\"MISSING_EMAIL\\", \\"No email\\"); return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();",
              "samplePayload": "{\\"name\\": \\"Alice\\"}"
            }
            """;

        mockMvc.perform(post("/api/v1/admin/components/test-run")
                .contentType(MediaType.APPLICATION_JSON)
                .content(testPayload))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.compilationSuccessful").value(true))
            .andExpect(jsonPath("$.result.isValid").value(false))
            .andExpect(jsonPath("$.result.errorCode").value("MISSING_EMAIL"));
    }

    @Test
    @DisplayName("Lists all active component instances")
    void shouldListActiveComponents() throws Exception {
        ComponentInstanceEntity entity = new ComponentInstanceEntity();
        entity.setInstanceId("list-comp-1");
        entity.setComponentType("SPLITTER");
        entity.setName("Custom Splitter");
        entity.setExecutionMode("DECLARATIVE_WIZARD");
        entity.setLanguage("JAVA");
        entity.setActive(true);
        componentInstanceRepository.save(entity);

        mockMvc.perform(get("/api/v1/admin/components"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }
}

