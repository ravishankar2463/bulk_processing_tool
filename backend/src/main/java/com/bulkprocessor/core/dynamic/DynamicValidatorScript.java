package com.bulkprocessor.core.dynamic;

import com.bulkprocessor.core.api.JobContext;
import java.util.Map;

/**
 * Functional interface for dynamic validator scripts compiled in-memory from Admin UI.
 */
@FunctionalInterface
public interface DynamicValidatorScript {
    ValidationResult validate(Map<String, Object> record, JobContext context);

    record ValidationResult(boolean isValid, String errorCode, String errorMessage) {
        public static ValidationResult valid() {
            return new ValidationResult(true, null, null);
        }

        public static ValidationResult invalid(String errorCode, String errorMessage) {
            return new ValidationResult(false, errorCode, errorMessage);
        }
    }
}
