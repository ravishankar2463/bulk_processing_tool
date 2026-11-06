package com.bulkprocessor.api.workspace;

import com.bulkprocessor.api.user.UserJobController;
import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.RouteConfigEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.RouteConfigRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/processes")
@CrossOrigin(origins = "*")
public class ProcessWorkspaceController {

    private final BulkJobRepository bulkJobRepository;
    private final RouteConfigRepository routeConfigRepository;
    private final UserJobController userJobController;

    public ProcessWorkspaceController(
            BulkJobRepository bulkJobRepository,
            RouteConfigRepository routeConfigRepository,
            UserJobController userJobController) {
        this.bulkJobRepository = bulkJobRepository;
        this.routeConfigRepository = routeConfigRepository;
        this.userJobController = userJobController;
    }

    @GetMapping("/{processId}/jobs")
    public ResponseEntity<List<BulkJobEntity>> getProcessJobs(@PathVariable String processId) {
        List<BulkJobEntity> jobs = bulkJobRepository.findByProcessIdOrderByStartTimeDesc(processId);
        if (jobs.isEmpty()) {
            Optional<RouteConfigEntity> routeOpt = routeConfigRepository.findById(processId);
            if (routeOpt.isPresent() && routeOpt.get().getProcessId() != null) {
                jobs = bulkJobRepository.findByProcessIdOrderByStartTimeDesc(routeOpt.get().getProcessId());
            }
        }
        return ResponseEntity.ok(jobs);
    }

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

        return userJobController.batchUpload(filesToUpload, processId);
    }
}

