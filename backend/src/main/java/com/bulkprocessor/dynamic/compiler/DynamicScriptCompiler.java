package com.bulkprocessor.dynamic.compiler;

import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.dynamic.sandbox.SecurityViolationException;
import org.codehaus.janino.ClassBodyEvaluator;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * In-memory compiler for user-supplied dynamic script snippets.
 * Enforces security sandbox validation before compiling into bytecode via Janino.
 */
public class DynamicScriptCompiler {

    private final Map<String, DynamicValidatorScript> validatorCache = new ConcurrentHashMap<>();

    private static final List<Pattern> PROHIBITED_PATTERNS = List.of(
        Pattern.compile("System\\s*\\.\\s*(exit|gc|setProperties|load)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("Runtime\\s*\\.\\s*getRuntime", Pattern.CASE_INSENSITIVE),
        Pattern.compile("ProcessBuilder", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*lang\\s*\\.\\s*reflect", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\s*\\.\\s*io\\s*\\.\\s*File(?!Reader|Writer|InputStream|OutputStream)", Pattern.CASE_INSENSITIVE),
        Pattern.compile("ClassLoader", Pattern.CASE_INSENSITIVE),
        Pattern.compile("SecurityManager", Pattern.CASE_INSENSITIVE)
    );

    /**
     * Compiles a dynamic validator method body into an executable DynamicValidatorScript instance.
     */
    public DynamicValidatorScript compileValidator(String instanceId, String methodBody) throws Exception {
        validateSecurity(methodBody);

        String classBody = """
            public com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult validate(
                java.util.Map record, com.bulkprocessor.core.api.JobContext context) {
                %s
            }
            """.formatted(methodBody);

        ClassBodyEvaluator cbe = new ClassBodyEvaluator();
        cbe.setImplementedInterfaces(new Class<?>[]{DynamicValidatorScript.class});
        cbe.cook(classBody);

        @SuppressWarnings("unchecked")
        Class<? extends DynamicValidatorScript> clazz = (Class<? extends DynamicValidatorScript>) cbe.getClazz();
        DynamicValidatorScript instance = clazz.getDeclaredConstructor().newInstance();
        validatorCache.put(instanceId, instance);
        return instance;
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
                    pattern.pattern()
                );
            }
        }
    }
}
