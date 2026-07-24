package com.credit.notification.kafka;

import com.credit.notification.service.EmailService;
import com.credit.notification.service.SmsService;
import com.credit.notification.service.NotificationHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Consumes ALL Kafka events across the platform and dispatches notifications.
 * Topics: customer-events, loan-events, repayment-events
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventConsumer {

    private final EmailService              emailService;
    private final SmsService               smsService;
    private final NotificationHistoryService historyService;

    // ---- Customer events ----

    @KafkaListener(topics = "customer-events", groupId = "notification-service",
                   containerFactory = "kafkaListenerContainerFactory")
    public void handleCustomerEvent(@Payload Map<String, Object> event,
                                     @Header(KafkaHeaders.RECEIVED_KEY) String key) {
        String eventType = (String) event.get("eventType");
        String email  = (String) event.get("email");
        String mobile = (String) event.get("mobile");
        String name   = (String) event.get("fullName");
        Long   customerId = Long.valueOf(event.get("customerId").toString());

        log.info("Received customer event: {} for customerId: {}", eventType, customerId);

        switch (eventType) {
            case "CUSTOMER_REGISTERED" -> {
                emailService.sendWelcomeEmail(email, name);
                smsService.sendSms(mobile,
                        "Welcome to CreditPlatform, " + name + "! Complete your KYC to get started.");
                historyService.save(customerId, eventType, "Welcome email and SMS sent");
            }
            case "CUSTOMER_ELIGIBLE" -> {
                Integer score = (Integer) event.get("creditScore");
                emailService.sendEligibilityEmail(email, name, score);
                smsService.sendSms(mobile,
                        "Great news! You are eligible for a loan. Login to apply now.");
                historyService.save(customerId, eventType, "Eligibility notification sent");
            }
            case "CUSTOMER_REJECTED" -> {
                emailService.sendRejectionEmail(email, name, "Credit score below minimum threshold");
                historyService.save(customerId, eventType, "Rejection notification sent");
            }
        }
    }

    // ---- Loan events ----

    @KafkaListener(topics = "loan-events", groupId = "notification-service")
    public void handleLoanEvent(@Payload Map<String, Object> event) {
        String eventType  = (String) event.get("eventType");
        String email      = (String) event.get("customerEmail");
        String mobile     = (String) event.get("customerMobile");
        String name       = (String) event.get("customerName");
        Long   customerId = Long.valueOf(event.get("customerId").toString());
        Long   loanId     = Long.valueOf(event.get("loanApplicationId").toString());

        log.info("Received loan event: {} for loanId: {}", eventType, loanId);

        switch (eventType) {
            case "LOAN_SUBMITTED" -> {
                emailService.sendLoanSubmittedEmail(email, name, loanId);
                smsService.sendSms(mobile,
                        "Loan application #" + loanId + " received. We'll review and respond within 24 hours.");
                historyService.save(customerId, eventType, "Loan submission acknowledgement sent");
            }
            case "LOAN_APPROVED" -> {
                Double amount = Double.valueOf(event.get("approvedAmount").toString());
                Double emi    = Double.valueOf(event.get("emiAmount").toString());
                emailService.sendSanctionLetterEmail(email, name, loanId, amount, emi);
                smsService.sendSms(mobile,
                        "Congratulations! Loan of Rs." + amount + " approved. EMI: Rs." + emi
                        + "/month. Login to sign agreement.");
                historyService.save(customerId, eventType, "Sanction letter sent");
            }
            case "LOAN_REJECTED" -> {
                String reason = (String) event.get("rejectionReason");
                emailService.sendLoanRejectionEmail(email, name, loanId, reason);
                historyService.save(customerId, eventType, "Rejection email sent");
            }
            case "LOAN_DISBURSED" -> {
                Double amount = Double.valueOf(event.get("disbursedAmount").toString());
                emailService.sendDisbursementEmail(email, name, loanId, amount);
                smsService.sendSms(mobile,
                        "Rs." + amount + " disbursed to your account. Your first EMI is due in 30 days.");
                historyService.save(customerId, eventType, "Disbursement confirmation sent");
            }
        }
    }

    // ---- Repayment / EMI events ----

    @KafkaListener(topics = "repayment-events", groupId = "notification-service")
    public void handleRepaymentEvent(@Payload Map<String, Object> event) {
        String eventType  = (String) event.get("eventType");
        String email      = (String) event.get("customerEmail");
        String mobile     = (String) event.get("customerMobile");
        Long   customerId = Long.valueOf(event.get("customerId").toString());

        log.info("Received repayment event: {}", eventType);

        switch (eventType) {
            case "EMI_DUE" -> {
                Double amount  = Double.valueOf(event.get("emiAmount").toString());
                String dueDate = (String) event.get("dueDate");
                smsService.sendSms(mobile,
                        "EMI of Rs." + amount + " due on " + dueDate
                        + ". Pay now to avoid penalty. Login to CreditPlatform.");
                historyService.save(customerId, eventType, "EMI due reminder sent");
            }
            case "EMI_REMINDER" -> {
                Double amount  = Double.valueOf(event.get("emiAmount").toString());
                String dueDate = (String) event.get("dueDate");
                emailService.sendEmiReminderEmail(email, amount, dueDate);
                historyService.save(customerId, eventType, "Advance EMI reminder sent");
            }
            case "EMI_PAID" -> {
                Double amount = Double.valueOf(event.get("paidAmount").toString());
                emailService.sendPaymentReceiptEmail(email, amount,
                        event.get("transactionId").toString());
                smsService.sendSms(mobile,
                        "EMI payment of Rs." + amount + " received. Thank you!");
                historyService.save(customerId, eventType, "Payment receipt sent");
            }
            case "EMI_OVERDUE" -> {
                Double penalty = Double.valueOf(event.get("penaltyAmount").toString());
                smsService.sendSms(mobile,
                        "Your EMI is overdue. Penalty of Rs." + penalty + " applied. Pay immediately.");
                emailService.sendOverdueNotificationEmail(email, penalty);
                historyService.save(customerId, eventType, "Overdue alert sent");
            }
            case "NPA_FLAGGED" -> {
                emailService.sendNpaNotificationEmail(email);
                historyService.save(customerId, eventType, "NPA notification sent");
            }
            case "LOAN_CLOSED" -> {
                emailService.sendLoanClosureEmail(email);
                smsService.sendSms(mobile,
                        "Congratulations! Your loan has been fully repaid. NOC will be sent to your email.");
                historyService.save(customerId, eventType, "Loan closure notification sent");
            }
        }
    }
}
