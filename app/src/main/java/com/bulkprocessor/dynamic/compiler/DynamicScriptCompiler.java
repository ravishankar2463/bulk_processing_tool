package com.bulkprocessor.dynamic.compiler;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

import org.codehaus.janino.ClassBodyEvaluator;

import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;

/**
 * In-memory compiler for user-supplied dynamic script snippets.
 * Enforces security sandbox validation before compiling into bytecode via
 * Janino.
 */
@org.springframework.stereotype.Component
public class DynamicScriptCompiler {

    private final Map<String, DynamicValidatorScript> validatorCache = new ConcurrentHashMap<>();

    private static final List<Pattern> PROHIBITED_PATTERNS = List.of(
            Pattern.compile("System\\s*\\.\\s*(exit|gc|setProperties|load)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("Runtime\\s*\\.\\s*getRuntime", Pattern.CASE_INSENSITIVE),
            Pattern.compile("ProcessBuilder", Pattern.CASE_INSENSITIVE),
            Pattern.compile("java\\s*\\.\\s*lang\\s*\\.\\s*reflect", Pattern.CASE_INSENSITIVE),
            Pattern.compile(
                    "java\\s*\\.\\s*io\\s*\\.\\s*(File|RandomAccessFile|FileInputStream|FileOutputStream|FileReader|FileWriter)",
                    Pattern.CASE_INSENSITIVE),
            Pattern.compile("java\\s*\\.\\s*nio\\s*\\.\\s*file", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(java|javax)\\s*\\.\\s*net", Pattern.CASE_INSENSITIVE),
            Pattern.compile("ClassLoader", Pattern.CASE_INSENSITIVE),
            Pattern.compile("SecurityManager", Pattern.CASE_INSENSITIVE),
            Pattern.compile("sun\\s*\\.\\s*misc\\s*\\.\\s*Unsafe", Pattern.CASE_INSENSITIVE),
            Pattern.compile("java\\s*\\.\\s*lang\\s*\\.\\s*management", Pattern.CASE_INSENSITIVE));

    /**
     * Compiles a dynamic validator method body into an executable
     * DynamicValidatorScript instance.
     */
    public DynamicValidatorScript compileValidator(String instanceId, String methodBody) throws Exception {
        DynamicValidatorScript instance = compileTransientValidator(methodBody);
        validatorCache.put(instanceId, instance);
        return instance;
    }

    /**
     * Compiles a dynamic validator method body into an executable
     * DynamicValidatorScript instance
     * without caching it in memory. Used for transient test runs to prevent memory
     * leaks.
     */
    public DynamicValidatorScript compileTransientValidator(String methodBody) throws Exception {
        validateSecurity(methodBody);

        String classBody = """
                public com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult validate(
                    java.util.Map record, com.bulkprocessor.core.api.JobContext context) {
                    %s
                }
                """.formatted(methodBody);

        ClassBodyEvaluator cbe = new ClassBodyEvaluator();
        cbe.setImplementedInterfaces(new Class<?>[] { DynamicValidatorScript.class });
        cbe.cook(classBody);

        @SuppressWarnings("unchecked")
        Class<? extends DynamicValidatorScript> clazz = (Class<? extends DynamicValidatorScript>) cbe.getClazz();
        return clazz.getDeclaredConstructor().newInstance();
    }

    public DynamicValidatorScript getCachedValidator(String instanceId) {
        return validatorCache.get(instanceId);
    }

    public void evict(String instanceId) {
        validatorCache.remove(instanceId);
    }

    private void validateSecurity(String script) {
        for (Pattern pattern : PROHIBITED_PATTERNS) {
            if (pattern.matcher(script).find()) {
                throw new SecurityViolationException(
                        "Security Violation: Script contains prohibited invocation or class: " + pattern.pattern(),
                        pattern.pattern());
            }
        }
    }
}
