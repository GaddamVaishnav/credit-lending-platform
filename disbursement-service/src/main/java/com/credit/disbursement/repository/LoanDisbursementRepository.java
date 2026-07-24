package com.credit.disbursement.repository;

import com.credit.disbursement.entity.LoanDisbursement;
import com.credit.disbursement.entity.LoanDisbursement.DisbursementStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanDisbursementRepository extends JpaRepository<LoanDisbursement, Long> {

    Optional<LoanDisbursement> findByLoanApplicationId(Long loanApplicationId);

    boolean existsByLoanApplicationId(Long loanApplicationId);

    List<LoanDisbursement> findByStatus(DisbursementStatus status);

    List<LoanDisbursement> findByCustomerId(Long customerId);
}
