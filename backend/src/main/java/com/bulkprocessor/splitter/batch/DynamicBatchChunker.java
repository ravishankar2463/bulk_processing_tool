package com.bulkprocessor.splitter.batch;

import com.bulkprocessor.core.api.FileBatch;
import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

/**
 * Partitions an Iterator of RecordItems into sized FileBatches with accurate isLastBatch indicators.
 */
public class DynamicBatchChunker {

    private final int batchSize;

    public DynamicBatchChunker(int batchSize) {
        if (batchSize <= 0) {
            throw new IllegalArgumentException("batchSize must be greater than zero");
        }
        this.batchSize = batchSize;
    }

    public <T> Iterator<FileBatch<T>> chunk(Iterator<RecordItem<T>> recordIterator, JobContext context) {
        Objects.requireNonNull(recordIterator, "recordIterator must not be null");
        Objects.requireNonNull(context, "context must not be null");

        return new Iterator<>() {
            private int batchIndex = 0;
            private FileBatch<T> nextBatch = fetchNextBatch();

            @Override
            public boolean hasNext() {
                return nextBatch != null;
            }

            @Override
            public FileBatch<T> next() {
                if (nextBatch == null) {
                    throw new NoSuchElementException("No more batches available");
                }
                FileBatch<T> current = nextBatch;
                nextBatch = fetchNextBatch();
                return current;
            }

            private FileBatch<T> fetchNextBatch() {
                if (!recordIterator.hasNext()) {
                    return null;
                }

                List<RecordItem<T>> batchRecords = new ArrayList<>(batchSize);
                while (recordIterator.hasNext() && batchRecords.size() < batchSize) {
                    batchRecords.add(recordIterator.next());
                }

                boolean isLast = !recordIterator.hasNext();
                String batchId = "batch-" + UUID.randomUUID();

                return new FileBatch<>(
                    batchId,
                    context.jobId(),
                    batchIndex++,
                    -1,
                    batchRecords,
                    isLast
                );
            }
        };
    }
}

