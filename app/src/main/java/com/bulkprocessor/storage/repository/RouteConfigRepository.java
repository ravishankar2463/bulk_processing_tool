package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.RouteConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteConfigRepository extends JpaRepository<RouteConfigEntity, String> {
    List<RouteConfigEntity> findByStatus(String status);
    List<RouteConfigEntity> findByProcessId(String processId);
}

