package com.credit.repayment.kafka;

import com.credit.repayment.entity.LoanAccount;
import com.credit.repayment.repository.LoanAccountRepository;
import com.credit.repayment.service.EmiCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DisbursementEventConsumer {

    private final EmiCalculationService emiCalculationService;
    private final LoanAccountRepository loanAccountRepository;

    /**
     * Consumes 'CREATE_EMI_SCHEDULE' event from disbursement-service.
     * Creates LoanAccount + full EMI schedule.
     */
    @KafkaListener(topics = "repayment-events",
                   groupId = "repayment-service-emi-creator",
                   containerFactory = "kafkaListenerContainerFactory")
    @Transactional
    public void handleRepaymentEvent(@Payload Map<String, Object> event) {
        String eventType = (String) event.get("eventType");

        if (!"CREATE_EMI_SCHEDULE".equals(eventType)) return;

        Long   loanId      = Long.valueOf(event.get("loanApplicationId").toString());
        Long   customerId  = Long.valueOf(event.get("customerId").toString());
        Double principal   = Double.valueOf(event.get("principal").toString());
        Integer tenure     = Integer.valueOf(event.get("tenureMonths").toString());
        Double rate        = Double.valueOf(event.get("interestRate").toString());
        LocalDate firstEmi = LocalDate.parse(event.get("firstEmiDate").toString());

        // Idempotency — don't create duplicate schedules
        if (loanAccountRepository.existsByLoanApplicationId(loanId)) {
            log.warn("EMI schedule already exists for loanId: {}", loanId);
            return;
        }

        log.info("Creating EMI schedule: loanId={}, principal={}, tenure={}, rate={}",
                loanId, principal, tenure, rate);

        double monthlyRate = rate / 12 / 100;
        double emi = emiCalculationService.calculateEmi(principal, monthlyRate, tenure);

        // Create loan account
        LoanAccount account = LoanAccount.builder()
                .loanApplicationId(loanId)
                .customerId(customerId)
                .principalAmount(principal)
                .annualInterestRate(rate)
                .tenureMonths(tenure)
                .emiAmount(Math.round(emi * 100.0) / 100.0)
                .outstandingPrincipal(principal)
                .totalAmountPaid(0.0)
                .emilsPaid(0)
                .emisRemaining(tenure)
                .firstEmiDate(firstEmi)
                .nextEmiDate(firstEmi)
                .status(LoanAccount.LoanAccountStatus.ACTIVE)
                .build();

        loanAccountRepository.save(account);

        // Generate full EMI schedule
        emiCalculationService.generateEmiSchedule(loanId, customerId, principal, rate, tenure, firstEmi);

        log.info("EMI schedule created: loanId={}, installments={}, EMI={}",
                loanId, tenure, Math.round(emi));
    }
}
