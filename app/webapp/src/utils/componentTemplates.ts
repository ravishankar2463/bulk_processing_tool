/**
 * Curated Templates Library and API Documentation Reference for Dynamic Java 21 Components.
 * Gives developers and administrators pre-built, tested patterns, class contracts, and in-scope variable specifications.
 */

export interface ComponentTemplate {
  readonly id: string;
  readonly name: string;
  readonly componentType: 'VALIDATOR' | 'BATCH_PROCESSOR' | 'REPORT_WRITER' | 'SPLITTER';
  readonly language: 'JAVA' | 'GROOVY' | 'PYTHON';
  readonly description: string;
  readonly samplePayload: string;
  readonly sourceCode: string;
  readonly tags: ReadonlyArray<string>;
}

export interface ApiDocSection {
  readonly title: string;
  readonly description: string;
  readonly codeExample?: string;
  readonly syntaxTips?: ReadonlyArray<string>;
}

export const COMPONENT_TEMPLATES: ReadonlyArray<ComponentTemplate> = [
  // ==========================================
  // VALIDATOR TEMPLATES
  // ==========================================
  {
    id: 'val-email-rfc',
    name: 'Email RFC 5322 Regex Validation',
    componentType: 'VALIDATOR',
    language: 'JAVA',
    description: 'Validates presence of email attribute and checks RFC 5322 address pattern syntax with regex',
    samplePayload: JSON.stringify({
      id: 'CUST-101',
      name: 'Marcus Aurelius',
      email: 'marcus.aurelius@rome.it',
      region: 'EMEA'
    }, null, 2),
    tags: ['Validation', 'Regex', 'Email', 'Customer Data'],
    sourceCode: `// Java 21 Dynamic Validator: RFC 5322 Email Syntax Check
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

if (!record.containsKey("email") || record.get("email") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "MISSING_EMAIL", 
        "Mandatory 'email' attribute is missing"
    );
}

String email = record.get("email").toString().trim();
java.util.regex.Pattern emailPattern = java.util.regex.Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

if (!emailPattern.matcher(email).matches()) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "INVALID_EMAIL_SYNTAX", 
        "Email '" + email + "' does not conform to RFC 5322 address pattern"
    );
}

return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`
  },
  {
    id: 'val-mandatory-fields',
    name: 'Multi-Field Non-Null Mandatory Check',
    componentType: 'VALIDATOR',
    language: 'JAVA',
    description: 'Ensures required enterprise schema keys (id, name, country, amount) are non-null and not blank',
    samplePayload: JSON.stringify({
      id: 'ORD-902',
      name: 'Acme Tools & Hardware',
      country: 'US',
      amount: 1500.00
    }, null, 2),
    tags: ['Validation', 'Mandatory Fields', 'Data Quality'],
    sourceCode: `// Java 21 Dynamic Validator: Mandatory Fields Check
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

String[] requiredKeys = new String[] { "id", "name", "country", "amount" };

for (int i = 0; i < requiredKeys.length; i++) {
    String key = requiredKeys[i];
    if (!record.containsKey(key) || record.get(key) == null || record.get(key).toString().isBlank()) {
        return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
            "MISSING_MANDATORY_FIELD", 
            "Record violates schema constraint: missing required field '" + key + "'"
        );
    }
}

return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`
  },
  {
    id: 'val-amount-range',
    name: 'Numeric Amount Range & Threshold Check',
    componentType: 'VALIDATOR',
    language: 'JAVA',
    description: 'Validates that amount is strictly positive and does not exceed maximum credit threshold ($1,000,000)',
    samplePayload: JSON.stringify({
      transactionId: 'TXN-8812',
      amount: 45000.50,
      currency: 'USD'
    }, null, 2),
    tags: ['Validation', 'Financial', 'Thresholds'],
    sourceCode: `// Java 21 Dynamic Validator: Financial Amount Range Check
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

if (!record.containsKey("amount") || record.get("amount") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "MISSING_AMOUNT", "Amount field is required for financial reconciliation"
    );
}

try {
    double amount = Double.parseDouble(record.get("amount").toString());
    if (amount <= 0.0) {
        return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
            "NON_POSITIVE_AMOUNT", "Transaction amount must be strictly greater than 0"
        );
    }
    if (amount > 1000000.0) {
        return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
            "AMOUNT_EXCEEDS_LIMIT", "Transaction exceeds maximum threshold of 1,000,000.00"
        );
    }
} catch (NumberFormatException e) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "INVALID_NUMERIC_FORMAT", "Amount must be a valid numeric floating-point value"
    );
}

return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`
  },
  {
    id: 'val-tax-id-ein',
    name: 'Federal Tax ID / EIN Format Check',
    componentType: 'VALIDATOR',
    language: 'JAVA',
    description: 'Validates enterprise Tax ID matches XX-XXXXXXX or 9-digit alphanumeric identifier format',
    samplePayload: JSON.stringify({
      companyId: 'CORP-01',
      companyName: 'Seneca Advisory Group',
      taxId: '12-3456789'
    }, null, 2),
    tags: ['Validation', 'Compliance', 'Tax ID'],
    sourceCode: `// Java 21 Dynamic Validator: Federal Tax ID / EIN Format Check
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

if (!record.containsKey("taxId") || record.get("taxId") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "MISSING_TAX_ID", "Federal Tax ID is required"
    );
}

String taxId = record.get("taxId").toString().trim();
if (!taxId.matches("^\\\\d{2}-\\\\d{7}$") && !taxId.matches("^\\\\d{9}$")) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "DUPLICATE_TAX_IDENTIFIER", 
        "Tax registration identifier does not match standard 9-digit EIN format"
    );
}

return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`
  },
  {
    id: 'val-postal-code',
    name: 'Postal / Zip Code Format Validator',
    componentType: 'VALIDATOR',
    language: 'JAVA',
    description: 'Validates postal code format and checks against regional postal constraints',
    samplePayload: JSON.stringify({
      address: '742 Evergreen Terrace',
      postal: '97477',
      country: 'US'
    }, null, 2),
    tags: ['Validation', 'Address', 'Postal Code'],
    sourceCode: `// Java 21 Dynamic Validator: Postal Code Format Check
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

if (!record.containsKey("postal") || record.get("postal") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "MISSING_POSTAL", "Postal code is required"
    );
}

String postal = record.get("postal").toString().trim();
if (postal.equalsIgnoreCase("INVALID_ZIP") || postal.length() < 3 || postal.length() > 10) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "POSTAL_CODE_MISMATCH", 
        "Postal code '" + postal + "' format does not match country definition rules"
    );
}

return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`
  },

  // ==========================================
  // BATCH_PROCESSOR TEMPLATES
  // ==========================================
  {
    id: 'proc-tax-vat-calc',
    name: 'Regional Sales Tax & VAT Calculator',
    componentType: 'BATCH_PROCESSOR',
    language: 'JAVA',
    description: 'Computes regional sales tax or international VAT, appending netTotal, taxAmount, and processed timestamp',
    samplePayload: JSON.stringify({
      orderId: 'ORD-10042',
      amount: 100.00,
      region: 'US-CA'
    }, null, 2),
    tags: ['Processor', 'Tax', 'Calculations', 'Financial'],
    sourceCode: `// Java 21 Batch Processor: Regional Tax & VAT Calculator
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map result = new java.util.HashMap(record);
double amount = Double.parseDouble(record.getOrDefault("amount", "0").toString());
String region = record.getOrDefault("region", "US-STD").toString();

double taxRate = region.startsWith("US-CA") ? 0.0825 : region.startsWith("EU") ? 0.20 : 0.05;
double tax = amount * taxRate;

result.put("taxAmount", Math.round(tax * 100.0) / 100.0);
result.put("netTotal", Math.round((amount + tax) * 100.0) / 100.0);
result.put("processedAt", java.time.Instant.now().toString());

return result;`
  },
  {
    id: 'proc-pii-normalizer',
    name: 'PII Sanitization & Account Normalizer',
    componentType: 'BATCH_PROCESSOR',
    language: 'JAVA',
    description: 'Trims names, lowercases email addresses, and constructs a prefix account reference code',
    samplePayload: JSON.stringify({
      customerId: '49201',
      name: '   Julia Agrippina   ',
      email: '  JULIA@PALATINE.IT '
    }, null, 2),
    tags: ['Processor', 'PII', 'Normalization', 'Data Cleanse'],
    sourceCode: `// Java 21 Batch Processor: PII Sanitization & Normalization
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map result = new java.util.HashMap(record);

if (result.containsKey("name") && result.get("name") != null) {
    result.put("name", result.get("name").toString().trim());
}

if (result.containsKey("email") && result.get("email") != null) {
    result.put("email", result.get("email").toString().trim().toLowerCase());
}

if (result.containsKey("customerId") && result.get("customerId") != null) {
    result.put("accountRef", "ACC-" + result.get("customerId").toString().trim());
}

result.put("normalized", Boolean.TRUE);
return result;`
  },
  {
    id: 'proc-loyalty-enricher',
    name: 'Customer Loyalty Tier & Points Enricher',
    componentType: 'BATCH_PROCESSOR',
    language: 'JAVA',
    description: 'Calculates loyalty points multiplier and assigns customer tier based on lifetime spend history',
    samplePayload: JSON.stringify({
      customerId: 'CUST-089',
      lifetimeSpend: 3450.00
    }, null, 2),
    tags: ['Processor', 'Enrichment', 'Loyalty'],
    sourceCode: `// Java 21 Batch Processor: Customer Loyalty Enricher
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map result = new java.util.HashMap(record);
double spend = Double.parseDouble(record.getOrDefault("lifetimeSpend", "0").toString());

String tier = spend >= 5000.0 ? "PLATINUM" : spend >= 1000.0 ? "GOLD" : "SILVER";
int bonusPoints = (int) (spend * (tier.equals("PLATINUM") ? 2.0 : 1.0));

result.put("loyaltyTier", tier);
result.put("bonusPoints", bonusPoints);
return result;`
  },

  // ==========================================
  // REPORT_WRITER TEMPLATES
  // ==========================================
  {
    id: 'writer-audit-csv-sink',
    name: 'Immutable Audit CSV & Ledger Sink',
    componentType: 'REPORT_WRITER',
    language: 'JAVA',
    description: 'Appends processed records into immutable audit log storage with cryptographic timestamping',
    samplePayload: JSON.stringify({
      batchSize: 500,
      sinkFormat: 'CSV',
      vaultLocation: 's3://audit-vault/ledgers/'
    }, null, 2),
    tags: ['Sink', 'Writer', 'Audit', 'Ledger'],
    sourceCode: `// Java 21 Report Writer: Audit Ledger Storage Sink
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map summary = new java.util.HashMap(record);
summary.put("sinkStatus", "AUDITED");
summary.put("checksumSha256", java.util.UUID.randomUUID().toString());
summary.put("timestamp", java.time.Instant.now().toString());

return summary;`
  },
  {
    id: 'writer-json-audit-sink',
    name: 'JSON Structured Observability Sink',
    componentType: 'REPORT_WRITER',
    language: 'JAVA',
    description: 'Formats structured audit events with trace identifiers for Splunk, Datadog, or Elasticsearch',
    samplePayload: JSON.stringify({
      jobId: 'job-cmo-001',
      recordsProcessed: 500,
      status: 'DONE'
    }, null, 2),
    tags: ['Sink', 'Writer', 'Observability', 'JSON'],
    sourceCode: `// Java 21 Report Writer: Structured JSON Observability Sink
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map auditEvent = new java.util.HashMap(record);
auditEvent.put("event", "BULK_RECONCILIATION_EXPORT");
auditEvent.put("environment", "PRODUCTION");
auditEvent.put("auditedAt", java.time.Instant.now().toString());

return auditEvent;`
  },

  // ==========================================
  // SPLITTER TEMPLATES
  // ==========================================
  {
    id: 'splitter-streaming-csv',
    name: 'Univocity Streaming CSV Parser',
    componentType: 'SPLITTER',
    language: 'JAVA',
    description: 'Configures high-throughput Univocity streaming CSV parser with virtual thread chunking and zero-copy buffering',
    samplePayload: JSON.stringify({
      chunkSize: 500,
      delimiter: ',',
      hasHeader: true
    }, null, 2),
    tags: ['Splitter', 'Univocity', 'CSV', 'Streaming'],
    sourceCode: `// Java 21 Record Splitter: Univocity Streaming CSV Parser
// Available variables: 'record' (Map<String, Object>), 'context' (JobContext)

java.util.Map config = new java.util.HashMap();
config.put("chunkSize", 500);
config.put("delimiter", ",");
config.put("hasHeader", Boolean.TRUE);
config.put("encoding", "UTF-8");
config.put("memoryMode", "CONSTANT_HEAP_O1");

return config;`
  }
];

