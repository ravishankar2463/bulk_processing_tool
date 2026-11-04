package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.ProcessDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProcessDefinitionRepository extends JpaRepository<ProcessDefinitionEntity, String> {
    List<ProcessDefinitionEntity> findByIsActiveTrue();
}

