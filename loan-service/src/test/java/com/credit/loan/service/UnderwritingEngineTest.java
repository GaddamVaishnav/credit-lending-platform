package com.credit.loan.service;

import com.credit.loan.entity.ApplicationStatus;
import com.credit.loan.entity.LoanApplication;
import com.credit.loan.entity.LoanType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("UnderwritingEngine Unit Tests")
class UnderwritingEngineTest {

    // No Spring context needed — pure unit test
    private UnderwritingEngine underwritingEngine;

    @BeforeEach
    void setUp() {
        underwritingEngine = new UnderwritingEngine();
        // underwritingExecutor is null → engine falls back to ForkJoinPool automatically
    }

    private LoanApplication buildApp(int creditScore, double income,
                                      double amount, double existingEmi) {
        double monthlyRate = LoanType.PERSONAL_LOAN.getBaseRate() / 12 / 100;
        int    tenure      = 24;
        double factor      = Math.pow(1 + monthlyRate, tenure);
        double emi         = (amount * monthlyRate * factor) / (factor - 1);

        return LoanApplication.builder()
                .loanType(LoanType.PERSONAL_LOAN)
                .requestedAmount(amount)
                .tenureMonths(tenure)
                .creditScore(creditScore)
                .monthlyIncome(income)
                .employmentType("SALARIED")
                .existingEmiObligations(existingEmi)
                .emiAmount(emi)
                .status(ApplicationStatus.UNDER_REVIEW)
                .build();
    }

    @Test
    @DisplayName("Should approve loan for excellent credit profile")
    void shouldApproveForExcellentProfile() {
        LoanApplication app = buildApp(780, 100_000, 300_000, 5_000);
        UnderwritingEngine.FinalDecision decision = underwritingEngine.evaluate(app);

        assertTrue(decision.approved(), "Should approve score 780");
        assertTrue(decision.approvedAmount() > 0);
        assertTrue(decision.interestRate() > 0);
        assertTrue(decision.emiAmount() > 0);
    }

    @Test
    @DisplayName("Should reject loan for credit score below 650")
    void shouldRejectForLowCreditScore() {
        LoanApplication app = buildApp(580, 100_000, 200_000, 0);
        UnderwritingEngine.FinalDecision decision = underwritingEngine.evaluate(app);

        assertFalse(decision.approved(), "Should reject score 580");
        assertNotNull(decision.rejectionReason());
        assertTrue(decision.rejectionReason().toLowerCase().contains("credit"));
    }

    @Test
    @DisplayName("Should reject when FOIR exceeds 50%")
    void shouldRejectForHighFoir() {
        // income=50k, existing=20k + proposed EMI ~10k → FOIR ~60%
        LoanApplication app = buildApp(720, 50_000, 300_000, 20_000);
        UnderwritingEngine.FinalDecision decision = underwritingEngine.evaluate(app);

        assertFalse(decision.approved(), "Should reject when FOIR > 50%");
        assertNotNull(decision.rejectionReason());
    }

    @Test
    @DisplayName("Better credit score should get lower interest rate")
    void betterScoreShouldGetLowerRate() {
        LoanApplication good    = buildApp(800, 100_000, 200_000, 0);
        LoanApplication average = buildApp(670, 100_000, 200_000, 0);

        UnderwritingEngine.FinalDecision goodDec    = underwritingEngine.evaluate(good);
        UnderwritingEngine.FinalDecision averageDec = underwritingEngine.evaluate(average);

        assertTrue(goodDec.approved() && averageDec.approved());
        assertTrue(goodDec.interestRate() < averageDec.interestRate(),
                "Score 800 should get lower rate than 670");
    }

    @Test
    @DisplayName("All 4 checks run in parallel — should complete under 2 seconds")
    void evaluationShouldCompleteQuickly() {
        LoanApplication app = buildApp(750, 80_000, 200_000, 5_000);

        long start    = System.currentTimeMillis();
        underwritingEngine.evaluate(app);
        long duration = System.currentTimeMillis() - start;

        assertTrue(duration < 2000,
                "Parallel underwriting should finish under 2s, took: " + duration + "ms");
    }

    @Test
    @DisplayName("Should set FOIR ratio on application after evaluation")
    void shouldSetFoirOnApplication() {
        LoanApplication app = buildApp(750, 80_000, 200_000, 5_000);
        underwritingEngine.evaluate(app);

        assertNotNull(app.getFoirRatio(), "FOIR ratio should be computed and stored");
        assertTrue(app.getFoirRatio() > 0);
    }
}
