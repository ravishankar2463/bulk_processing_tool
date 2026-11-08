package com.bulkprocessor.dto;

public record RecordRetryRequestDto(
    String mode // "FROM_FAILED_STEP" or "FROM_START"
) {
    public RecordRetryRequestDto() {
        this("FROM_FAILED_STEP");
    }
}