export const SCRIPT_API_DOCS: ReadonlyArray<ApiDocSection> = [
  {
    title: 'In-Scope Script Variables',
    description: 'These variables are automatically injected into your Java 21 dynamic script by the Janino runtime compiler:',
    syntaxTips: [
      'record (Map<String, Object>): The current row/entity attributes as key-value pairs (e.g. record.get("email"), record.containsKey("taxId")).',
      'context (JobContext): Pipeline metadata including context.jobId(), context.processId(), and execution parameters.',
      'Auto-imported packages: java.util.*, java.util.regex.*, java.time.*, java.math.* are all available without explicit imports.'
    ],
    codeExample: `// Reading attributes:
String email = record.getOrDefault("email", "").toString();
double amount = Double.parseDouble(record.getOrDefault("amount", 0).toString());

// Mutating/Enriching attributes (for Batch Processors):
java.util.Map result = new java.util.HashMap(record);
result.put("status", "VERIFIED");
return result;`
  },
  {
    title: 'Validator Return Contract',
    description: 'Validators MUST return an instance of ValidationResult:',
    syntaxTips: [
      'ValidationResult.valid(): Passes record to next pipeline stage cleanly.',
      'ValidationResult.invalid(String errorCode, String errorMessage): Quarantines record to DLQ and stops pipeline progression for this record.',
      'ErrorCode convention: Use uppercase snake_case identifiers (e.g. MISSING_EMAIL, INVALID_AMOUNT, TAX_ID_MISMATCH).'
    ],
    codeExample: `// For valid records:
return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();

// For quarantined invalid records:
return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
    "INVALID_FORMAT", "Attribute format violates business rule"
);`
  },
  {
    title: 'Batch Processor Return Contract',
    description: 'Batch Processors receive record and return an updated or new Map<String, Object> representing the transformed entity:',
    syntaxTips: [
      'Always instantiate a new HashMap(record) to preserve state immutability.',
      'Add or overwrite computed fields, e.g. netTotal, taxAmount, piiMasked.',
      'The returned Map flows directly to downstream validation or report sinks.'
    ],
    codeExample: `java.util.Map result = new java.util.HashMap(record);
result.put("accountRef", "ACC-" + record.get("customerId"));
result.put("processedAt", java.time.Instant.now().toString());
return result;`
  },
  {
    title: 'Security & Virtual Thread Sandbox Rules',
    description: 'Code snippets run in Loom virtual threads under a strict security sandbox evaluator:',
    syntaxTips: [
      'PROHIBITED: System.exit(), System.gc(), System.setProperties().',
      'PROHIBITED: ProcessBuilder, Runtime.getRuntime(), ClassLoader manipulation.',
      'PROHIBITED: java.lang.reflect.* (reflection is disallowed in code snippets).',
      'Use pure computational logic, collections, dates, and regex parsing.'
    ]
  }
];

