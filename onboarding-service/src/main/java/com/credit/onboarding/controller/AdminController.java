package com.credit.onboarding.controller;

import com.credit.onboarding.dto.CustomerProfileDto;
import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import com.credit.onboarding.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final CustomerRepository customerRepository;

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerProfileDto>> getAllCustomers() {
        return ResponseEntity.ok(customerRepository.findAll()
                .stream().map(this::toDto).toList());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<Customer> all = customerRepository.findAll();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCustomers",    all.size());
        stats.put("eligibleCustomers", all.stream()
                .filter(c -> c.getStatus() == CustomerStatus.ELIGIBLE).count());
        stats.put("pendingKyc", all.stream()
                .filter(c -> c.getStatus() == CustomerStatus.KYC_PENDING
                          || c.getStatus() == CustomerStatus.DOCS_PENDING).count());
        stats.put("avgCreditScore", all.stream()
                .filter(c -> c.getCreditScore() != null)
                .mapToInt(Customer::getCreditScore)
                .average().orElse(0));
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/customers/{id}/make-eligible")
    @Transactional
    public ResponseEntity<Map<String, String>> makeEligible(@PathVariable Long id) {
        Customer c = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
        c.setStatus(CustomerStatus.ELIGIBLE);
        if (c.getCreditScore() == null) c.setCreditScore(700);
        customerRepository.save(c);
        log.info("Admin made customer #{} eligible", id);
        return ResponseEntity.ok(Map.of(
                "message", c.getFullName() + " is now ELIGIBLE",
                "customerId", String.valueOf(id)
        ));
    }

    @PostMapping("/customers/{id}/credit-score")
    @Transactional
    public ResponseEntity<Map<String, String>> updateScore(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Customer c = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
        c.setCreditScore(body.get("score"));
        customerRepository.save(c);
        return ResponseEntity.ok(Map.of(
                "message", "Credit score updated to " + body.get("score")
        ));
    }

    @PostMapping("/customers/{id}/kyc-verify")
    @Transactional
    public ResponseEntity<Map<String, String>> kycVerify(@PathVariable Long id) {
        Customer c = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
        c.setStatus(CustomerStatus.KYC_VERIFIED);
        customerRepository.save(c);
        return ResponseEntity.ok(Map.of("message", "Customer KYC verified"));
    }

    private CustomerProfileDto toDto(Customer c) {
        return CustomerProfileDto.builder()
                .id(c.getId())
                .fullName(c.getFullName())
                .email(c.getEmail())
                .mobile(c.getMobile())
                .status(c.getStatus())
                .creditScore(c.getCreditScore())
                .monthlyIncome(c.getMonthlyIncome())
                .employmentType(c.getEmploymentType())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
