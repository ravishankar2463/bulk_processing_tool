package com.bulkprocessor.storage.repository;

import com.bulkprocessor.storage.entity.RouteTopologyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteTopologyRepository extends JpaRepository<RouteTopologyEntity, String> {
    Optional<RouteTopologyEntity> findByRouteId(String routeId);
    void deleteByRouteId(String routeId);
}
