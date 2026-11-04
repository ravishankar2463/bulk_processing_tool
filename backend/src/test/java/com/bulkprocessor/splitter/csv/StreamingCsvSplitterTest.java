package com.bulkprocessor.splitter.csv;

import com.bulkprocessor.core.api.JobContext;
import com.bulkprocessor.core.api.RecordItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Streaming CSV Splitter Unit Tests")
class StreamingCsvSplitterTest {

    @Test
    @DisplayName("Splits standard comma-delimited CSV with headers into record maps")
    void shouldSplitStandardCsvWithHeaders() {
        String csvData = """
            id,name,amount
            101,John Doe,250.50
            102,Jane Smith,180.00
            103,Bob Jones,99.95
            """;

        InputStream input = new ByteArrayInputStream(csvData.getBytes(StandardCharsets.UTF_8));
        JobContext context = new JobContext("job-1", "file-1", "test.csv", "local://test.csv", "proc-1", Map.of(), System.currentTimeMillis());

        CsvSplitterConfig config = CsvSplitterConfig.builder()
            .delimiter(',')
            .hasHeader(true)
            .skipEmptyLines(true)
            .build();

        StreamingCsvSplitter splitter = new StreamingCsvSplitter(config);
        Iterator<RecordItem<Map<String, String>>> iterator = splitter.split(input, context);

        List<RecordItem<Map<String, String>>> records = new ArrayList<>();
        while (iterator.hasNext()) {
            records.add(iterator.next());
        }

        assertThat(records).hasSize(3);

        RecordItem<Map<String, String>> first = records.get(0);
        assertThat(first.sequenceNumber()).isEqualTo(1L);
        assertThat(first.payload()).containsEntry("id", "101")
            .containsEntry("name", "John Doe")
            .containsEntry("amount", "250.50");

        RecordItem<Map<String, String>> third = records.get(2);
        assertThat(third.sequenceNumber()).isEqualTo(3L);
        assertThat(third.payload()).containsEntry("name", "Bob Jones");
    }

    @Test
    @DisplayName("Handles custom pipe delimiter and quoted fields containing commas")
    void shouldHandleCustomDelimiterAndQuotes() {
        String csvData = """
            cust_id|company_name|notes
            C1|"Acme, Inc."|Special order
            C2|"Globex Corp, International"|Rush delivery
            """;

        InputStream input = new ByteArrayInputStream(csvData.getBytes(StandardCharsets.UTF_8));
        JobContext context = new JobContext("job-2", "file-2", "pipe.csv", "local://pipe.csv", "proc-2", Map.of(), System.currentTimeMillis());

        CsvSplitterConfig config = CsvSplitterConfig.builder()
            .delimiter('|')
            .quoteChar('"')
            .hasHeader(true)
            .build();

        StreamingCsvSplitter splitter = new StreamingCsvSplitter(config);
        Iterator<RecordItem<Map<String, String>>> iterator = splitter.split(input, context);

        List<RecordItem<Map<String, String>>> records = new ArrayList<>();
        iterator.forEachRemaining(records::add);

        assertThat(records).hasSize(2);
        assertThat(records.get(0).payload().get("company_name")).isEqualTo("Acme, Inc.");
        assertThat(records.get(1).payload().get("company_name")).isEqualTo("Globex Corp, International");
    }
}

