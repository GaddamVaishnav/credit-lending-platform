package com.credit.loan.service;

import com.credit.loan.dto.UnderwritingResult;
import com.credit.loan.entity.LoanApplication;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * Rule-based underwriting engine.
 * Runs all 4 eligibility checks in PARALLEL using CompletableFuture.
 * Uses injected executor in production, falls back to ForkJoinPool in tests.
 * Covers "multithreading" from the R&R.
 */
@Service
@Slf4j
public class UnderwritingEngine {

    @Autowired(required = false)
    @Qualifier("underwritingExecutor")
    private Executor underwritingExecutor;

    private Executor getExecutor() {
        return underwritingExecutor != null
                ? underwritingExecutor
                : Executors.newFixedThreadPool(4);
    }

    // ---- Individual eligibility checks ----

    public CompletableFuture<UnderwritingResult> checkCreditScore(LoanApplication app) {
        return CompletableFuture.supplyAsync(() -> {
            log.info("Credit check on thread: {}", Thread.currentThread().getName());
            int score = app.getCreditScore();
            if (score >= 750) return UnderwritingResult.pass("Credit score excellent: " + score);
            if (score >= 650) return UnderwritingResult.conditional("Credit score acceptable: " + score + ". Higher rate applies.");
            return UnderwritingResult.fail("Credit score below minimum: " + score + " (minimum: 650)");
        }, getExecutor());
    }

    public CompletableFuture<UnderwritingResult> checkFoir(LoanApplication app) {
        return CompletableFuture.supplyAsync(() -> {
            log.info("FOIR check on thread: {}", Thread.currentThread().getName());
            double income            = app.getMonthlyIncome();
            double existingObligations = app.getExistingEmiObligations() != null ? app.getExistingEmiObligations() : 0.0;
            double proposedEmi       = app.getEmiAmount() != null ? app.getEmiAmount() : 0.0;
            double foir              = ((existingObligations + proposedEmi) / income) * 100;

            app.setFoirRatio(foir);

            if (foir <= 40) return UnderwritingResult.pass(String.format("FOIR excellent: %.1f%%", foir));
            if (foir <= 50) return UnderwritingResult.conditional(String.format("FOIR acceptable: %.1f%%", foir));
            return UnderwritingResult.fail(String.format("FOIR too high: %.1f%% (max: 50%%)", foir));
        }, getExecutor());
    }

    public CompletableFuture<UnderwritingResult> checkEmployment(LoanApplication app) {
        return CompletableFuture.supplyAsync(() -> {
            log.info("Employment check on thread: {}", Thread.currentThread().getName());
            String empType = app.getEmploymentType();
            if ("SALARIED".equals(empType))      return UnderwritingResult.pass("Salaried — stable income");
            if ("BUSINESS".equals(empType))      return UnderwritingResult.conditional("Business owner — docs required");
            if ("SELF_EMPLOYED".equals(empType)) return UnderwritingResult.conditional("Self-employed — income verification required");
            return UnderwritingResult.fail("Employment type not supported: " + empType);
        }, getExecutor());
    }

    public CompletableFuture<UnderwritingResult> checkLoanToValue(LoanApplication app) {
        return CompletableFuture.supplyAsync(() -> {
            log.info("LTV check on thread: {}", Thread.currentThread().getName());
            if ("HOME_LOAN".equals(app.getLoanType().name())) {
                double maxLtv = app.getRequestedAmount() * 0.80;
                if (app.getRequestedAmount() > maxLtv)
                    return UnderwritingResult.fail("Requested amount exceeds 80% LTV for home loan");
            }
            return UnderwritingResult.pass("Loan-to-value within acceptable limits");
        }, getExecutor());
    }

    /**
     * Run all 4 checks in parallel, combine results, make final decision.
     */
    public FinalDecision evaluate(LoanApplication app) {
        try {
            CompletableFuture<UnderwritingResult> creditF     = checkCreditScore(app);
            CompletableFuture<UnderwritingResult> foirF       = checkFoir(app);
            CompletableFuture<UnderwritingResult> employmentF = checkEmployment(app);
            CompletableFuture<UnderwritingResult> ltvF        = checkLoanToValue(app);

            // Wait for all parallel checks
            CompletableFuture.allOf(creditF, foirF, employmentF, ltvF).join();

            UnderwritingResult creditResult     = creditF.get();
            UnderwritingResult foirResult       = foirF.get();
            UnderwritingResult employmentResult = employmentF.get();
            UnderwritingResult ltvResult        = ltvF.get();

            // Any hard fail → reject
            if (!creditResult.isPassed() || !foirResult.isPassed()
                    || !employmentResult.isPassed() || !ltvResult.isPassed()) {
                String reason = buildRejectionReason(creditResult, foirResult, employmentResult, ltvResult);
                return FinalDecision.rejected(reason);
            }

            double rate = calculateInterestRate(app);
            double emi  = calculateEmi(app.getRequestedAmount(), rate, app.getTenureMonths());
            return FinalDecision.approved(app.getRequestedAmount(), rate, emi);

        } catch (Exception e) {
            log.error("Underwriting evaluation failed", e);
            return FinalDecision.rejected("Underwriting error: " + e.getMessage());
        }
    }

    private double calculateInterestRate(LoanApplication app) {
        double base = app.getLoanType().getBaseRate();
        int score   = app.getCreditScore();
        if (score >= 800) return base;
        if (score >= 750) return base + 0.5;
        if (score >= 700) return base + 1.0;
        return base + 2.0;
    }

    private double calculateEmi(double principal, double annualRate, int tenureMonths) {
        double monthlyRate = annualRate / 12 / 100;
        double factor      = Math.pow(1 + monthlyRate, tenureMonths);
        return (principal * monthlyRate * factor) / (factor - 1);
    }

    private String buildRejectionReason(UnderwritingResult... results) {
        StringBuilder sb = new StringBuilder();
        for (UnderwritingResult r : results) {
            if (!r.isPassed()) sb.append(r.getReason()).append("; ");
        }
        return sb.toString().trim();
    }

    // ---- Result types ----

    public record FinalDecision(boolean approved, double approvedAmount,
                                 double interestRate, double emiAmount,
                                 String rejectionReason) {
        static FinalDecision approved(double amount, double rate, double emi) {
            return new FinalDecision(true, amount, rate, emi, null);
        }
        static FinalDecision rejected(String reason) {
            return new FinalDecision(false, 0, 0, 0, reason);
        }
    }
}
