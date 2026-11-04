package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.BulkJobEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BulkJobRepository extends JpaRepository<BulkJobEntity, String> {
    List<BulkJobEntity> findByStatus(String status);
    List<BulkJobEntity> findByOrderByStartTimeDesc();
}

