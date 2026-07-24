package com.credit.disbursement.service;

import com.credit.disbursement.entity.LoanDisbursement;
import com.credit.disbursement.entity.LoanDisbursement.DisbursementStatus;
import com.credit.disbursement.kafka.DisbursementEventPublisher;
import com.credit.disbursement.repository.LoanDisbursementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DisbursementService {

    private final LoanDisbursementRepository disbursementRepository;
    private final DisbursementEventPublisher  eventPublisher;
    private final RazorpayPayoutService       razorpayService;

    /**
     * Triggered by consuming 'AGREEMENT_SIGNED' Kafka event.
     * Initiates fund transfer via Razorpay Payout API.
     */
    @Transactional
    public LoanDisbursement initiateDisbursement(Long loanApplicationId, Long customerId,
                                                   Double approvedAmount, Double processingFee,
                                                   Integer tenureMonths, Double interestRate) {
        // Idempotency check — prevent double disbursement
        if (disbursementRepository.existsByLoanApplicationId(loanApplicationId)) {
            log.warn("Disbursement already exists for loanApplicationId: {}", loanApplicationId);
            return disbursementRepository.findByLoanApplicationId(loanApplicationId).orElseThrow();
        }

        double netAmount = approvedAmount - processingFee;

        LoanDisbursement disbursement = LoanDisbursement.builder()
                .loanApplicationId(loanApplicationId)
                .customerId(customerId)
                .disbursedAmount(approvedAmount)
                .processingFee(processingFee)
                .netAmountTransferred(netAmount)
                .status(DisbursementStatus.INITIATED)
                .firstEmiDate(LocalDate.now().plusDays(30))
                .build();

        disbursementRepository.save(disbursement);

        // Trigger async Razorpay payout
        processPayout(disbursement, netAmount, tenureMonths, interestRate);

        return disbursement;
    }

    @Transactional
    public void processPayout(LoanDisbursement disbursement, double amount,
                               int tenureMonths, double interestRate) {
        disbursement.setStatus(DisbursementStatus.PROCESSING);
        disbursementRepository.save(disbursement);

        try {
            // Call Razorpay Payout API (mock in dev)
            String payoutId = razorpayService.createPayout(
                    disbursement.getCustomerId(), amount,
                    "Loan disbursement - Ref#" + disbursement.getLoanApplicationId());

            disbursement.setPaymentGatewayRefId(payoutId);
            disbursement.setStatus(DisbursementStatus.COMPLETED);
            disbursement.setDisbursedAt(LocalDateTime.now());
            disbursementRepository.save(disbursement);

            // Publish event → Repayment service creates EMI schedule
            //               → Notification service sends confirmation
            eventPublisher.publishDisbursementCompleted(disbursement, tenureMonths, interestRate);

            log.info("Disbursement completed: loanId={}, amount={}, payoutId={}",
                    disbursement.getLoanApplicationId(), amount, payoutId);

        } catch (Exception e) {
            disbursement.setStatus(DisbursementStatus.FAILED);
            disbursement.setFailureReason(e.getMessage());
            disbursementRepository.save(disbursement);

            eventPublisher.publishDisbursementFailed(disbursement, e.getMessage());
            log.error("Disbursement failed: loanId={}", disbursement.getLoanApplicationId(), e);
        }
    }

    public LoanDisbursement getDisbursement(Long loanApplicationId) {
        return disbursementRepository.findByLoanApplicationId(loanApplicationId)
                .orElseThrow(() -> new RuntimeException(
                        "Disbursement not found for loan: " + loanApplicationId));
    }
}
