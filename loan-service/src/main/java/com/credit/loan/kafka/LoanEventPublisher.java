package com.credit.loan.kafka;

import com.credit.loan.entity.LoanApplication;
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
public class LoanEventPublisher {

    private final KafkaTemplate<String, Map<String, Object>> kafkaTemplate;

    private static final String TOPIC = "loan-events";

    public void publishLoanSubmitted(LoanApplication app) {
        publish(app, "LOAN_SUBMITTED");
    }

    public void publishLoanApproved(LoanApplication app) {
        Map<String, Object> event = buildBaseEvent(app, "LOAN_APPROVED");
        event.put("approvedAmount", app.getApprovedAmount());
        event.put("interestRate",   app.getInterestRate());
        event.put("emiAmount",      app.getEmiAmount());
        event.put("processingFee",  app.getProcessingFee());
        kafkaTemplate.send(TOPIC, String.valueOf(app.getId()), event);
        log.info("Published LOAN_APPROVED event: loanId={}", app.getId());
    }

    public void publishLoanRejected(LoanApplication app) {
        Map<String, Object> event = buildBaseEvent(app, "LOAN_REJECTED");
        event.put("rejectionReason", app.getRejectionReason());
        kafkaTemplate.send(TOPIC, String.valueOf(app.getId()), event);
        log.info("Published LOAN_REJECTED event: loanId={}", app.getId());
    }

    public void publishAgreementSigned(LoanApplication app) {
        Map<String, Object> event = buildBaseEvent(app, "AGREEMENT_SIGNED");
        event.put("approvedAmount",      app.getApprovedAmount());
        event.put("tenureMonths",        app.getTenureMonths());
        event.put("interestRate",        app.getInterestRate());
        event.put("emiAmount",           app.getEmiAmount());
        event.put("agreementSignedAt",   app.getAgreementSignedAt().toString());
        kafkaTemplate.send(TOPIC, String.valueOf(app.getId()), event);
        log.info("Published AGREEMENT_SIGNED event: loanId={}", app.getId());
    }

    public void publishLoanDisbursed(LoanApplication app, Double disbursedAmount,
                                      String transactionId) {
        Map<String, Object> event = buildBaseEvent(app, "LOAN_DISBURSED");
        event.put("disbursedAmount", disbursedAmount);
        event.put("transactionId",   transactionId);
        kafkaTemplate.send(TOPIC, String.valueOf(app.getId()), event);
        log.info("Published LOAN_DISBURSED event: loanId={}", app.getId());
    }

    private void publish(LoanApplication app, String eventType) {
        Map<String, Object> event = buildBaseEvent(app, eventType);
        kafkaTemplate.send(TOPIC, String.valueOf(app.getId()), event);
        log.info("Published {} event: loanId={}", eventType, app.getId());
    }

    private Map<String, Object> buildBaseEvent(LoanApplication app, String eventType) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType",          eventType);
        event.put("loanApplicationId",  app.getId());
        event.put("customerId",         app.getCustomerId());
        event.put("loanType",           app.getLoanType().name());
        event.put("requestedAmount",    app.getRequestedAmount());
        event.put("eventTime",          LocalDateTime.now().toString());
        // NOTE: In production, fetch customer email/mobile from onboarding-service via Feign
        return event;
    }
}
