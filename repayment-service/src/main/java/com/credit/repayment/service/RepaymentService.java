package com.credit.repayment.service;

import com.credit.repayment.dto.PaymentRequest;
import com.credit.repayment.dto.PaymentResponse;
import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import com.credit.repayment.entity.LoanAccount;
import com.credit.repayment.entity.LoanAccount.LoanAccountStatus;
import com.credit.repayment.kafka.RepaymentEventPublisher;
import com.credit.repayment.repository.EmiScheduleRepository;
import com.credit.repayment.repository.LoanAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepaymentService {

    private final EmiScheduleRepository  emiRepository;
    private final LoanAccountRepository  accountRepository;
    private final RepaymentEventPublisher eventPublisher;

    /**
     * Process a manual EMI payment made by the customer.
     */
    @Transactional
    public PaymentResponse processPayment(Long customerId, PaymentRequest request) {
        LoanAccount account = accountRepository
                .findByLoanApplicationIdAndCustomerId(request.getLoanId(), customerId)
                .orElseThrow(() -> new RuntimeException("Loan account not found"));

        if (account.getStatus() != LoanAccountStatus.ACTIVE) {
            throw new RuntimeException("Loan account is not active: " + account.getStatus());
        }

        // Find earliest unpaid EMI
        EmiSchedule emi = emiRepository
                .findFirstByLoanIdAndStatusInOrderByDueDateAsc(
                        request.getLoanId(),
                        List.of(EmiStatus.DUE, EmiStatus.OVERDUE, EmiStatus.UPCOMING))
                .orElseThrow(() -> new RuntimeException("No pending EMI found for loan: " + request.getLoanId()));

        double penalty      = emi.getPenaltyAmount() != null ? emi.getPenaltyAmount() : 0.0;
        double totalDue     = emi.getEmiAmount() + penalty;
        double paid         = request.getAmount();
        String transactionId = "TXN" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();

        if (paid >= totalDue) {
            // Full payment
            emi.setStatus(EmiStatus.PAID);
            emi.setPaidAmount(paid);
            emi.setPaidDate(LocalDate.now());
            emi.setPaymentTransactionId(transactionId);
            emi.setPaymentMode(request.getPaymentMode());
        } else {
            // Partial payment
            emi.setStatus(EmiStatus.PARTIALLY_PAID);
            emi.setPaidAmount(paid);
            emi.setPaymentTransactionId(transactionId);
        }
        emiRepository.save(emi);

        // Update loan account summary
        account.setTotalAmountPaid((account.getTotalAmountPaid() != null
                ? account.getTotalAmountPaid() : 0) + paid);
        account.setOutstandingPrincipal(
                account.getOutstandingPrincipal() - emi.getPrincipalComponent());
        account.setEmilsPaid((account.getEmilsPaid() != null ? account.getEmilsPaid() : 0) + 1);
        account.setEmisRemaining(account.getTenureMonths() - account.getEmilsPaid());

        // Check if loan is fully repaid
        boolean allPaid = emiRepository
                .findByLoanIdAndStatusIn(request.getLoanId(),
                        List.of(EmiStatus.UPCOMING, EmiStatus.DUE, EmiStatus.OVERDUE))
                .isEmpty();

        if (allPaid) {
            account.setStatus(LoanAccountStatus.CLOSED);
            account.setClosedAt(LocalDate.now());
            eventPublisher.publishLoanClosed(account);
            log.info("Loan fully repaid and closed: loanId={}", request.getLoanId());
        }

        accountRepository.save(account);
        eventPublisher.publishEmiPaid(emi, transactionId, paid);

        return PaymentResponse.builder()
                .transactionId(transactionId)
                .loanId(request.getLoanId())
                .installmentNumber(emi.getInstallmentNumber())
                .amountPaid(paid)
                .penaltyPaid(penalty)
                .remainingEmis(account.getEmisRemaining())
                .outstandingPrincipal(account.getOutstandingPrincipal())
                .paymentDate(LocalDate.now())
                .status(emi.getStatus().name())
                .loanClosed(allPaid)
                .build();
    }

    public List<EmiSchedule> getEmiSchedule(Long loanId, Long customerId) {
        LoanAccount account = accountRepository
                .findByLoanApplicationIdAndCustomerId(loanId, customerId)
                .orElseThrow(() -> new RuntimeException("Loan account not found"));
        return emiRepository.findByLoanIdOrderByInstallmentNumberAsc(loanId);
    }

    public LoanAccount getLoanAccountSummary(Long loanId, Long customerId) {
        return accountRepository.findByLoanApplicationIdAndCustomerId(loanId, customerId)
                .orElseThrow(() -> new RuntimeException("Loan account not found"));
    }
}
