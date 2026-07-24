package com.credit.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.phone-number:}")
    private String twilioPhone;

    /**
     * Send SMS via Twilio (async — fire and forget).
     * In production: initialize Twilio SDK and call Message.creator()
     */
    @Async("notificationExecutor")
    public void sendSms(String to, String message) {
        try {
            // Production Twilio call (uncomment when credentials are configured):
            // Twilio.init(accountSid, authToken);
            // Message.creator(new PhoneNumber(to), new PhoneNumber(twilioPhone), message).create();

            log.info("SMS sent to: {}**** | Message: {}",
                    to.substring(0, 4), message.substring(0, Math.min(30, message.length())));
        } catch (Exception e) {
            log.error("Failed to send SMS to: {}", to, e);
        }
    }
}
