package com.bulkprocessor.api.user;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import com.bulkprocessor.storage.repository.BulkRecordErrorRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/user/jobs")
@CrossOrigin(origins = "*")
public class UserJobController {

    private final BulkJobRepository bulkJobRepository;
    private final BulkRecordErrorRepository bulkRecordErrorRepository;

    public UserJobController(BulkJobRepository bulkJobRepository, BulkRecordErrorRepository bulkRecordErrorRepository) {
        this.bulkJobRepository = bulkJobRepository;
        this.bulkRecordErrorRepository = bulkRecordErrorRepository;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkJobEntity> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("processId") String processId) {

        String jobId = "job-" + UUID.randomUUID();
        BulkJobEntity job = new BulkJobEntity();
        job.setJobId(jobId);
        job.setFileName(file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown.csv");
        job.setSourceUri("upload://" + job.getFileName());
        job.setProcessId(processId);
        job.setStatus("PENDING");
        job.setStartTime(Instant.now());
        job.setTotalRecords(0L);
        job.setProcessedRecords(0L);
        job.setSuccessfulRecords(0L);
        job.setFailedRecords(0L);

        BulkJobEntity saved = bulkJobRepository.save(job);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<BulkJobEntity>> listJobs() {
        return ResponseEntity.ok(bulkJobRepository.findByOrderByStartTimeDesc());
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<BulkJobEntity> getJob(@PathVariable String jobId) {
        return bulkJobRepository.findById(jobId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{jobId}/errors")
    public ResponseEntity<List<BulkRecordErrorEntity>> getJobErrors(@PathVariable String jobId) {
        return ResponseEntity.ok(bulkRecordErrorRepository.findByJobId(jobId));
    }

    @GetMapping(value = "/{jobId}/report", produces = "text/csv")
    public ResponseEntity<String> downloadReport(@PathVariable String jobId) {
        return bulkJobRepository.findById(jobId)
            .map(job -> {
                StringBuilder csv = new StringBuilder();
                csv.append("Job ID,File Name,Status,Total Records,Processed Records,Successful Records,Failed Records,Start Time\n");
                csv.append(String.format("%s,%s,%s,%d,%d,%d,%d,%s\n",
                    job.getJobId(),
                    job.getFileName(),
                    job.getStatus(),
                    job.getTotalRecords() != null ? job.getTotalRecords() : 0,
                    job.getProcessedRecords() != null ? job.getProcessedRecords() : 0,
                    job.getSuccessfulRecords() != null ? job.getSuccessfulRecords() : 0,
                    job.getFailedRecords() != null ? job.getFailedRecords() : 0,
                    job.getStartTime() != null ? job.getStartTime().toString() : ""
                ));

                HttpHeaders headers = new HttpHeaders();
                headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report-" + jobId + ".csv\"");
                headers.setContentType(MediaType.parseMediaType("text/csv"));

                return new ResponseEntity<>(csv.toString(), headers, HttpStatus.OK);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}