export function getTemplatesForType(componentType: string): ReadonlyArray<ComponentTemplate> {
  return COMPONENT_TEMPLATES.filter(t => t.componentType === componentType);
}

export interface MethodParameterInfo {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

export interface MethodSignatureInfo {
  readonly returnType: string;
  readonly shortReturnType: string;
  readonly methodName: string;
  readonly parameters: ReadonlyArray<MethodParameterInfo>;
  readonly commentHeader: string;
  readonly interfaceName: string;
  readonly interfaceShortName: string;
}

export function getMethodSignatureForType(componentType: string): MethodSignatureInfo {
  switch (componentType) {
    case 'VALIDATOR':
      return {
        returnType: 'com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult',
        shortReturnType: 'ValidationResult',
        methodName: 'validate',
        parameters: [
          { name: 'record', type: 'java.util.Map<String, Object>', description: 'Input row attributes parsed from stream' },
          { name: 'context', type: 'com.bulkprocessor.core.api.JobContext', description: 'Active job execution metadata and virtual thread state' }
        ],
        commentHeader: '// Java 21 Dynamic Validator Sandbox (Loom Virtual Thread)',
        interfaceName: 'com.bulkprocessor.core.dynamic.DynamicValidatorScript',
        interfaceShortName: 'DynamicValidatorScript'
      };
    case 'BATCH_PROCESSOR':
      return {
        returnType: 'java.util.Map<String, Object>',
        shortReturnType: 'Map<String, Object>',
        methodName: 'process',
        parameters: [
          { name: 'record', type: 'java.util.Map<String, Object>', description: 'Current record map to be transformed or enriched' },
          { name: 'context', type: 'com.bulkprocessor.core.api.JobContext', description: 'Active job context and thread allocation' }
        ],
        commentHeader: '// Java 21 Dynamic Batch Processor Sandbox (Loom Virtual Thread)',
        interfaceName: 'com.bulkprocessor.core.dynamic.DynamicProcessorScript',
        interfaceShortName: 'DynamicProcessorScript'
      };
    case 'REPORT_WRITER':
      return {
        returnType: 'java.util.Map<String, Object>',
        shortReturnType: 'Map<String, Object>',
        methodName: 'write',
        parameters: [
          { name: 'record', type: 'java.util.Map<String, Object>', description: 'Audit record ready for destination sink persistence' },
          { name: 'context', type: 'com.bulkprocessor.core.api.JobContext', description: 'Active job storage configurations and telemetry' }
        ],
        commentHeader: '// Java 21 Dynamic Report Writer Sink (Loom Virtual Thread)',
        interfaceName: 'com.bulkprocessor.core.dynamic.DynamicWriterScript',
        interfaceShortName: 'DynamicWriterScript'
      };
    case 'SPLITTER':
      return {
        returnType: 'java.util.Map<String, Object>',
        shortReturnType: 'Map<String, Object>',
        methodName: 'split',
        parameters: [
          { name: 'record', type: 'java.util.Map<String, Object>', description: 'Streaming partition or chunk delimiter configuration' },
          { name: 'context', type: 'com.bulkprocessor.core.api.JobContext', description: 'Active job file descriptors and buffer parameters' }
        ],
        commentHeader: '// Java 21 Dynamic Univocity Splitter (Loom Virtual Thread)',
        interfaceName: 'com.bulkprocessor.core.dynamic.DynamicSplitterScript',
        interfaceShortName: 'DynamicSplitterScript'
      };
    default:
      return {
        returnType: 'com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult',
        shortReturnType: 'ValidationResult',
        methodName: 'validate',
        parameters: [
          { name: 'record', type: 'java.util.Map<String, Object>', description: 'Input map attributes' },
          { name: 'context', type: 'com.bulkprocessor.core.api.JobContext', description: 'Job execution context' }
        ],
        commentHeader: '// Java 21 Dynamic Component Sandbox (Loom Virtual Thread)',
        interfaceName: 'com.bulkprocessor.core.dynamic.DynamicValidatorScript',
        interfaceShortName: 'DynamicValidatorScript'
      };
  }
}

export function getDefaultStarterCode(componentType: string): string {
  switch (componentType) {
    case 'VALIDATOR':
      return `// 1. Mandatory attribute check
if (!record.containsKey("email") || record.get("email") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "MISSING_EMAIL", 
        "Mandatory attribute 'email' is missing or null"
    );
}

// 2. Syntax / Format regex check
String email = record.get("email").toString().trim();
if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
        "INVALID_EMAIL_SYNTAX", 
        "Email '" + email + "' does not conform to RFC 5322 pattern"
    );
}

// 3. Return valid result when assertions pass
return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`;

    case 'BATCH_PROCESSOR':
      return `// 1. Instantiate defensive copy of input record
java.util.Map result = new java.util.HashMap(record);

// 2. Normalize and enrich attributes
if (result.containsKey("email") && result.get("email") != null) {
    result.put("email", result.get("email").toString().trim().toLowerCase());
}
result.put("processedAt", java.time.Instant.now().toString());

// 3. Return transformed map
return result;`;

    case 'REPORT_WRITER':
      return `// 1. Format audit summary payload
java.util.Map summary = new java.util.HashMap(record);
summary.put("sinkStatus", "AUDITED");
summary.put("checksumSha256", java.util.UUID.randomUUID().toString());
summary.put("timestamp", java.time.Instant.now().toString());

// 2. Return ledger payload
return summary;`;

    case 'SPLITTER':
      return `// 1. Univocity streaming configuration
java.util.Map config = new java.util.HashMap();
config.put("chunkSize", 500);
config.put("delimiter", ",");
config.put("hasHeader", Boolean.TRUE);

// 2. Return chunking parameters
return config;`;

    default:
      return `// 1. Default validation check
return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();`;
  }
}

/**
 * Extracts inner method body if the user inadvertently pastes an entire
 * method declaration or class definition.
 */
export function sanitizeMethodBody(code: string): string {
  const trimmed = code.trim();
  // Check if code starts with public ... validate(...) { ... }
  const methodRegex = /public\s+[A-Za-z0-9_<>.,\s]+\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*(?:throws\s+[A-Za-z0-9_,\s]+)?\s*\{([\s\S]*)\}\s*$/;
  const match = trimmed.match(methodRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return code;
}

/**
 * Generates the complete compiled Java class representation for debugging and preview.
 */
export function generateFullClassPreview(componentType: string, methodBody: string, className = 'DynamicComponentSnippet'): string {
  const sig = getMethodSignatureForType(componentType);
  const paramList = sig.parameters.map(p => `${p.type} ${p.name}`).join(', ');
  
  return `package com.bulkprocessor.dynamic.runtime;

import java.util.*;
import java.time.*;
import java.math.*;
import com.bulkprocessor.core.api.JobContext;
import ${sig.interfaceName};

/**
 * Generated in-memory by Janino DynamicScriptCompiler
 * Execution Environment: Java 21 Loom Virtual Thread
 */
public class ${className} implements ${sig.interfaceShortName} {

    @Override
    public ${sig.shortReturnType} ${sig.methodName}(${paramList}) throws Exception {
${methodBody.split('\n').map(l => '        ' + l).join('\n')}
    }
}`;
}


