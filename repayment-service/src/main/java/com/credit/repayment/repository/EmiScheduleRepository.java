package com.credit.repayment.repository;

import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmiScheduleRepository extends JpaRepository<EmiSchedule, Long> {

    List<EmiSchedule> findByLoanIdOrderByInstallmentNumberAsc(Long loanId);

    List<EmiSchedule> findByLoanIdAndStatusIn(Long loanId, List<EmiStatus> statuses);

    List<EmiSchedule> findByDueDateAndStatusIn(LocalDate dueDate, List<EmiStatus> statuses);

    List<EmiSchedule> findByStatusIn(List<EmiStatus> statuses);

    Optional<EmiSchedule> findFirstByLoanIdAndStatusInOrderByDueDateAsc(
            Long loanId, List<EmiStatus> statuses);

    @Query("SELECT e FROM EmiSchedule e WHERE e.dueDate BETWEEN :from AND :to AND e.status IN :statuses")
    List<EmiSchedule> findDueBetween(@Param("from") LocalDate from,
                                      @Param("to") LocalDate to,
                                      @Param("statuses") List<EmiStatus> statuses);

    @Query("SELECT SUM(e.penaltyAmount) FROM EmiSchedule e WHERE e.loanId = :loanId AND e.penaltyAmount IS NOT NULL")
    Double getTotalPenaltyByLoanId(@Param("loanId") Long loanId);
}
