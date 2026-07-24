package com.credit.loan.controller;

import com.credit.loan.dto.LoanApplicationDto;
import com.credit.loan.entity.ApplicationStatus;
import com.credit.loan.entity.LoanApplication;
import com.credit.loan.repository.LoanApplicationRepository;
import com.credit.loan.service.LoanApplicationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Slf4j
public class AdminLoanController {

    private final LoanApplicationRepository loanRepository;
    private final LoanApplicationService    loanService;

    // GET all loans (admin view)
    @GetMapping("/all")
    public ResponseEntity<List<LoanApplicationDto>> getAllLoans() {
        List<LoanApplicationDto> loans = loanRepository.findAll()
                .stream().map(this::toDto).toList();
        return ResponseEntity.ok(loans);
    }

    // Admin approve loan
    @PostMapping("/admin/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> adminApproveLoan(@PathVariable Long id) {
        LoanApplication loan = loanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        loan.setStatus(ApplicationStatus.APPROVED);
        loan.setApprovedAmount(loan.getRequestedAmount());
        if (loan.getInterestRate() == null) loan.setInterestRate(11.0);
        if (loan.getEmiAmount() == null) {
            double r   = loan.getInterestRate() / 12 / 100;
            double n   = loan.getTenureMonths();
            double emi = (loan.getRequestedAmount() * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
            loan.setEmiAmount(emi);
        }
        loanRepository.save(loan);
        log.info("Admin approved loan: {}", id);
        return ResponseEntity.ok(Map.of(
                "message",        "Loan approved successfully",
                "loanId",         id,
                "status",         "APPROVED",
                "approvedAmount", loan.getApprovedAmount()
        ));
    }

    // Admin reject loan
    @PostMapping("/admin/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, String>> adminRejectLoan(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        LoanApplication loan = loanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));

        loan.setStatus(ApplicationStatus.REJECTED);
        loan.setRejectionReason(body.getOrDefault("reason", "Rejected by admin"));
        loanRepository.save(loan);
        log.info("Admin rejected loan: {} — {}", id, body.get("reason"));
        return ResponseEntity.ok(Map.of(
                "message", "Loan rejected",
                "reason",  body.getOrDefault("reason", "")
        ));
    }

    // Set to AGREEMENT_PENDING
    @PostMapping("/admin/{id}/agreement-pending")
    @Transactional
    public ResponseEntity<Map<String, String>> setAgreementPending(@PathVariable Long id) {
        LoanApplication loan = loanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));
        loan.setStatus(ApplicationStatus.AGREEMENT_PENDING);
        loanRepository.save(loan);
        return ResponseEntity.ok(Map.of("message", "Status set to AGREEMENT_PENDING"));
    }

    private LoanApplicationDto toDto(LoanApplication loan) {
        return LoanApplicationDto.builder()
                .id(loan.getId())
                .customerId(loan.getCustomerId())
                .loanType(loan.getLoanType())
                .requestedAmount(loan.getRequestedAmount())
                .approvedAmount(loan.getApprovedAmount())
                .tenureMonths(loan.getTenureMonths())
                .interestRate(loan.getInterestRate())
                .emiAmount(loan.getEmiAmount())
                .processingFee(loan.getProcessingFee())
                .status(loan.getStatus())
                .rejectionReason(loan.getRejectionReason())
                .appliedAt(loan.getAppliedAt())
                .approvedAt(loan.getApprovedAt())
                .build();
    }
}
