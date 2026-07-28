package com.credit.repayment.service;

import com.credit.repayment.dto.ForeclosureQuote;
import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import com.credit.repayment.repository.EmiScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmiCalculationService {

    private static final double PENALTY_RATE_PER_DAY = 0.001; // 0.1% per day
    private static final double FORECLOSURE_PENALTY   = 0.02;  // 2%

    private final EmiScheduleRepository emiRepository;

    /**
     * Generate full EMI schedule using reducing balance (diminishing) method.
     * Called once after loan disbursement.
     */
    @Transactional
    public List<EmiSchedule> generateEmiSchedule(Long loanId, Long customerId,
                                                 double principal, double annualRate,
                                                 int tenureMonths, LocalDate firstEmiDate) {
        double monthlyRate = annualRate / 12 / 100;
        double emi = calculateEmi(principal, monthlyRate, tenureMonths);

        List<EmiSchedule> schedule = new ArrayList<>();
        double outstandingBalance = principal;

        for (int month = 1; month <= tenureMonths; month++) {
            double interestPart   = outstandingBalance * monthlyRate;
            double principalPart  = emi - interestPart;
            outstandingBalance   -= principalPart;

            // Adjust last EMI for rounding differences
            if (month == tenureMonths) {
                principalPart  += outstandingBalance;
                outstandingBalance = 0;
            }

            EmiSchedule emiRecord = EmiSchedule.builder()
                    .loanId(loanId)
                    .customerId(customerId)
                    .installmentNumber(month)
                    .dueDate(firstEmiDate.plusMonths(month - 1))
                    .emiAmount(round(emi))
                    .principalComponent(round(principalPart))
                    .interestComponent(round(interestPart))
                    .outstandingPrincipal(round(Math.max(outstandingBalance, 0)))
                    .status(EmiStatus.UPCOMING)
                    .build();

            schedule.add(emiRecord);
        }

        List<EmiSchedule> saved = emiRepository.saveAll(schedule);
        log.info("EMI schedule generated: loanId={}, installments={}, EMI={}",
                loanId, tenureMonths, round(emi));
        return saved;
    }

    /**
     * EMI formula: P × r × (1+r)^n / ((1+r)^n - 1)
     */
    public double calculateEmi(double principal, double monthlyRate, int tenureMonths) {
        if (monthlyRate == 0) return round(principal / tenureMonths);
        double factor = Math.pow(1 + monthlyRate, tenureMonths);
        double emi = (principal * monthlyRate * factor) / (factor - 1);
        return round(emi); // ensure 2‑decimal precision
    }

    /**
     * Foreclosure quote — outstanding principal + 2% penalty.
     */
    public ForeclosureQuote calculateForeclosure(Long loanId, LocalDate foreclosureDate) {
        List<EmiSchedule> pendingEmis = emiRepository
                .findByLoanIdAndStatusIn(loanId,
                        List.of(EmiStatus.UPCOMING, EmiStatus.DUE, EmiStatus.OVERDUE));

        double outstandingPrincipal = pendingEmis.stream()
                .mapToDouble(EmiSchedule::getPrincipalComponent).sum();
        double overduePenalty = pendingEmis.stream()
                .filter(e -> e.getStatus() == EmiStatus.OVERDUE)
                .mapToDouble(e -> e.getPenaltyAmount() != null ? e.getPenaltyAmount() : 0)
                .sum();
        double foreclosurePenalty = outstandingPrincipal * FORECLOSURE_PENALTY;
        double totalPayable = outstandingPrincipal + overduePenalty + foreclosurePenalty;

        return ForeclosureQuote.builder()
                .loanId(loanId)
                .outstandingPrincipal(round(outstandingPrincipal))
                .overduePenalty(round(overduePenalty))
                .foreclosurePenalty(round(foreclosurePenalty))
                .totalPayable(round(totalPayable))
                .validTill(foreclosureDate.plusDays(3))
                .build();
    }

    /**
     * Calculate and apply late payment penalty.
     */
    public double calculatePenalty(EmiSchedule emi, LocalDate today) {
        if (emi.getDueDate().isBefore(today)) {
            long daysLate = today.toEpochDay() - emi.getDueDate().toEpochDay();
            return round(emi.getEmiAmount() * PENALTY_RATE_PER_DAY * daysLate);
        }
        return 0.0;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
