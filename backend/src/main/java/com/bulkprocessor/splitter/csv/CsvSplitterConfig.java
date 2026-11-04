package com.bulkprocessor.splitter.csv;

/**
 * Configuration options for CSV splitting.
 */
public record CsvSplitterConfig(
    char delimiter,
    char quoteChar,
    boolean hasHeader,
    boolean skipEmptyLines,
    int batchSize
) {
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private char delimiter = ',';
        private char quoteChar = '"';
        private boolean hasHeader = true;
        private boolean skipEmptyLines = true;
        private int batchSize = 1000;

        public Builder delimiter(char delimiter) {
            this.delimiter = delimiter;
            return this;
        }

        public Builder quoteChar(char quoteChar) {
            this.quoteChar = quoteChar;
            return this;
        }

        public Builder hasHeader(boolean hasHeader) {
            this.hasHeader = hasHeader;
            return this;
        }

        public Builder skipEmptyLines(boolean skipEmptyLines) {
            this.skipEmptyLines = skipEmptyLines;
            return this;
        }

        public Builder batchSize(int batchSize) {
            this.batchSize = batchSize;
            return this;
        }

        public CsvSplitterConfig build() {
            return new CsvSplitterConfig(delimiter, quoteChar, hasHeader, skipEmptyLines, batchSize);
        }
    }
}
