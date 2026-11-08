package com.bulkprocessor.splitter.batch;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Dynamic Batch Chunker Unit Tests")
class DynamicBatchChunkerTest {

    @Test
    @DisplayName("Chunks a stream of records into sized FileBatches with correct lastBatch flag")
    void shouldChunkStreamIntoFileBatches() {
        JobContext context = new JobContext("job-chunk-1", "f1", "test.csv", "s3://b/f1", "proc-1", Map.of(), System.currentTimeMillis());

        List<RecordItem<String>> records = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            records.add(new RecordItem<>("rec-" + i, i, 0, "value-" + i, Map.of()));
        }

        DynamicBatchChunker chunker = new DynamicBatchChunker(3);
        Iterator<FileBatch<String>> batchIterator = chunker.chunk(records.iterator(), context);

        List<FileBatch<String>> batches = new ArrayList<>();
        batchIterator.forEachRemaining(batches::add);

        assertThat(batches).hasSize(4);

        // Batch 0
        assertThat(batches.get(0).batchIndex()).isEqualTo(0);
        assertThat(batches.get(0).records()).hasSize(3);
        assertThat(batches.get(0).isLastBatch()).isFalse();

        // Batch 1
        assertThat(batches.get(1).batchIndex()).isEqualTo(1);
        assertThat(batches.get(1).records()).hasSize(3);
        assertThat(batches.get(1).isLastBatch()).isFalse();

        // Batch 2
        assertThat(batches.get(2).batchIndex()).isEqualTo(2);
        assertThat(batches.get(2).records()).hasSize(3);
        assertThat(batches.get(2).isLastBatch()).isFalse();

        // Batch 3 (Remainder)
        assertThat(batches.get(3).batchIndex()).isEqualTo(3);
        assertThat(batches.get(3).records()).hasSize(1);
        assertThat(batches.get(3).isLastBatch()).isTrue();
    }

    @Test
    @DisplayName("Handles exact multiple of batch size correctly")
    void shouldHandleExactMultipleOfBatchSize() {
        JobContext context = new JobContext("job-chunk-2", "f2", "test.csv", "s3://b/f2", "proc-2", Map.of(), System.currentTimeMillis());

        List<RecordItem<String>> records = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            records.add(new RecordItem<>("rec-" + i, i, 0, "value-" + i, Map.of()));
        }

        DynamicBatchChunker chunker = new DynamicBatchChunker(3);
        Iterator<FileBatch<String>> batchIterator = chunker.chunk(records.iterator(), context);

        List<FileBatch<String>> batches = new ArrayList<>();
        batchIterator.forEachRemaining(batches::add);

        assertThat(batches).hasSize(2);
        assertThat(batches.get(0).isLastBatch()).isFalse();
        assertThat(batches.get(1).isLastBatch()).isTrue();
    }
}

