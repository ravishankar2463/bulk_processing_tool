package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.ComponentInstanceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComponentInstanceRepository extends JpaRepository<ComponentInstanceEntity, String> {
    List<ComponentInstanceEntity> findByComponentType(String componentType);
    List<ComponentInstanceEntity> findByIsActiveTrue();
}

