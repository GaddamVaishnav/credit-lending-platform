package com.credit.disbursement.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class RazorpayPayoutService {

    @Value("${razorpay.key-id:rzp_test_mock}")
    private String keyId;

    @Value("${razorpay.key-secret:mock_secret}")
    private String keySecret;

    @Value("${razorpay.account-number:mock_account}")
    private String accountNumber;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Create a payout via Razorpay Payout API.
     * In production: use official Razorpay Java SDK.
     * https://razorpay.com/docs/api/x/payouts/
     */
    public String createPayout(Long customerId, double amount, String narration) {
        log.info("Initiating Razorpay payout: customerId={}, amount={}", customerId, amount);

        // Mock implementation for development
        // Production: Uncomment and use Razorpay SDK
        /*
        RazorpayClient razorpay = new RazorpayClient(keyId, keySecret);
        JSONObject payoutRequest = new JSONObject();
        payoutRequest.put("account_number", accountNumber);
        payoutRequest.put("amount", (int)(amount * 100)); // Razorpay uses paise
        payoutRequest.put("currency", "INR");
        payoutRequest.put("mode", "NEFT");
        payoutRequest.put("purpose", "loan");
        payoutRequest.put("narration", narration);

        JSONObject fundAccount = new JSONObject();
        fundAccount.put("account_type", "bank_account");
        // ... bank details from customer profile
        payoutRequest.put("fund_account", fundAccount);

        Payout payout = razorpay.payouts.create(payoutRequest);
        return payout.get("id");
        */

        // Mock: Generate a fake payout ID
        String mockPayoutId = "pout_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        log.info("Mock payout created: {}", mockPayoutId);
        return mockPayoutId;
    }

    /**
     * Fetch payout status (called from webhook handler).
     */
    public String getPayoutStatus(String payoutId) {
        // Mock: always return PROCESSED
        return "PROCESSED";
    }
}
