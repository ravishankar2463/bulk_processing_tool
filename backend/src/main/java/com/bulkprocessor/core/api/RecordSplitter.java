package com.bulkprocessor.core.api;

import java.io.InputStream;
import java.util.Iterator;

/**
 * Generic Record Splitter that streams records from an InputStream.
 * Guarantees O(1) memory consumption by returning an Iterator rather than a complete List.
 */
public interface RecordSplitter<T> {
    Iterator<RecordItem<T>> split(InputStream inputStream, JobContext context);
    boolean supports(String fileExtension, String mimeType);
}

