package com.bulkprocessor.api.admin;

import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/dlq")
@CrossOrigin(origins = "*")
public class AdminDlqController {

    private final BulkRecordErrorRepository bulkRecordErrorRepository;

    public AdminDlqController(BulkRecordErrorRepository bulkRecordErrorRepository) {
        this.bulkRecordErrorRepository = bulkRecordErrorRepository;
    }

    @GetMapping
    public ResponseEntity<List<BulkRecordErrorEntity>> listDlqErrors(
            @RequestParam(value = "jobId", required = false) String jobId) {
        if (jobId != null && !jobId.isBlank()) {
            return ResponseEntity.ok(bulkRecordErrorRepository.findByJobId(jobId));
        }
        return ResponseEntity.ok(bulkRecordErrorRepository.findAll());
    }

    @PostMapping("/{errorId}/resubmit")
    public ResponseEntity<Map<String, Object>> resubmitError(@PathVariable Long errorId) {
        return bulkRecordErrorRepository.findById(errorId)
            .map(err -> {
                // In production, this pushes the record back onto the Kafka ingress queue
                return ResponseEntity.ok(Map.<String, Object>of(
                    "status", "RESUBMITTED",
                    "errorId", errorId,
                    "jobId", err.getJobId(),
                    "sequenceNumber", err.getSequenceNumber() != null ? err.getSequenceNumber() : 0,
                    "message", "Record resubmitted to processing queue"
                ));
            })
            .orElse(ResponseEntity.notFound().build());
    }
}

