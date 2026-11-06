package com.bulkprocessor.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record FileDiagnosticsResponse(
    String jobId,
    MetadataDto metadata,
    List<StageLatencyDto> stageLatencies,
    List<BatchChunkDto> batchChunks,
    List<RecordErrorDto> errorRecords
) {
    @JsonProperty("recordErrors")
    public List<RecordErrorDto> recordErrors() {
        return errorRecords;
    }
}
