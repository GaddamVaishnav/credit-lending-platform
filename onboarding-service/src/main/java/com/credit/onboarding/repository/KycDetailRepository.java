package com.credit.onboarding.repository;

import com.credit.onboarding.entity.KycDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface KycDetailRepository extends JpaRepository<KycDetail, Long> {
    Optional<KycDetail> findByCustomerId(Long customerId);
    boolean existsByCustomerId(Long customerId);
}
