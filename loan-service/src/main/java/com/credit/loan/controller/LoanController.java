package com.credit.loan.controller;

import com.credit.loan.dto.LoanApplicationDto;
import com.credit.loan.dto.LoanApplicationRequest;
import com.credit.loan.service.LoanApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
public class LoanController {

    private final LoanApplicationService loanService;

    @PostMapping("/apply")
    public ResponseEntity<LoanApplicationDto> applyForLoan(
            @RequestParam(required = false) Long customerId,
            @Valid @RequestBody LoanApplicationRequest request) {

        // Use customerId from query param OR from request body
        Long cid = customerId != null ? customerId : request.getCustomerId();
        if (cid == null) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(loanService.applyForLoan(cid, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<LoanApplicationDto> getApplication(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "1") Long customerId) {
        return ResponseEntity.ok(loanService.getApplication(id, customerId));
    }

    @GetMapping("/my-applications")
    public ResponseEntity<List<LoanApplicationDto>> getMyApplications(
            @RequestParam(required = false, defaultValue = "1") Long customerId) {
        return ResponseEntity.ok(loanService.getCustomerApplications(customerId));
    }

    @PostMapping("/{id}/sign-agreement")
    public ResponseEntity<LoanApplicationDto> signAgreement(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "1") Long customerId) {
        return ResponseEntity.ok(loanService.signAgreement(id, customerId));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<Map<String, String>> cancelApplication(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "1") Long customerId) {
        loanService.cancelApplication(id, customerId);
        return ResponseEntity.ok(Map.of("message", "Application cancelled successfully"));
    }

    @GetMapping("/emi-calculator")
    public ResponseEntity<Map<String, Object>> calculateEmi(
            @RequestParam Double principal,
            @RequestParam Double annualRate,
            @RequestParam Integer tenureMonths) {
        double monthlyRate   = annualRate / 12 / 100;
        double emi           = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths))
                             / (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        double totalPayable  = emi * tenureMonths;
        double totalInterest = totalPayable - principal;
        return ResponseEntity.ok(Map.of(
                "monthlyEmi",    Math.round(emi * 100.0) / 100.0,
                "totalPayable",  Math.round(totalPayable * 100.0) / 100.0,
                "totalInterest", Math.round(totalInterest * 100.0) / 100.0,
                "principal",     principal
        ));
    }
}
