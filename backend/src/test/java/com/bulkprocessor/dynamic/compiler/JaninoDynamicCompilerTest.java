package com.bulkprocessor.dynamic.compiler;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DisplayName("Dynamic In-Memory Compiler & Security Sandbox Tests")
class JaninoDynamicCompilerTest {

    private DynamicScriptCompiler compiler;
    private JobContext dummyContext;

    @BeforeEach
    void setUp() {
        compiler = new DynamicScriptCompiler();
        dummyContext = new JobContext("j1", "f1", "file.csv", "s3://b/f1", "p1", Map.of(), System.currentTimeMillis());
    }

    @Test
    @DisplayName("Compiles and executes a valid dynamic Java validator script")
    void shouldCompileAndExecuteValidValidator() throws Exception {
        String script = """
            if (!record.containsKey("email") || !((String)record.get("email")).contains("@")) {
                return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("INVALID_EMAIL", "Email must contain @");
            }
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        DynamicValidatorScript validator = compiler.compileValidator("email-val-v1", script);

        // Valid test
        DynamicValidatorScript.ValidationResult validRes = validator.validate(Map.of("email", "john@example.com"), dummyContext);
        assertThat(validRes.isValid()).isTrue();

        // Invalid test
        DynamicValidatorScript.ValidationResult invalidRes = validator.validate(Map.of("email", "john_invalid"), dummyContext);
        assertThat(invalidRes.isValid()).isFalse();
        assertThat(invalidRes.errorCode()).isEqualTo("INVALID_EMAIL");
    }

    @Test
    @DisplayName("Blocks prohibited classes like System.exit from the dynamic script sandbox")
    void shouldBlockSystemCallsInSandbox() {
        String dangerousScript = """
            System.exit(1);
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-1", dangerousScript)
        );
    }

    @Test
    @DisplayName("Blocks Process execution and reflection from the dynamic script sandbox")
    void shouldBlockProcessExecutionAndReflection() {
        String runtimeScript = """
            Runtime.getRuntime().exec("calc.exe");
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-2", runtimeScript)
        );
    }
}

