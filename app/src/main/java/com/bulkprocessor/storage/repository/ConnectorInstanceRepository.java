package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.ConnectorInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConnectorInstanceRepository extends JpaRepository<ConnectorInstanceEntity, String> {
    List<ConnectorInstanceEntity> findByDefinitionId(String definitionId);
    List<ConnectorInstanceEntity> findByActive(boolean active);
}
