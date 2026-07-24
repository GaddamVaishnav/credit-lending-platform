package com.credit.onboarding.repository;

import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);

    Optional<Customer> findByMobile(String mobile);

    boolean existsByEmail(String email);

    boolean existsByMobile(String mobile);

    List<Customer> findByStatus(CustomerStatus status);

    @Query("SELECT c FROM Customer c WHERE c.status = :status AND c.creditScore >= :minScore")
    List<Customer> findEligibleCustomers(@Param("status") CustomerStatus status,
                                          @Param("minScore") int minScore);

    @Query("SELECT COUNT(c) FROM Customer c WHERE c.status = :status")
    long countByStatus(@Param("status") CustomerStatus status);
}
