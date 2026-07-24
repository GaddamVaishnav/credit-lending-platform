package com.credit.loan.repository;

import com.credit.loan.entity.ApplicationStatus;
import com.credit.loan.entity.LoanApplication;
import com.credit.loan.entity.LoanType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Long> {

    List<LoanApplication> findByCustomerIdOrderByAppliedAtDesc(Long customerId);

    Optional<LoanApplication> findByIdAndCustomerId(Long id, Long customerId);

    boolean existsByCustomerIdAndStatusNotIn(Long customerId, List<ApplicationStatus> statuses);

    List<LoanApplication> findByStatus(ApplicationStatus status);

    @Query("SELECT l FROM LoanApplication l WHERE l.customerId = :cId AND l.loanType = :type")
    List<LoanApplication> findByCustomerIdAndLoanType(@Param("cId") Long customerId,
                                                       @Param("type") LoanType loanType);

    @Query("SELECT COUNT(l) FROM LoanApplication l WHERE l.status = :status")
    long countByStatus(@Param("status") ApplicationStatus status);

    @Query("SELECT SUM(l.approvedAmount) FROM LoanApplication l WHERE l.status = 'DISBURSED'")
    Double getTotalDisbursedAmount();
}
