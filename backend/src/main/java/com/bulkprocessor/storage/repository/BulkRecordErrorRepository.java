package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.BulkRecordErrorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BulkRecordErrorRepository extends JpaRepository<BulkRecordErrorEntity, Long> {
    List<BulkRecordErrorEntity> findByJobId(String jobId);
    List<BulkRecordErrorEntity> findByJobIdAndStepName(String jobId, String stepName);
}

