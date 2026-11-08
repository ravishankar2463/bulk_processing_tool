package com.bulkprocessor.dynamic.compiler;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.regex.Pattern;

import org.codehaus.janino.ClassBodyEvaluator;
import org.springframework.stereotype.Service;

import com.bulkprocessor.dto.ScriptValidationResultDto;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;

/**
 * Sandboxed In-Memory Java 21 / Janino Compiler and Execution Engine for
 * Connector Custom Code Hooks (preRequest, postResponse, record mapper, and execution script).
 */
@Service
public class ConnectorScriptEngine {

    public interface ConnectorHook {
        Map<String, Object> execute(
            Map<String, Object> input,
            Map<String, Object> headers,
            Map<String, Object> config
        ) throws Exception;
    }

    private static final List<Pattern> PROHIBITED_PATTERNS = List.of(
        Pattern.compile("System\\s*\\.\\s*(exit|gc|setProperties|load)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Runtime\\s*\\.\\s*getRuntime", Pattern.CASE_INSENSITIVE),
        Pattern.compile("ProcessBuilder", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*lang\\s*\\.\\s*reflect", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*io\\s*\\.\\s*(File|RandomAccessFile|FileInputStream|FileOutputStream|FileReader|FileWriter)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*nio\\s*\\.\\s*file", Pattern.CASE_INSENSITIVE),
        Pattern.compile("(java|javax)\\s*\\.\\s*net", Pattern.CASE_INSENSITIVE),
        Pattern.compile("ClassLoader", Pattern.CASE_INSENSITIVE),
        Pattern.compile("SecurityManager", Pattern.CASE_INSENSITIVE),
        Pattern.compile("sun\\s*\\.\\s*misc\\s*\\.\\s*Unsafe", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*lang\\s*\\.\\s*management", Pattern.CASE_INSENSITIVE)
    );

    /**
     * Validates a script's compilation and security without executing it.
     */
    public ScriptValidationResultDto validateScript(String script, String hookType) {
        if (script == null || script.trim().isEmpty()) {
            return ScriptValidationResultDto.success(0);
        }

        long start = System.nanoTime();
        try {
            validateSecurity(script);
            compileHook(script);
            long micros = TimeUnit.NANOSECONDS.toMicros(System.nanoTime() - start);
            return ScriptValidationResultDto.success(micros);
        } catch (SecurityViolationException sve) {
            long micros = TimeUnit.NANOSECONDS.toMicros(System.nanoTime() - start);
            return ScriptValidationResultDto.error(sve.getMessage(), 1, micros);
        } catch (Exception ex) {
            long micros = TimeUnit.NANOSECONDS.toMicros(System.nanoTime() - start);
            int line = extractLineNumber(ex.getMessage());
            return ScriptValidationResultDto.error("Compilation error: " + ex.getMessage(), line, micros);
        }
    }

    /**
     * Compiles and executes a script hook with a safety timeout.
     */
    public Map<String, Object> executeHook(
        String script,
        Map<String, Object> input,
        Map<String, Object> headers,
        Map<String, Object> config,
        long timeoutMs
    ) throws Exception {
        if (script == null || script.trim().isEmpty()) {
            return input != null ? input : new LinkedHashMap<>();
        }

        validateSecurity(script);
        ConnectorHook hook = compileHook(script);

        Map<String, Object> safeInput = input != null ? new LinkedHashMap<>(input) : new LinkedHashMap<>();
        Map<String, Object> safeHeaders = headers != null ? new LinkedHashMap<>(headers) : new LinkedHashMap<>();
        Map<String, Object> safeConfig = config != null ? new LinkedHashMap<>(config) : new LinkedHashMap<>();

        ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            Future<Map<String, Object>> future = executor.submit(() -> hook.execute(safeInput, safeHeaders, safeConfig));
            long maxWait = timeoutMs > 0 ? timeoutMs : 5000;
            return future.get(maxWait, TimeUnit.MILLISECONDS);
        } finally {
            executor.shutdownNow();
        }
    }

    private ConnectorHook compileHook(String methodBody) throws Exception {
        String classBody = """
            public java.util.Map execute(
                java.util.Map input,
                java.util.Map headers,
                java.util.Map config
            ) throws Exception {
                %s
            }
            """.formatted(methodBody);

        ClassBodyEvaluator cbe = new ClassBodyEvaluator();
        cbe.setImplementedInterfaces(new Class<?>[] { ConnectorHook.class });
        cbe.cook(classBody);

        @SuppressWarnings("unchecked")
        Class<? extends ConnectorHook> clazz = (Class<? extends ConnectorHook>) cbe.getClazz();
        return clazz.getDeclaredConstructor().newInstance();
    }

    private void validateSecurity(String script) {
        for (Pattern pattern : PROHIBITED_PATTERNS) {
            if (pattern.matcher(script).find()) {
                throw new SecurityViolationException(
                    "Security Violation: Script contains prohibited invocation or class: " + pattern.pattern(),
                    pattern.pattern()
                );
            }
        }
    }

    private int extractLineNumber(String errorMsg) {
        if (errorMsg == null) return 1;
        Pattern p = Pattern.compile("Line (\\d+)", Pattern.CASE_INSENSITIVE);
        var m = p.matcher(errorMsg);
        if (m.find()) {
            try {
                int line = Integer.parseInt(m.group(1));
                // subtract the wrapper method header line offset
                return Math.max(1, line - 5);
            } catch (NumberFormatException ignored) {}
        }
        return 1;
    }
}
