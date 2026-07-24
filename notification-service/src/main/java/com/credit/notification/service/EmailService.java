package com.credit.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@creditplatform.com}")
    private String fromEmail;

    @Async
    public void sendWelcomeEmail(String to, String name) {
        String subject = "Welcome to CreditPlatform!";
        String body = buildWelcomeHtml(name);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendEligibilityEmail(String to, String name, Integer creditScore) {
        String subject = "You're eligible for a loan!";
        String body = String.format("""
            <h2>Great news, %s!</h2>
            <p>Your credit score of <strong>%d</strong> qualifies you for our loan products.</p>
            <p>Login to your account to apply for a loan that suits your needs.</p>
            <a href='https://creditplatform.com/apply' style='background:#2563eb;color:#fff;
               padding:12px 24px;border-radius:6px;text-decoration:none;'>Apply Now</a>
            """, name, creditScore);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendSanctionLetterEmail(String to, String name, Long loanId,
                                         Double amount, Double emi) {
        String subject = "Loan Sanction Letter - Application #" + loanId;
        String body = String.format("""
            <h2>Loan Approved!</h2>
            <p>Dear %s,</p>
            <p>We are pleased to inform you that your loan application has been approved.</p>
            <table style='border-collapse:collapse;width:100%%'>
              <tr><td style='padding:8px;border:1px solid #ddd'><b>Application ID</b></td>
                  <td style='padding:8px;border:1px solid #ddd'>#%d</td></tr>
              <tr><td style='padding:8px;border:1px solid #ddd'><b>Approved Amount</b></td>
                  <td style='padding:8px;border:1px solid #ddd'>Rs. %.2f</td></tr>
              <tr><td style='padding:8px;border:1px solid #ddd'><b>Monthly EMI</b></td>
                  <td style='padding:8px;border:1px solid #ddd'>Rs. %.2f</td></tr>
            </table>
            <p>Please login to sign your loan agreement to proceed with disbursement.</p>
            <a href='https://creditplatform.com/loans/%d/agreement'>Sign Agreement</a>
            """, name, loanId, amount, emi, loanId);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendDisbursementEmail(String to, String name, Long loanId, Double amount) {
        String subject = "Loan Disbursed - Rs. " + amount;
        String body = String.format("""
            <h2>Loan Disbursed!</h2>
            <p>Dear %s,</p>
            <p>Rs. <strong>%.2f</strong> has been transferred to your bank account.</p>
            <p>Your first EMI will be due 30 days from today. Set up auto-pay to never miss an EMI.</p>
            """, name, amount);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendLoanRejectionEmail(String to, String name, Long loanId, String reason) {
        String subject = "Loan Application Update - #" + loanId;
        String body = String.format("""
            <h2>Application Update</h2>
            <p>Dear %s,</p>
            <p>We regret to inform you that your loan application #%d could not be approved at this time.</p>
            <p><b>Reason:</b> %s</p>
            <p>You may reapply after 90 days or contact our support team for assistance.</p>
            """, name, loanId, reason);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendEmiReminderEmail(String to, Double amount, String dueDate) {
        String subject = "EMI Reminder - Due on " + dueDate;
        String body = String.format("""
            <h2>EMI Reminder</h2>
            <p>Your EMI of Rs. <strong>%.2f</strong> is due on <strong>%s</strong>.</p>
            <p>Please ensure sufficient balance in your account for auto-debit.</p>
            <a href='https://creditplatform.com/repayment'>Pay Now</a>
            """, amount, dueDate);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendPaymentReceiptEmail(String to, Double amount, String transactionId) {
        String subject = "Payment Receipt - Rs. " + amount;
        String body = String.format("""
            <h2>Payment Received</h2>
            <p>Thank you! Your EMI payment of Rs. <strong>%.2f</strong> has been received.</p>
            <p><b>Transaction ID:</b> %s</p>
            <p>Download your receipt from the customer portal.</p>
            """, amount, transactionId);
        sendHtmlEmail(to, subject, body);
    }

    @Async
    public void sendOverdueNotificationEmail(String to, Double penalty) {
        sendHtmlEmail(to, "Urgent: EMI Overdue",
                "<h2>EMI Overdue</h2><p>Your EMI is overdue. A penalty of Rs."
                + penalty + " has been applied. Please pay immediately to avoid further charges.</p>");
    }

    @Async
    public void sendLoanClosureEmail(String to) {
        sendHtmlEmail(to, "Loan Closed - No Objection Certificate",
                "<h2>Congratulations!</h2><p>Your loan has been fully repaid. "
                + "Your No Objection Certificate (NOC) is attached to this email.</p>");
    }

    @Async
    public void sendRejectionEmail(String to, String name, String reason) {
        sendHtmlEmail(to, "Account Verification Update",
                "<p>Dear " + name + ",</p><p>" + reason + "</p>");
    }

    @Async
    public void sendNpaNotificationEmail(String to) {
        sendHtmlEmail(to, "Urgent: Account Status",
                "<h2>Important Notice</h2><p>Your loan account has been classified as NPA. "
                + "Please contact our collections team immediately.</p>");
    }

    @Async
    public void sendLoanSubmittedEmail(String to, String name, Long loanId) {
        sendHtmlEmail(to, "Loan Application Received - #" + loanId,
                "<p>Dear " + name + ",</p><p>Your loan application #" + loanId
                + " has been received. We will review and respond within 24 hours.</p>");
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(wrapInLayout(htmlBody), true);
            mailSender.send(message);
            log.info("Email sent to: {}, subject: {}", to, subject);
        } catch (Exception e) {
            log.error("Failed to send email to: {}", to, e);
        }
    }

    private String wrapInLayout(String body) {
        return """
            <!DOCTYPE html><html><body style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
            <div style='background:#1e40af;padding:20px;text-align:center'>
              <h1 style='color:#fff;margin:0'>CreditPlatform</h1>
            </div>
            <div style='padding:24px;background:#f9fafb'>
            """ + body + """
            </div>
            <div style='padding:12px;text-align:center;color:#6b7280;font-size:12px'>
              <p>CreditPlatform | support@creditplatform.com | 1800-XXX-XXXX</p>
            </div>
            </body></html>
            """;
    }

    private String buildWelcomeHtml(String name) {
        return String.format("""
            <h2>Welcome, %s!</h2>
            <p>Thank you for registering with CreditPlatform.</p>
            <p>Complete the following steps to apply for a loan:</p>
            <ol>
              <li>Verify your mobile number via OTP</li>
              <li>Complete KYC with your Aadhaar and PAN</li>
              <li>Upload required documents</li>
              <li>Get your credit score checked</li>
            </ol>
            <a href='https://creditplatform.com/onboarding'>Get Started</a>
            """, name);
    }
}
