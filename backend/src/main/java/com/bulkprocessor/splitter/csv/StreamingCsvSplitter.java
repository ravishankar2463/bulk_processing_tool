package com.bulkprocessor.splitter.csv;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import com.bulkprocessor.core.api.RecordSplitter;
import com.univocity.parsers.common.record.Record;
import com.univocity.parsers.csv.CsvParser;
import com.univocity.parsers.csv.CsvParserSettings;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;

/**
 * Memory-safe CSV record splitter using Univocity Parsers.
 * Returns a lazy Iterator ensuring O(1) heap consumption regardless of file size.
 */
public class StreamingCsvSplitter implements RecordSplitter<Map<String, String>> {

    private final CsvSplitterConfig config;

    public StreamingCsvSplitter(CsvSplitterConfig config) {
        this.config = Objects.requireNonNull(config, "config must not be null");
    }

    @Override
    public Iterator<RecordItem<Map<String, String>>> split(InputStream inputStream, JobContext context) {
        CsvParserSettings settings = new CsvParserSettings();
        settings.getFormat().setDelimiter(config.delimiter());
        settings.getFormat().setQuote(config.quoteChar());
        settings.setHeaderExtractionEnabled(config.hasHeader());
        settings.setSkipEmptyLines(config.skipEmptyLines());
        settings.setLineSeparatorDetectionEnabled(true);

        CsvParser parser = new CsvParser(settings);
        Iterator<Record> recordIterator = parser.iterateRecords(inputStream, StandardCharsets.UTF_8).iterator();

        return new Iterator<>() {
            private long sequenceNumber = 1L;

            @Override
            public boolean hasNext() {
                return recordIterator.hasNext();
            }

            @Override
            public RecordItem<Map<String, String>> next() {
                if (!recordIterator.hasNext()) {
                    throw new NoSuchElementException("No more records in CSV stream");
                }

                Record record = recordIterator.next();
                Map<String, String> payload;
                if (config.hasHeader()) {
                    payload = record.toFieldMap();
                } else {
                    String[] values = record.getValues();
                    payload = new LinkedHashMap<>();
                    for (int i = 0; i < values.length; i++) {
                        payload.put("col_" + i, values[i]);
                    }
                }

                return new RecordItem<>(
                    UUID.randomUUID().toString(),
                    sequenceNumber++,
                    0,
                    payload,
                    Map.of("rawLineNumber", sequenceNumber)
                );
            }
        };
    }

    @Override
    public boolean supports(String fileExtension, String mimeType) {
        return "csv".equalsIgnoreCase(fileExtension) || "text/csv".equalsIgnoreCase(mimeType);
    }
}
