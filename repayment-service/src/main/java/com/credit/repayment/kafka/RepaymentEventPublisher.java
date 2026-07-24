package com.credit.repayment.kafka;

import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.LoanAccount;
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
public class RepaymentEventPublisher {

    private final KafkaTemplate<String, Map<String, Object>> kafkaTemplate;
    private static final String TOPIC = "repayment-events";

    public void publishEmiDue(EmiSchedule emi) {
        Map<String, Object> event = buildEmiEvent(emi, "EMI_DUE");
        kafkaTemplate.send(TOPIC, String.valueOf(emi.getLoanId()), event);
    }

    public void publishEmiReminder(EmiSchedule emi, int daysAhead) {
        Map<String, Object> event = buildEmiEvent(emi, "EMI_REMINDER");
        event.put("daysAhead", daysAhead);
        kafkaTemplate.send(TOPIC, String.valueOf(emi.getLoanId()), event);
    }

    public void publishEmiPaid(EmiSchedule emi, String transactionId, double paidAmount) {
        Map<String, Object> event = buildEmiEvent(emi, "EMI_PAID");
        event.put("transactionId", transactionId);
        event.put("paidAmount",    paidAmount);
        kafkaTemplate.send(TOPIC, String.valueOf(emi.getLoanId()), event);
        log.info("Published EMI_PAID event: loanId={}, txn={}", emi.getLoanId(), transactionId);
    }

    public void publishEmiOverdue(EmiSchedule emi) {
        Map<String, Object> event = buildEmiEvent(emi, "EMI_OVERDUE");
        event.put("daysOverdue",   emi.getDaysOverdue());
        event.put("penaltyAmount", emi.getPenaltyAmount());
        kafkaTemplate.send(TOPIC, String.valueOf(emi.getLoanId()), event);
    }

    public void publishNpaFlagged(EmiSchedule emi) {
        Map<String, Object> event = buildEmiEvent(emi, "NPA_FLAGGED");
        kafkaTemplate.send(TOPIC, String.valueOf(emi.getLoanId()), event);
        log.warn("Published NPA_FLAGGED: loanId={}", emi.getLoanId());
    }

    public void publishLoanClosed(LoanAccount account) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType",         "LOAN_CLOSED");
        event.put("loanId",            account.getLoanApplicationId());
        event.put("customerId",        account.getCustomerId());
        event.put("totalAmountPaid",   account.getTotalAmountPaid());
        event.put("closedAt",          account.getClosedAt().toString());
        event.put("eventTime",         LocalDateTime.now().toString());
        kafkaTemplate.send(TOPIC, String.valueOf(account.getLoanApplicationId()), event);
        log.info("Published LOAN_CLOSED: loanId={}", account.getLoanApplicationId());
    }

    private Map<String, Object> buildEmiEvent(EmiSchedule emi, String eventType) {
        Map<String, Object> event = new HashMap<>();
        event.put("eventType",          eventType);
        event.put("loanId",             emi.getLoanId());
        event.put("customerId",         emi.getCustomerId());
        event.put("installmentNumber",  emi.getInstallmentNumber());
        event.put("emiAmount",          emi.getEmiAmount());
        event.put("dueDate",            emi.getDueDate().toString());
        event.put("status",             emi.getStatus().name());
        event.put("eventTime",          LocalDateTime.now().toString());
        return event;
    }
}
