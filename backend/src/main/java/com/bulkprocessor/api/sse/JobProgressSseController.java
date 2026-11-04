package com.bulkprocessor.api.sse;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.Executors;

@RestController
@RequestMapping("/api/v1/jobs")
@CrossOrigin(origins = "*")
public class JobProgressSseController {

    private final BulkJobRepository bulkJobRepository;

    public JobProgressSseController(BulkJobRepository bulkJobRepository) {
        this.bulkJobRepository = bulkJobRepository;
    }

    @GetMapping(value = "/{jobId}/progress/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamProgress(@PathVariable String jobId) {
        SseEmitter emitter = new SseEmitter(180_000L); // 3 minutes timeout

        // Spawn a Java 21 Virtual Thread for streaming progress updates
        Thread.ofVirtual().start(() -> {
            try {
                for (int i = 0; i < 5; i++) {
                    BulkJobEntity job = bulkJobRepository.findById(jobId).orElse(null);
                    if (job != null) {
                        long total = job.getTotalRecords() != null ? job.getTotalRecords() : 100;
                        long processed = job.getProcessedRecords() != null ? job.getProcessedRecords() : 0;
                        double pct = total > 0 ? (double) processed / total * 100.0 : 0.0;

                        emitter.send(SseEmitter.event()
                            .name("progress")
                            .data(Map.of(
                                "jobId", job.getJobId(),
                                "status", job.getStatus(),
                                "totalRecords", total,
                                "processedRecords", processed,
                                "successfulRecords", job.getSuccessfulRecords() != null ? job.getSuccessfulRecords() : 0,
                                "failedRecords", job.getFailedRecords() != null ? job.getFailedRecords() : 0,
                                "percentage", pct
                            ))
                        );

                        if ("COMPLETED".equals(job.getStatus()) || "FAILED".equals(job.getStatus())) {
                            break;
                        }
                    }
                    Thread.sleep(300);
                }
                emitter.complete();
            } catch (IOException | InterruptedException e) {
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }
}

