package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.ConnectorDefinitionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConnectorDefinitionRepository extends JpaRepository<ConnectorDefinitionEntity, String> {
    List<ConnectorDefinitionEntity> findByCategory(String category);
    List<ConnectorDefinitionEntity> findByProtocol(String protocol);

    @Query("SELECT c FROM ConnectorDefinitionEntity c WHERE c.builtIn = :builtIn")
    List<ConnectorDefinitionEntity> findByBuiltIn(@Param("builtIn") boolean builtIn);
}
