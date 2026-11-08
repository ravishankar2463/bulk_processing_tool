package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BulkJobRepository extends JpaRepository<BulkJobEntity, String> {
    List<BulkJobEntity> findByStatus(String status);
    List<BulkJobEntity> findByOrderByStartTimeDesc();
    List<BulkJobEntity> findByProcessIdOrderByStartTimeDesc(String processId);
    long countByProcessIdAndStatusIn(String processId, java.util.Collection<String> statuses);
    long countByProcessId(String processId);

    interface JobMetricsProjection {
        Long getTotalProcessed();
        Long getTotalSuccessful();
        Long getTotalFailed();
    }

    @Query("SELECT COALESCE(SUM(j.processedRecords), 0) AS totalProcessed, " +
           "COALESCE(SUM(j.successfulRecords), 0) AS totalSuccessful, " +
           "COALESCE(SUM(j.failedRecords), 0) AS totalFailed " +
           "FROM BulkJobEntity j WHERE j.processId = :processId")
    JobMetricsProjection getMetricsSummaryByProcessId(@Param("processId") String processId);
}

