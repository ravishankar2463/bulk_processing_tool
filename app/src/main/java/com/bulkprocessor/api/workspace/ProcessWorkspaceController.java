package com.bulkprocessor.api.workspace;

import com.bulkprocessor.service.BulkJobService;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * REST controller serving the Tier-2 Process Workspace.
 * Manages process-scoped job progression, active file batches, and multi-file uploads.
 */
@RestController
@RequestMapping("/api/v1/processes")
@CrossOrigin(origins = "*")
public class ProcessWorkspaceController {

    private final BulkJobService bulkJobService;

    public ProcessWorkspaceController(BulkJobService bulkJobService) {
        this.bulkJobService = bulkJobService;
    }

    /**
     * Retrieves all bulk jobs associated with the specified process or route.
     */
    @GetMapping("/{processId}/jobs")
    public ResponseEntity<List<BulkJobEntity>> getProcessJobs(@PathVariable String processId) {
        List<BulkJobEntity> jobs = bulkJobService.getJobsByProcessId(processId);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Uploads batch files targeted to the specified process workspace.
     */
    @PostMapping(value = "/{processId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<List<BulkJobEntity>> uploadProcessBatch(
            @PathVariable String processId,
            @RequestParam(value = "files", required = false) MultipartFile[] files,
            @RequestParam(value = "file", required = false) MultipartFile file) {

        MultipartFile[] filesToUpload;
        if (files != null && files.length > 0) {
            filesToUpload = files;
        } else if (file != null) {
            filesToUpload = new MultipartFile[]{file};
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        List<BulkJobEntity> savedJobs = bulkJobService.batchUpload(filesToUpload, processId);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(savedJobs);
    }
}
