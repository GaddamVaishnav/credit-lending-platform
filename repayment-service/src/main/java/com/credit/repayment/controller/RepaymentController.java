package com.credit.repayment.controller;

import com.credit.repayment.dto.ForeclosureQuote;
import com.credit.repayment.dto.PaymentRequest;
import com.credit.repayment.dto.PaymentResponse;
import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.LoanAccount;
import com.credit.repayment.service.EmiCalculationService;
import com.credit.repayment.service.RepaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RepaymentController {

    private final RepaymentService      repaymentService;
    private final EmiCalculationService emiCalculationService;

    @PostMapping("/repayments/pay")
    public ResponseEntity<PaymentResponse> makePayment(
            @RequestParam Long customerId,
            @Valid @RequestBody PaymentRequest request) {
        return ResponseEntity.ok(repaymentService.processPayment(customerId, request));
    }

    @GetMapping("/emi/{loanId}/schedule")
    public ResponseEntity<List<EmiSchedule>> getEmiSchedule(
            @PathVariable Long loanId,
            @RequestParam Long customerId) {
        return ResponseEntity.ok(repaymentService.getEmiSchedule(loanId, customerId));
    }

    @GetMapping("/repayments/{loanId}/summary")
    public ResponseEntity<LoanAccount> getLoanSummary(
            @PathVariable Long loanId,
            @RequestParam Long customerId) {
        return ResponseEntity.ok(repaymentService.getLoanAccountSummary(loanId, customerId));
    }

    @GetMapping("/repayments/{loanId}/foreclosure")
    public ResponseEntity<ForeclosureQuote> getForeclosureQuote(@PathVariable Long loanId) {
        return ResponseEntity.ok(
                emiCalculationService.calculateForeclosure(loanId, LocalDate.now()));
    }

    @GetMapping("/repayments/{loanId}/statement")
    public ResponseEntity<Map<String, Object>> getLoanStatement(
            @PathVariable Long loanId,
            @RequestParam Long customerId) {
        LoanAccount account        = repaymentService.getLoanAccountSummary(loanId, customerId);
        List<EmiSchedule> schedule = repaymentService.getEmiSchedule(loanId, customerId);

        long paidCount    = schedule.stream().filter(e -> e.getStatus() == EmiSchedule.EmiStatus.PAID).count();
        long overdueCount = schedule.stream().filter(e -> e.getStatus() == EmiSchedule.EmiStatus.OVERDUE).count();

        Map<String, Object> statement = new HashMap<>();
        statement.put("loanId",               loanId);
        statement.put("principalAmount",      account.getPrincipalAmount());
        statement.put("emiAmount",            account.getEmiAmount());
        statement.put("tenureMonths",         account.getTenureMonths());
        statement.put("totalAmountPaid",      account.getTotalAmountPaid());
        statement.put("outstandingPrincipal", account.getOutstandingPrincipal());
        statement.put("emisPaid",             paidCount);
        statement.put("emisRemaining",        account.getEmisRemaining());
        statement.put("overdueCount",         overdueCount);
        statement.put("status",               account.getStatus());
        statement.put("schedule",             schedule);
        return ResponseEntity.ok(statement);
    }
}
