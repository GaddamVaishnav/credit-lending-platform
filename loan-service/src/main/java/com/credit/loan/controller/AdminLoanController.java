package com.credit.loan.controller;

import com.credit.loan.dto.LoanApplicationDto;
import com.credit.loan.entity.ApplicationStatus;
import com.credit.loan.entity.LoanApplication;
import com.credit.loan.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/loans")
@RequiredArgsConstructor
@Slf4j
public class AdminLoanController {

    private final LoanApplicationRepository loanRepository;

    // ── GET ALL loans ─────────────────────────────────────────
    @GetMapping("/all")
    public ResponseEntity<List<LoanApplicationDto>> getAllLoans() {
        return ResponseEntity.ok(loanRepository.findAll()
                .stream().map(this::toDto).toList());
    }

    // ── GET admin stats ───────────────────────────────────────
    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        List<LoanApplication> all = loanRepository.findAll();
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalLoans",    all.size());
        stats.put("pendingLoans",  all.stream().filter(l ->
                List.of(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)
                    .contains(l.getStatus())).count());
        stats.put("approvedLoans", all.stream().filter(l ->
                List.of(ApplicationStatus.APPROVED, ApplicationStatus.AGREEMENT_PENDING,
                        ApplicationStatus.AGREEMENT_SIGNED, ApplicationStatus.DISBURSED)
                    .contains(l.getStatus())).count());
        stats.put("rejectedLoans", all.stream().filter(l ->
                l.getStatus() == ApplicationStatus.REJECTED).count());
        stats.put("totalDisbursed", all.stream()
                .filter(l -> l.getStatus() == ApplicationStatus.DISBURSED)
                .mapToDouble(l -> l.getApprovedAmount() != null ? l.getApprovedAmount() : 0)
                .sum());
        return ResponseEntity.ok(stats);
    }

    // ── APPROVE loan ──────────────────────────────────────────
    @PostMapping("/admin/{id}/approve")
    @Transactional
    public ResponseEntity<Map<String, Object>> approveLoan(@PathVariable Long id) {
        LoanApplication loan = findById(id);
        loan.setStatus(ApplicationStatus.APPROVED);
        loan.setApprovedAmount(loan.getRequestedAmount());
        if (loan.getInterestRate() == null) loan.setInterestRate(11.0);
        if (loan.getEmiAmount() == null)
            loan.setEmiAmount(calcEmi(loan.getRequestedAmount(),
                    loan.getInterestRate(), loan.getTenureMonths()));
        loanRepository.save(loan);
        log.info("Admin approved loan #{}", id);
        return ResponseEntity.ok(Map.of(
                "message", "Loan #" + id + " approved",
                "loanId",  id,
                "status",  "APPROVED",
                "approvedAmount", loan.getApprovedAmount(),
                "emiAmount", loan.getEmiAmount()
        ));
    }

    // ── REJECT loan ───────────────────────────────────────────
    @PostMapping("/admin/{id}/reject")
    @Transactional
    public ResponseEntity<Map<String, String>> rejectLoan(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        LoanApplication loan = findById(id);
        loan.setStatus(ApplicationStatus.REJECTED);
        loan.setRejectionReason(body.getOrDefault("reason", "Rejected by admin"));
        loanRepository.save(loan);
        log.info("Admin rejected loan #{}", id);
        return ResponseEntity.ok(Map.of(
                "message", "Loan #" + id + " rejected",
                "reason",  body.getOrDefault("reason", "")
        ));
    }

    // ── AGREEMENT PENDING ─────────────────────────────────────
    @PostMapping("/admin/{id}/agreement-pending")
    @Transactional
    public ResponseEntity<Map<String, String>> setAgreementPending(@PathVariable Long id) {
        LoanApplication loan = findById(id);
        loan.setStatus(ApplicationStatus.AGREEMENT_PENDING);
        loanRepository.save(loan);
        return ResponseEntity.ok(Map.of("message", "Set to AGREEMENT_PENDING"));
    }

    private LoanApplication findById(Long id) {
        return loanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Loan not found: " + id));
    }

    private double calcEmi(double principal, double rate, int months) {
        double r = rate / 12 / 100;
        return (principal * r * Math.pow(1+r, months)) / (Math.pow(1+r, months) - 1);
    }

    private LoanApplicationDto toDto(LoanApplication l) {
        return LoanApplicationDto.builder()
                .id(l.getId())
                .customerId(l.getCustomerId())
                .loanType(l.getLoanType())
                .requestedAmount(l.getRequestedAmount())
                .approvedAmount(l.getApprovedAmount())
                .tenureMonths(l.getTenureMonths())
                .interestRate(l.getInterestRate())
                .emiAmount(l.getEmiAmount())
                .processingFee(l.getProcessingFee())
                .status(l.getStatus())
                .rejectionReason(l.getRejectionReason())
                .appliedAt(l.getAppliedAt())
                .approvedAt(l.getApprovedAt())
                .build();
    }
}
