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

    @Test
    @DisplayName("Caches compiled validator instances and supports eviction")
    void shouldCacheAndEvictValidators() throws Exception {
        String script = "return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();";
        DynamicValidatorScript compiled = compiler.compileValidator("cached-v1", script);

        assertThat(compiler.getCachedValidator("cached-v1")).isSameAs(compiled);

        compiler.evict("cached-v1");
        assertThat(compiler.getCachedValidator("cached-v1")).isNull();
    }

    @Test
    @DisplayName("Blocks local file access and I/O streams in sandbox")
    void shouldBlockFileIOAccessInSandbox() {
        String fileScript = """
            new java.io.FileInputStream("/etc/passwd");
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-file", fileScript)
        );
    }

    @Test
    @DisplayName("Blocks java.nio and network socket operations in sandbox")
    void shouldBlockNioAndNetworkInSandbox() {
        String nioScript = """
            java.nio.file.Paths.get("/tmp/secret");
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-nio", nioScript)
        );

        String netScript = """
            new java.net.Socket("169.254.169.254", 80);
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-net", netScript)
        );

        String unsafeScript = """
            sun.misc.Unsafe.getUnsafe();
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-unsafe", unsafeScript)
        );

        String mgmtScript = """
            java.lang.management.ManagementFactory.getRuntimeMXBean();
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        assertThrows(SecurityViolationException.class, () ->
            compiler.compileValidator("malicious-mgmt", mgmtScript)
        );
    }

    @Test
    @DisplayName("Compiles transient validator without leaking into memory cache")
    void shouldCompileTransientValidatorWithoutLeakingMemory() throws Exception {
        String script = "return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();";
        DynamicValidatorScript transientVal = compiler.compileTransientValidator(script);

        assertThat(transientVal).isNotNull();
        assertThat(transientVal.validate(Map.of(), dummyContext).isValid()).isTrue();
        assertThat(compiler.getCachedValidator("transient")).isNull();
    }
}

