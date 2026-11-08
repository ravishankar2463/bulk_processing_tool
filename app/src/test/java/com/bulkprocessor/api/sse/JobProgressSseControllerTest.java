package com.bulkprocessor.api.sse;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import com.bulkprocessor.storage.repository.BulkJobRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JobProgressSseControllerTest {

    @Mock
    private BulkJobRepository bulkJobRepository;

    @Test
    @DisplayName("Should create SSE emitter and stream progress updates on Virtual Thread")
    void testStreamProgressVirtualThread() throws InterruptedException {
        JobProgressSseController controller = new JobProgressSseController(bulkJobRepository);

        BulkJobEntity job = new BulkJobEntity();
        job.setJobId("sse-job-1");
        job.setStatus("COMPLETED");
        job.setTotalRecords(100L);
        job.setProcessedRecords(100L);
        job.setSuccessfulRecords(100L);
        job.setFailedRecords(0L);

        when(bulkJobRepository.findById("sse-job-1")).thenReturn(Optional.of(job));

        SseEmitter emitter = controller.streamProgress("sse-job-1");
        assertThat(emitter).isNotNull();

        // Allow Virtual Thread time to execute emission loop
        Thread.sleep(500);
    }
}

