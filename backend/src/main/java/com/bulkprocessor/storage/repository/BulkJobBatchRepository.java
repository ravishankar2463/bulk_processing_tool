package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.BulkJobBatchEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BulkJobBatchRepository extends JpaRepository<BulkJobBatchEntity, String> {
    List<BulkJobBatchEntity> findByJobIdOrderByBatchIndexAsc(String jobId);
}

