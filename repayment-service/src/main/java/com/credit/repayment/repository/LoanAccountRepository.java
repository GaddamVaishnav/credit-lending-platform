package com.credit.repayment.repository;

import com.credit.repayment.entity.LoanAccount;
import com.credit.repayment.entity.LoanAccount.LoanAccountStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanAccountRepository extends JpaRepository<LoanAccount, Long> {

    Optional<LoanAccount> findByLoanApplicationId(Long loanApplicationId);

    Optional<LoanAccount> findByLoanApplicationIdAndCustomerId(Long loanApplicationId, Long customerId);

    boolean existsByLoanApplicationId(Long loanApplicationId);

    List<LoanAccount> findByCustomerId(Long customerId);

    List<LoanAccount> findByStatus(LoanAccountStatus status);
}
