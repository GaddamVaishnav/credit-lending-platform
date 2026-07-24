package com.credit.onboarding.controller;

import com.credit.onboarding.dto.CustomerProfileDto;
import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import com.credit.onboarding.repository.CustomerRepository;
import com.credit.onboarding.service.CustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final CustomerRepository customerRepository;
    private final CustomerService    customerService;

    // Get all customers
    @GetMapping("/customers")
    public ResponseEntity<List<CustomerProfileDto>> getAllCustomers() {
        List<CustomerProfileDto> customers = customerRepository.findAll()
                .stream().map(this::toDto).toList();
        return ResponseEntity.ok(customers);
    }

    // Make customer eligible
    @PostMapping("/customers/{id}/make-eligible")
    @Transactional
    public ResponseEntity<Map<String, String>> makeEligible(@PathVariable Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
        customer.setStatus(CustomerStatus.ELIGIBLE);
        if (customer.getCreditScore() == null) customer.setCreditScore(700);
        customerRepository.save(customer);
        log.info("Admin made customer {} eligible", id);
        return ResponseEntity.ok(Map.of(
                "message", "Customer is now ELIGIBLE",
                "customerId", String.valueOf(id)
        ));
    }

    // Update credit score
    @PostMapping("/customers/{id}/credit-score")
    @Transactional
    public ResponseEntity<Map<String, String>> updateCreditScore(
            @PathVariable Long id,
            @RequestBody Map<String, Integer> body) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + id));
        customer.setCreditScore(body.get("score"));
        customerRepository.save(customer);
        return ResponseEntity.ok(Map.of("message", "Credit score updated to " + body.get("score")));
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
