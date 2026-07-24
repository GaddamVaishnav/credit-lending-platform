package com.credit.disbursement.kafka;

import com.credit.disbursement.service.DisbursementService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class LoanEventConsumer {

    private final DisbursementService disbursementService;

    /**
     * Consumes 'AGREEMENT_SIGNED' event from loan-service.
     * Triggers fund disbursement automatically.
     */
    @KafkaListener(topics = "loan-events",
                   groupId = "disbursement-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void handleLoanEvent(@Payload Map<String, Object> event,
                                 @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        String eventType = (String) event.get("eventType");

        if (!"AGREEMENT_SIGNED".equals(eventType)) return;

        Long   loanId       = Long.valueOf(event.get("loanApplicationId").toString());
        Long   customerId   = Long.valueOf(event.get("customerId").toString());
        Double amount       = Double.valueOf(event.get("approvedAmount").toString());
        Double processingFee = amount * 0.01; // 1%
        Integer tenure      = Integer.valueOf(event.get("tenureMonths").toString());
        Double rate         = Double.valueOf(event.get("interestRate").toString());

        log.info("Received AGREEMENT_SIGNED event: loanId={}, amount={}", loanId, amount);

        disbursementService.initiateDisbursement(
                loanId, customerId, amount, processingFee, tenure, rate);
    }
}
