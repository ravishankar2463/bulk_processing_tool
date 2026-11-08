package com.bulkprocessor.config;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;

import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.bulkprocessor.storage.entity.BulkJobBatchEntity;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import com.bulkprocessor.storage.entity.ProcessDefinitionEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.BulkJobBatchRepository;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import com.bulkprocessor.storage.repository.ComponentInstanceRepository;
import com.bulkprocessor.storage.repository.ProcessDefinitionRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;

/**
 * Pre-seeds the 3 Enterprise Routes, 6 Foundation Components, and associated
 * execution jobs,
 * batches, and diagnostic error records.
 */
@Component
@Order(10)
public class EnterpriseRouteDataSeeder implements ApplicationRunner {

        private static final Logger log = LoggerFactory.getLogger(EnterpriseRouteDataSeeder.class);

        private final RouteConfigRepository routeConfigRepository;
        private final ProcessDefinitionRepository processDefinitionRepository;
        private final ComponentInstanceRepository componentInstanceRepository;
        private final BulkJobRepository bulkJobRepository;
        private final BulkJobBatchRepository bulkJobBatchRepository;
        private final BulkRecordErrorRepository bulkRecordErrorRepository;

        public EnterpriseRouteDataSeeder(
                        RouteConfigRepository routeConfigRepository,
                        ProcessDefinitionRepository processDefinitionRepository,
                        ComponentInstanceRepository componentInstanceRepository,
                        BulkJobRepository bulkJobRepository,
                        BulkJobBatchRepository bulkJobBatchRepository,
                        BulkRecordErrorRepository bulkRecordErrorRepository) {
                this.routeConfigRepository = routeConfigRepository;
                this.processDefinitionRepository = processDefinitionRepository;
                this.componentInstanceRepository = componentInstanceRepository;
                this.bulkJobRepository = bulkJobRepository;
                this.bulkJobBatchRepository = bulkJobBatchRepository;
                this.bulkRecordErrorRepository = bulkRecordErrorRepository;
        }

        @Override
        @Transactional
        public void run(ApplicationArguments args) {
                seedComponentInstances();
                seedProcessesAndRoutes();
                seedSampleJobsAndDiagnostics();
                log.info("Enterprise routes, components, and seed jobs successfully initialized.");
        }

