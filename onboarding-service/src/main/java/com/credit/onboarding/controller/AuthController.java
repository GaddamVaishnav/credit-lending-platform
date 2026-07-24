package com.credit.onboarding.controller;

import com.credit.onboarding.dto.AuthResponse;
import com.credit.onboarding.dto.RegisterRequest;
import com.credit.onboarding.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final CustomerService customerService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        String message = customerService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("message", message));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponse> verifyOtp(@RequestBody Map<String, String> body) {
        String mobile = body.get("mobile");
        String otp    = body.get("otp");
        return ResponseEntity.ok(customerService.verifyOtpAndLogin(mobile, otp));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
                customerService.login(body.get("email"), body.get("password")));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<Map<String, String>> resendOtp(@RequestBody Map<String, String> body) {
        customerService.resendOtp(body.get("mobile"));
        return ResponseEntity.ok(Map.of("message", "OTP resent successfully"));
    }

    // Dev-only endpoint to fix stuck customer status
    @PostMapping("/dev/fix-status/{customerId}")
    public ResponseEntity<Map<String, String>> fixStatus(@PathVariable Long customerId) {
        customerService.forceSetKycVerified(customerId);
        return ResponseEntity.ok(Map.of("message", "Status updated to KYC_VERIFIED"));
    }

}
