package com.credit.disbursement.kafka;

import com.credit.disbursement.entity.LoanDisbursement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class DisbursementEventPublisher {

    private final KafkaTemplate<String, Map<String, Object>> kafkaTemplate;

    private static final String LOAN_TOPIC       = "loan-events";
    private static final String REPAYMENT_TOPIC  = "repayment-events";

    public void publishDisbursementCompleted(LoanDisbursement d,
                                              int tenureMonths, double interestRate) {
        // Notify loan service & notification service
        Map<String, Object> loanEvent = new HashMap<>();
        loanEvent.put("eventType",         "LOAN_DISBURSED");
        loanEvent.put("loanApplicationId", d.getLoanApplicationId());
        loanEvent.put("customerId",        d.getCustomerId());
        loanEvent.put("disbursedAmount",   d.getDisbursedAmount());
        loanEvent.put("transactionId",     d.getPaymentGatewayRefId());
        loanEvent.put("disbursedAt",       d.getDisbursedAt().toString());
        kafkaTemplate.send(LOAN_TOPIC, String.valueOf(d.getLoanApplicationId()), loanEvent);

        // Trigger EMI schedule creation in repayment service
        Map<String, Object> repaymentEvent = new HashMap<>();
        repaymentEvent.put("eventType",         "CREATE_EMI_SCHEDULE");
        repaymentEvent.put("loanApplicationId", d.getLoanApplicationId());
        repaymentEvent.put("customerId",        d.getCustomerId());
        repaymentEvent.put("principal",         d.getDisbursedAmount());
        repaymentEvent.put("tenureMonths",      tenureMonths);
        repaymentEvent.put("interestRate",      interestRate);
        repaymentEvent.put("firstEmiDate",      d.getFirstEmiDate().toString());
        repaymentEvent.put("eventTime",         LocalDateTime.now().toString());
        kafkaTemplate.send(REPAYMENT_TOPIC, String.valueOf(d.getLoanApplicationId()), repaymentEvent);

        log.info("Published disbursement events: loanId={}", d.getLoanApplicationId());
    }

    public void publishDisbursementFailed(LoanDisbursement d, String reason) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType",         "DISBURSEMENT_FAILED");
        event.put("loanApplicationId", d.getLoanApplicationId());
        event.put("customerId",        d.getCustomerId());
        event.put("reason",            reason);
        event.put("eventTime",         LocalDateTime.now().toString());
        kafkaTemplate.send(LOAN_TOPIC, String.valueOf(d.getLoanApplicationId()), event);
    }
}
