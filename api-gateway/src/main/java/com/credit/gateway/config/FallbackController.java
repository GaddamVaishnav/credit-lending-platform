package com.credit.gateway.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
public class FallbackController {

    @RequestMapping("/fallback/onboarding")
    public ResponseEntity<Map<String, Object>> onboardingFallback() {
        return fallback("onboarding-service", "Customer onboarding service is temporarily unavailable");
    }

    @RequestMapping("/fallback/loan")
    public ResponseEntity<Map<String, Object>> loanFallback() {
        return fallback("loan-service", "Loan service is temporarily unavailable");
    }

    @RequestMapping("/fallback/disbursement")
    public ResponseEntity<Map<String, Object>> disbursementFallback() {
        return fallback("disbursement-service", "Disbursement service is temporarily unavailable");
    }

    @RequestMapping("/fallback/repayment")
    public ResponseEntity<Map<String, Object>> repaymentFallback() {
        return fallback("repayment-service", "Repayment service is temporarily unavailable");
    }

    private ResponseEntity<Map<String, Object>> fallback(String service, String message) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "timestamp", LocalDateTime.now().toString(),
                "status", 503,
                "service", service,
                "message", message,
                "suggestion", "Please try again in a few moments"
        ));
    }
}