        private void seedComponentInstances() {
                seedComponent(
                                "splitter-csv-univocity",
                                "SPLITTER",
                                "Streaming CSV Splitter",
                                "Univocity streaming CSV parser with virtual thread chunking and zero-copy buffering",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Univocity CSV Splitter\npublic List<Record> split(InputStream in, int chunkSize) {\n    return UnivocityParser.parseChunks(in, chunkSize, ',');\n}",
                                "{\"chunkSize\": 500, \"delimiter\": \",\", \"hasHeader\": true}");

                seedComponent(
                                "val-customer-kyc",
                                "VALIDATOR",
                                "Customer KYC Email & Domain Validator",
                                "Ensures email syntax conforms to RFC 5322 and corporate domain compliance policies",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Java 21 Validation Script\nif (!record.containsKey(\"email\") || ((String)record.get(\"email\")).isBlank()) {\n    return ValidationResult.invalid(\"MISSING_EMAIL\", \"Email required\");\n}\nif (((String)record.get(\"email\")).endsWith(\"@tempmail.com\")) {\n    return ValidationResult.invalid(\"INVALID_DOMAIN\", \"Domain @tempmail.com rejected\");\n}\nreturn ValidationResult.valid();",
                                "{\"id\": 101, \"email\": \"test@example.com\"}");

                seedComponent(
                                "val-order-schema",
                                "VALIDATOR",
                                "Order Amount & Currency Validator",
                                "Validates positive monetary amounts and active ISO currency codes",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Order Schema Validator\nif (!record.containsKey(\"amount\") || Double.parseDouble(record.get(\"amount\").toString()) <= 0) {\n    return ValidationResult.invalid(\"INVALID_AMOUNT\", \"Amount must be positive\");\n}\nreturn ValidationResult.valid();",
                                "{\"orderId\": \"ORD-991\", \"amount\": 149.50, \"currency\": \"USD\"}");

                seedComponent(
                                "proc-customer-enricher",
                                "BATCH_PROCESSOR",
                                "Customer Loyalty & Tier Enricher",
                                "Calculates loyalty points and assigns bronze/silver/gold tier with Loom virtual thread execution",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Java 21 Batch Processor Script\njava.util.Map result = new java.util.HashMap(record);\nresult.put(\"tier\", \"GOLD\");\nresult.put(\"points\", 5000);\nreturn result;",
                                "{\"id\": 101, \"spend\": 5000}");

                seedComponent(
                                "proc-tax-calc",
                                "BATCH_PROCESSOR",
                                "Regional Tax & VAT Calculator",
                                "Calculates regional sales tax and international VAT rates",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Tax & VAT Calculation\njava.util.Map result = new java.util.HashMap(record);\ndouble amount = Double.parseDouble(record.getOrDefault(\"amount\", 0).toString());\nresult.put(\"tax\", amount * 0.0825);\nresult.put(\"netTotal\", amount * 1.0825);\nreturn result;",
                                "{\"amount\": 100.00, \"region\": \"US-CA\"}");

                seedComponent(
                                "writer-audit-csv",
                                "REPORT_WRITER",
                                "Audit CSV & Ledger Sink",
                                "Appends processed records into immutable audit log and general ledger storage",
                                "CODE_SNIPPET",
                                "JAVA",
                                "// Audit Ledger Sink\npublic void sink(List<Record> batch) {\n    AuditLogger.writeImmutable(batch, \"s3://audit-vault/ledgers/\");\n}",
                                "{\"batchSize\": 500, \"sinkFormat\": \"CSV\"}");
        }

        private void seedComponent(
                        String id, String type, String name, String desc,
                        String execMode, String lang, String source, String sample) {
                if (componentInstanceRepository.findById(id).isEmpty()) {
                        ComponentInstanceEntity comp = new ComponentInstanceEntity();
                        comp.setInstanceId(id);
                        comp.setComponentType(type);
                        comp.setName(name);
                        comp.setDescription(desc);
                        comp.setExecutionMode(execMode);
                        comp.setLanguage(lang);
                        comp.setSourceCode(source);
                        comp.setSampleTestPayload(sample);
                        comp.setVersion(1);
                        comp.setActive(true);
                        comp.setCreatedAt(Instant.now());
                        comp.setUpdatedAt(Instant.now());
                        componentInstanceRepository.save(comp);
                }
        }

        private void seedProcessesAndRoutes() {
                // 1. Customer Master Onboarding
                seedProcess(
                                "proc-customer-master",
                                "Customer Master Onboarding",
                                "High-throughput batch ingestion pipeline for enterprise customer records with Janino deduplication.");
                seedRoute(
                                "customer-master-onboarding",
                                "Customer Master Onboarding",
                                "FILE_BATCH",
                                "file://data/inbox/customers?include=.*\\.csv",
                                "proc-customer-master",
                                "ACTIVE");

                // 2. Order Fulfillment Stream
                seedProcess(
                                "proc-order-fulfillment",
                                "Order Fulfillment Stream",
                                "Continuous order stream ingestion connecting Kafka topics to SAP ERP fulfillment ledgers.");
                seedRoute(
                                "order-fulfillment-stream",
                                "Order Fulfillment Stream",
                                "STREAM",
                                "kafka:orders.fulfillment.inbound",
                                "proc-order-fulfillment",
                                "ACTIVE");

                // 3. Financial Reconciliation
                seedProcess(
                                "proc-financial-reconciliation",
                                "Financial Reconciliation",
                                "Scheduled settlement balancing and double-entry general ledger reconciliation pipeline.");
                seedRoute(
                                "financial-reconciliation",
                                "Financial Reconciliation",
                                "SCHEDULED_BATCH",
                                "cron:0+0+12+*+*+?",
                                "proc-financial-reconciliation",
                                "PAUSED");
        }

        private void seedProcess(String processId, String name, String description) {
                if (processDefinitionRepository.findById(processId).isEmpty()) {
                        ProcessDefinitionEntity proc = new ProcessDefinitionEntity();
                        proc.setProcessId(processId);
                        proc.setName(name);
                        proc.setDescription(description);
                        proc.setInputFormat("CSV");
                        proc.setActive(true);
                        proc.setVersion(1);
                        proc.setCreatedAt(Instant.now());
                        proc.setUpdatedAt(Instant.now());
                        processDefinitionRepository.save(proc);
                }
        }

        private void seedRoute(String routeId, String name, String type, String endpoint, String processId,
                        String status) {
                Optional<RouteConfigEntity> existing = routeConfigRepository.findById(routeId);
                if (existing.isEmpty()) {
                        RouteConfigEntity route = new RouteConfigEntity();
                        route.setRouteId(routeId);
                        route.setRouteName(name);
                        route.setRouteType(type);
                        route.setEndpointUri(endpoint);
                        route.setProcessId(processId);
                        route.setStatus(status);
                        route.setVersion(1);
                        route.setCreatedBy("SYSTEM_SEEDER");
                        route.setUpdatedAt(Instant.now());
                        routeConfigRepository.save(route);
                }
        }

        private void seedSampleJobsAndDiagnostics() {
                // Customer Master sample jobs
                seedJobWithDiagnostics(
                                "job-cmo-001",
                                "proc-customer-master",
                                "customers_q4_enterprise.csv",
                                4528190L,
                                "IN_FLIGHT",
                                "PROCESSING",
                                10000L,
                                6500L,
                                6480L,
                                20L,
                                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                                "virtual-worker-101-loom-04");

                seedJobWithDiagnostics(
                                "job-101",
                                "proc-customer-master",
                                "customers.csv",
                                4528190L,
                                "IN_FLIGHT",
                                "PROCESSING",
                                10000L,
                                6500L,
                                6480L,
                                20L,
                                "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                                "virtual-worker-101-loom-04");

                seedJobWithDiagnostics(
                                "job-cmo-002",
                                "proc-customer-master",
                                "customers_emea_legacy.csv",
                                1820400L,
                                "DONE",
                                "COMPLETED",
                                5000L,
                                5000L,
                                4988L,
                                12L,
                                "a4f89d9123891048123984128938120489123048912389102489128309128301",
                                "virtual-worker-102-loom-01");

                seedJobWithDiagnostics(
                                "job-ofs-101",
                                "proc-order-fulfillment",
                                "orders_realtime_stream_01.csv",
                                15400200L,
                                "IN_FLIGHT",
                                "PROCESSING",
                                50000L,
                                38200L,
                                38186L,
                                14L,
                                "f589120348120938401928340192834019283401928340192834019283401928",
                                "virtual-worker-201-loom-12");

                seedJobWithDiagnostics(
                                "job-fin-201",
                                "proc-financial-reconciliation",
                                "general_ledger_recon_nov.csv",
                                3940100L,
                                "SINKING",
                                "PAUSED",
                                12000L,
                                11400L,
                                11362L,
                                38L,
                                "b123984019283401928340192834019283401928340192834019283401928340",
                                "virtual-worker-301-loom-02");
        }

        private void seedJobWithDiagnostics(
                        String jobId,
                        String processId,
                        String fileName,
                        Long sizeBytes,
                        String stage,
                        String status,
                        Long totalRecords,
                        Long processedRecords,
                        Long successfulRecords,
                        Long failedRecords,
                        String checksum,
                        String threadAllocation) {
                if (bulkJobRepository.findById(jobId).isEmpty()) {
                        BulkJobEntity job = new BulkJobEntity();
                        job.setJobId(jobId);
                        job.setProcessId(processId);
                        job.setFileName(fileName);
                        job.setSourceUri("upload://" + fileName);
                        job.setFileSizeBytes(sizeBytes);
                        job.setStage(stage);
                        job.setStatus(status);
                        job.setTotalRecords(totalRecords);
                        job.setProcessedRecords(processedRecords);
                        job.setSuccessfulRecords(successfulRecords);
                        job.setFailedRecords(failedRecords);
                        job.setChecksumSha256(checksum);
                        job.setDetectedEncoding("UTF-8");
                        job.setDetectedDelimiter(",");
                        job.setLoomThreadAllocation(threadAllocation);
                        job.setStartTime(Instant.now().minusSeconds(1800));
                        if ("COMPLETED".equals(status)) {
                                job.setEndTime(Instant.now().minusSeconds(600));
                        }
                        bulkJobRepository.save(job);

                        // Seed sample batches for chunk distribution metrics
                        int batchCount = (int) Math.min(10, Math.max(1, totalRecords / 500));
                        for (int i = 0; i < batchCount; i++) {
                                String batchId = jobId + "-batch-" + i;
                                if (bulkJobBatchRepository.findById(batchId).isEmpty()) {
                                        BulkJobBatchEntity batch = new BulkJobBatchEntity(
                                                        batchId,
                                                        jobId,
                                                        i,
                                                        500,
                                                        i < batchCount - 1 ? "DONE" : "PROCESSING",
                                                        (long) (80000 + (i * 3200)),
                                                        "partition-" + (i % 3));
                                        bulkJobBatchRepository.save(batch);
                                }
                        }

                        // Seed sample record errors for inspection & Headroom compression
                        if (failedRecords > 0) {
                                seedSampleErrors(jobId);
                        }
                }
        }

        private void seedSampleErrors(String jobId) {
                if (!bulkRecordErrorRepository.findByJobId(jobId).isEmpty()) {
                        return;
                }

                record SeedErrorDef(
                                int batchIdx,
                                long seq,
                                String code,
                                String msg,
                                String rawPayload) {
                }

                List<SeedErrorDef> defs = List.of(
                                new SeedErrorDef(0, 42L, "INVALID_EMAIL_SYNTAX",
                                                "Email field does not conform to RFC 5322 address pattern",
                                                "{\"id\": \"CUST-0042\", \"name\": \"Marcus Aurelius\", \"email\": \"marcus.aurelius@rome\", \"region\": \"EMEA\", \"postal\": \"00184\"}"),
                                new SeedErrorDef(1, 189L, "POSTAL_CODE_MISMATCH",
                                                "Postal code format does not match country definition rules",
                                                "{\"id\": \"CUST-0189\", \"name\": \"Julia Agrippina\", \"email\": \"julia@palatine.it\", \"region\": \"EMEA\", \"postal\": \"INVALID_ZIP\"}"),
                                new SeedErrorDef(2, 312L, "DUPLICATE_TAX_IDENTIFIER",
                                                "Tax registration identifier is already bound to active enterprise entity",
                                                "{\"id\": \"CUST-0312\", \"name\": \"Lucius Seneca\", \"email\": \"seneca@cordoba.es\", \"region\": \"EMEA\", \"postal\": \"14001\"}"),
                                new SeedErrorDef(1, 520L, "INVALID_TAX_ID",
                                                "Tax identification number failed mod-11 checksum validation",
                                                "{\"id\": \"CUST-0520\", \"name\": \"Tiberius Gracchus\", \"email\": \"tiberius@rome.gov\", \"region\": \"EMEA\", \"postal\": \"00185\", \"taxId\": \"XX-999-00\"}"),
                                new SeedErrorDef(1, 545L, "MISSING_MANDATORY_FIELD",
                                                "Mandatory field \"company_registration\" is missing",
                                                "{\"id\": \"CUST-0545\", \"name\": \"Gaius Marius\", \"email\": \"marius@consul.it\", \"region\": \"EMEA\", \"postal\": \"00186\"}"),
                                new SeedErrorDef(1, 602L, "AMOUNT_EXCEEDS_LIMIT",
                                                "Credit authorization limit exceeds tier maximum ($500,000)",
                                                "{\"id\": \"CUST-0602\", \"name\": \"Crassus Wealth Management\", \"email\": \"crassus@wealth.it\", \"region\": \"EMEA\", \"postal\": \"00187\", \"creditLimit\": 750000}"),
                                new SeedErrorDef(1, 680L, "MALFORMED_PHONE_NUMBER",
                                                "Phone number does not match E.164 international standard",
                                                "{\"id\": \"CUST-0680\", \"name\": \"Pompey Logistics\", \"email\": \"pompey@orient.gr\", \"region\": \"EMEA\", \"postal\": \"10431\", \"phone\": \"123-abc-phone\"}"),
                                new SeedErrorDef(1, 715L, "INVALID_EMAIL_SYNTAX",
                                                "Email address contains illegal unicode whitespace characters",
                                                "{\"id\": \"CUST-0715\", \"name\": \"Cornelia Scipio\", \"email\": \"cornelia @heritage.org\", \"region\": \"EMEA\", \"postal\": \"00188\"}"),
                                new SeedErrorDef(1, 890L, "POSTAL_CODE_MISMATCH",
                                                "ZIP code length mismatch for jurisdiction US",
                                                "{\"id\": \"CUST-0890\", \"name\": \"Cato Global Trading\", \"email\": \"cato@senate.gov\", \"region\": \"NA\", \"postal\": \"9410\"}"),
                                new SeedErrorDef(2, 1045L, "DUPLICATE_TAX_IDENTIFIER",
                                                "Tax identifier already registered under another active account",
                                                "{\"id\": \"CUST-1045\", \"name\": \"Scipio Africanus\", \"email\": \"scipio@zama.tn\", \"region\": \"EMEA\", \"postal\": \"2036\", \"taxId\": \"TN-888-12\"}"),
                                new SeedErrorDef(2, 1120L, "UNRESOLVED_CURRENCY_CODE",
                                                "Currency code \"USDT\" is not recognized in ISO-4217",
                                                "{\"id\": \"CUST-1120\", \"name\": \"Aeneas Maritime\", \"email\": \"aeneas@troy.org\", \"region\": \"EMEA\", \"postal\": \"17010\", \"currency\": \"USDT\"}"),
                                new SeedErrorDef(2, 1250L, "EXPIRED_TIMESTAMP",
                                                "Transaction timestamp is older than permitted SLA (90 days)",
                                                "{\"id\": \"CUST-1250\", \"name\": \"Brutus & Co\", \"email\": \"brutus@republic.org\", \"region\": \"EMEA\", \"postal\": \"00189\", \"txDate\": \"2023-01-01\"}"),
                                new SeedErrorDef(2, 1310L, "INVALID_COUNTRY_ISO",
                                                "Country code \"GBR\" must be 2-letter ISO 3166-1 alpha-2",
                                                "{\"id\": \"CUST-1310\", \"name\": \"Hadrian Holdings\", \"email\": \"hadrian@wall.co.uk\", \"region\": \"EMEA\", \"postal\": \"NE46\", \"country\": \"GBR\"}"),
                                new SeedErrorDef(2, 1450L, "MISSING_MANDATORY_FIELD",
                                                "Mandatory field \"billing_contact\" cannot be null",
                                                "{\"id\": \"CUST-1450\", \"name\": \"Trajan Infrastructure\", \"email\": \"trajan@column.it\", \"region\": \"EMEA\", \"postal\": \"00187\"}"),
                                new SeedErrorDef(4, 2050L, "INVALID_EMAIL_SYNTAX",
                                                "Top-level domain missing in email address",
                                                "{\"id\": \"CUST-2050\", \"name\": \"Vespasian Media\", \"email\": \"vespasian@colosseum\", \"region\": \"EMEA\", \"postal\": \"00184\"}"),
                                new SeedErrorDef(4, 2110L, "BLOCKED_SANCTION_ENTITY",
                                                "Entity name matches designated sanctions watch list",
                                                "{\"id\": \"CUST-2110\", \"name\": \"Caligula Entertainment Corp\", \"email\": \"caligula@palace.it\", \"region\": \"EMEA\", \"postal\": \"00186\"}"),
                                new SeedErrorDef(4, 2180L, "POSTAL_CODE_MISMATCH",
                                                "Postal code alphanumeric characters invalid for Germany",
                                                "{\"id\": \"CUST-2180\", \"name\": \"Arminius Minerals GmbH\", \"email\": \"arminius@teutoburg.de\", \"region\": \"EMEA\", \"postal\": \"GER-999\"}"),
                                new SeedErrorDef(4, 2240L, "INVALID_TAX_ID",
                                                "European VAT number prefix does not match country code",
                                                "{\"id\": \"CUST-2240\", \"name\": \"Claudius Agrippa\", \"email\": \"claudius@lyon.fr\", \"region\": \"EMEA\", \"postal\": \"69001\", \"vatNumber\": \"ES99887766\"}"),
                                new SeedErrorDef(4, 2315L, "MALFORMED_PHONE_NUMBER",
                                                "Area code not recognized in North American Numbering Plan",
                                                "{\"id\": \"CUST-2315\", \"name\": \"Agrippa Tech Labs\", \"email\": \"agrippa@pantheon.org\", \"region\": \"NA\", \"postal\": \"94016\", \"phone\": \"000-111-2222\"}"),
                                new SeedErrorDef(4, 2490L, "DUPLICATE_RECORD_KEY",
                                                "Natural key collision on customer_account_id",
                                                "{\"id\": \"CUST-2490\", \"name\": \"Constantine Imperial\", \"email\": \"constantine@byzantium.org\", \"region\": \"EMEA\", \"postal\": \"34122\", \"accountKey\": \"ACC-0042\"}"));

                List<BulkRecordErrorEntity> seedErrors = new java.util.ArrayList<>(defs.size());
                for (SeedErrorDef def : defs) {
                        BulkRecordErrorEntity entity = new BulkRecordErrorEntity();
                        entity.setJobId(jobId);
                        entity.setBatchId(jobId + "-batch-" + def.batchIdx());
                        entity.setSequenceNumber(def.seq());
                        entity.setStepName("val-customer-kyc");
                        entity.setErrorCode(def.code());
                        entity.setErrorMessage(def.msg());
                        entity.setRawPayload(def.rawPayload());
                        entity.setCreatedAt(Instant.now());
                        seedErrors.add(entity);
                }
                bulkRecordErrorRepository.saveAll(seedErrors);
        }
}
