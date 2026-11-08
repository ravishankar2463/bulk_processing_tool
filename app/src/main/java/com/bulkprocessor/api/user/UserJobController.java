package com.bulkprocessor.api.user;

import com.bulkprocessor.dto.FileDiagnosticsResponse;
import com.bulkprocessor.service.BulkJobService;
import com.bulkprocessor.service.BulkReportService;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST controller for User Portal job operations: single/batch upload,
 * status inspection, lifecycle commands, and file diagnostics retrieval.
 */
@RestController
@CrossOrigin(origins = "*")
public class UserJobController {

    private final BulkJobService bulkJobService;
    private final BulkReportService bulkReportService;

    public UserJobController(
            BulkJobService bulkJobService,
            BulkReportService bulkReportService) {
        this.bulkJobService = bulkJobService;
        this.bulkReportService = bulkReportService;
    }

    @PostMapping(value = "/api/v1/user/jobs/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkJobEntity> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("processId") String processId) {
        BulkJobEntity saved = bulkJobService.uploadFile(file, processId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(saved);
    }

    @PostMapping(value = "/api/v1/user/jobs/batch-upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<BulkJobEntity>> batchUpload(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "processId", defaultValue = "proc-customer-master") String processId) {
        List<BulkJobEntity> saved = bulkJobService.batchUpload(files, processId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(saved);
    }

    @GetMapping("/api/v1/user/jobs")
    public ResponseEntity<List<BulkJobEntity>> listJobs(
            @RequestParam(value = "processId", required = false) String processId) {
        return ResponseEntity.ok(bulkJobService.listJobs(processId));
    }

    /**
     * Backward-compatible alias for route-level job queries.
     * Note: Process-scoped queries are handled by ProcessWorkspaceController.
     */
    @GetMapping("/api/v1/routes/{processId}/jobs")
    public ResponseEntity<List<BulkJobEntity>> listJobsByRoute(@PathVariable String processId) {
        return ResponseEntity.ok(bulkJobService.getJobsByProcessId(processId));
    }

    @GetMapping("/api/v1/user/jobs/{jobId}")
    public ResponseEntity<BulkJobEntity> getJob(@PathVariable String jobId) {
        return bulkJobService.getJob(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"/api/v1/user/jobs/{jobId}/pause", "/api/v1/jobs/{jobId}/pause"})
    public ResponseEntity<BulkJobEntity> pauseJob(@PathVariable String jobId) {
        return bulkJobService.pauseJob(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"/api/v1/user/jobs/{jobId}/resume", "/api/v1/jobs/{jobId}/resume"})
    public ResponseEntity<BulkJobEntity> resumeJob(@PathVariable String jobId) {
        return bulkJobService.resumeJob(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"/api/v1/user/jobs/{jobId}/retry", "/api/v1/jobs/{jobId}/retry"})
    public ResponseEntity<BulkJobEntity> retryJob(@PathVariable String jobId) {
        return bulkJobService.retryJob(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping({"/api/v1/user/jobs/{jobId}/cancel", "/api/v1/jobs/{jobId}/cancel"})
    public ResponseEntity<BulkJobEntity> cancelJob(@PathVariable String jobId) {
        return bulkJobService.cancelJob(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping({"/api/v1/user/jobs/{jobId}/diagnostics", "/api/v1/jobs/{jobId}/diagnostics"})
    public ResponseEntity<FileDiagnosticsResponse> getJobDiagnostics(@PathVariable String jobId) {
        return bulkJobService.getJobDiagnostics(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/api/v1/user/jobs/{jobId}/errors")
    public ResponseEntity<List<BulkRecordErrorEntity>> getJobErrors(@PathVariable String jobId) {
        return ResponseEntity.ok(bulkJobService.getJobErrors(jobId));
    }

    @GetMapping(value = "/api/v1/user/jobs/{jobId}/report", produces = "text/csv")
    public ResponseEntity<String> downloadReport(@PathVariable String jobId) {
        return bulkJobService.getJob(jobId)
            .map(job -> {
                List<BulkRecordErrorEntity> errors = bulkJobService.getJobErrors(jobId);
                String csv = bulkReportService.generateCsvReport(job, errors);

                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report-" + jobId + ".csv\"");
                headers.setContentType(MediaType.parseMediaType("text/csv"));

                return new ResponseEntity<>(csv, headers, HttpStatus.OK);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}
