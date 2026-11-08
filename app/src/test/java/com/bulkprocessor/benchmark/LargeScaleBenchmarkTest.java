package com.bulkprocessor.benchmark;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.StepResult;
import com.bulkprocessor.core.dynamic.DynamicValidatorScript;
import com.bulkprocessor.core.pipeline.PipelineRecordResult;
import com.bulkprocessor.core.pipeline.ProcessPipeline;
import com.bulkprocessor.dynamic.compiler.DynamicScriptCompiler;
import com.bulkprocessor.splitter.batch.DynamicBatchChunker;
import com.bulkprocessor.splitter.csv.CsvSplitterConfig;
import com.bulkprocessor.splitter.csv.StreamingCsvSplitter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Phase 6: Large-Scale Throughput & Virtual Thread Stress Benchmark")
class LargeScaleBenchmarkTest {

    @Test
    @DisplayName("Streams and processes 100,000 records on Java 21 Virtual Threads with sub-millisecond per-record throughput")
    void testLargeScaleStreamingProcessing() throws Exception {
        int totalRecords = 100_000;
        int batchSize = 1_000;

        // 1. Generate in-memory streaming CSV generator
        InputStream streamingCsvStream = new InputStream() {
            private int currentRow = 0;
            private byte[] currentLineBytes = "id,name,email,amount\n".getBytes(StandardCharsets.UTF_8);
            private int byteIndex = 0;

            @Override
            public int read() {
                if (byteIndex < currentLineBytes.length) {
                    return currentLineBytes[byteIndex++];
                }
                if (currentRow >= totalRecords) {
                    return -1; // EOF
                }
                currentRow++;
                // 1 out of every 50 records has an invalid negative amount for error validation
                double amount = (currentRow % 50 == 0) ? -10.0 : 150.0 + (currentRow % 100);
                String line = String.format("%d,Customer_%d,customer_%d@example.com,%.2f\n", currentRow, currentRow, currentRow, amount);
                currentLineBytes = line.getBytes(StandardCharsets.UTF_8);
                byteIndex = 0;
                return currentLineBytes[byteIndex++];
            }
        };

        // 2. Compile dynamic validator script via Janino
        DynamicScriptCompiler compiler = new DynamicScriptCompiler();
        String validatorScriptCode = """
            if (!record.containsKey("email") || !((String)record.get("email")).contains("@")) {
                return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("INVALID_EMAIL", "Email missing @");
            }
            if (record.containsKey("amount") && ((String)record.get("amount")).startsWith("-")) {
                return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("NEGATIVE_AMOUNT", "Amount cannot be negative");
            }
            return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();
            """;

        DynamicValidatorScript validator = compiler.compileValidator("perf-val-01", validatorScriptCode);

        // 3. Initialize streaming splitter and chunker
        StreamingCsvSplitter splitter = new StreamingCsvSplitter(CsvSplitterConfig.builder().build());
        DynamicBatchChunker chunker = new DynamicBatchChunker(batchSize);

        JobContext context = new JobContext(
            "bench-job-100k",
            "bench-job-100k",
            "large_customers.csv",
            "stream://benchmark",
            "customer-process",
            Map.of(),
            System.currentTimeMillis()
        );

        Iterator<RecordItem<Map<String, String>>> rawRecordIter = splitter.split(streamingCsvStream, context);

        Iterator<RecordItem<Map<String, Object>>> objectRecordIter = new Iterator<>() {
            @Override
            public boolean hasNext() {
                return rawRecordIter.hasNext();
            }

            @Override
            public RecordItem<Map<String, Object>> next() {
                RecordItem<Map<String, String>> item = rawRecordIter.next();
                return new RecordItem<>(
                    item.recordId(),
                    item.sequenceNumber(),
                    item.batchIndex(),
                    new HashMap<>(item.payload()),
                    item.metadata()
                );
            }
        };

        Iterator<FileBatch<Map<String, Object>>> batchIterator = chunker.chunk(objectRecordIter, context);

        AtomicLong processedCount = new AtomicLong(0);
        AtomicLong successCount = new AtomicLong(0);
        AtomicLong failureCount = new AtomicLong(0);

        Instant startTime = Instant.now();

        // 4. Execute concurrently across Java 21 Project Loom Virtual Threads
        try (ExecutorService virtualExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<?>> futures = new ArrayList<>();

            while (batchIterator.hasNext()) {
                FileBatch<Map<String, Object>> batch = batchIterator.next();

                futures.add(virtualExecutor.submit(() -> {
                    for (RecordItem<Map<String, Object>> record : batch.records()) {
                        DynamicValidatorScript.ValidationResult res = validator.validate(record.payload(), context);
                        processedCount.incrementAndGet();
                        if (res.isValid()) {
                            successCount.incrementAndGet();
                        } else {
                            failureCount.incrementAndGet();
                        }
                    }
                }));
            }

            for (Future<?> f : futures) {
                f.get(30, TimeUnit.SECONDS);
            }
        }

        Instant endTime = Instant.now();
        Duration elapsed = Duration.between(startTime, endTime);
        long elapsedMillis = Math.max(elapsed.toMillis(), 1);
        double recordsPerSec = (double) processedCount.get() / (elapsedMillis / 1000.0);

        System.out.printf(
            "=== Large Scale Benchmark: %d records processed in %d ms (%.2f records/sec) ===%n",
            processedCount.get(), elapsedMillis, recordsPerSec
        );
        System.out.printf(
            "Success: %d, Failures: %d%n",
            successCount.get(), failureCount.get()
        );

        // Assertions
        assertThat(processedCount.get()).isEqualTo(totalRecords);
        assertThat(failureCount.get()).isEqualTo(totalRecords / 50); // Exactly 2,000 negative amounts
        assertThat(successCount.get()).isEqualTo(totalRecords - (totalRecords / 50)); // Exactly 98,000 valid
        assertThat(recordsPerSec).isGreaterThan(10_000.0); // Minimum 10,000 records/sec throughput
    }
}

