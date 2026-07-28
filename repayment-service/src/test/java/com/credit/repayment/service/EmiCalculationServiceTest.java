package com.credit.repayment.service;

import com.credit.repayment.dto.ForeclosureQuote;
import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import com.credit.repayment.kafka.RepaymentEventPublisher;
import com.credit.repayment.repository.EmiScheduleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmiCalculationService Unit Tests")
class EmiCalculationServiceTest {

    @Mock private EmiScheduleRepository emiRepository;
    @Mock private RepaymentEventPublisher eventPublisher;

    @InjectMocks
    private EmiCalculationService emiCalculationService;

    @Test
    @DisplayName("EMI formula should produce correct value for standard loan")
    void shouldCalculateCorrectEmi() {
        // Principal: 100,000 | Rate: 10% p.a. | Tenure: 12 months
        double monthlyRate = 10.0 / 12 / 100;
        double emi = emiCalculationService.calculateEmi(100_000, monthlyRate, 12);

        // Expected EMI ~8791.59
        assertEquals(8791.59, emi, 1.0,
                "EMI should be approximately Rs. 8,791 for 1L at 10% for 12 months");
    }

    @ParameterizedTest
    @DisplayName("EMI calculation with various loan parameters")
    @CsvSource({
        "500000, 8.5,  60, 10258.27",   // 5L home loan   @ 8.5% for 60 months
        "100000, 12.0, 24,  4707.35",   // 1L personal    @ 12%  for 24 months
        "200000, 10.5, 36,  6500.49"    // 2L vehicle loan @ 10.5% for 36 months
    })
    void shouldCalculateEmiForDifferentParameters(double principal, double rate,
                                                    int tenure, double expectedEmi) {
        double monthlyRate = rate / 12 / 100;
        double emi = emiCalculationService.calculateEmi(principal, monthlyRate, tenure);
        assertEquals(expectedEmi, emi, 10.0,
                "EMI mismatch for principal=" + principal + " rate=" + rate + " tenure=" + tenure);
    }

    @Test
    @DisplayName("generateEmiSchedule should create correct number of installments")
    void shouldGenerateCorrectNumberOfInstallments() {
        when(emiRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        List<EmiSchedule> schedule = emiCalculationService.generateEmiSchedule(
                1L, 100L, 100_000, 10.0, 12, LocalDate.now().plusDays(30));

        assertEquals(12, schedule.size(), "Should generate 12 installments");
        verify(emiRepository).saveAll(argThat(list -> ((List<?>) list).size() == 12));
    }

    @Test
    @DisplayName("Last installment should clear outstanding principal to 0")
    void lastInstallmentShouldClearOutstandingBalance() {
        when(emiRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        List<EmiSchedule> schedule = emiCalculationService.generateEmiSchedule(
                1L, 100L, 100_000, 10.0, 12, LocalDate.now().plusDays(30));

        EmiSchedule lastInstallment = schedule.get(schedule.size() - 1);
        assertEquals(0.0, lastInstallment.getOutstandingPrincipal(), 1.0,
                "Outstanding principal should be 0 after last installment");
    }

    @Test
    @DisplayName("Total principal in schedule should equal loan amount")
    void totalPrincipalShouldEqualLoanAmount() {
        when(emiRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        double principal = 100_000;
        List<EmiSchedule> schedule = emiCalculationService.generateEmiSchedule(
                1L, 100L, principal, 10.0, 12, LocalDate.now().plusDays(30));

        double totalPrincipal = schedule.stream()
                .mapToDouble(EmiSchedule::getPrincipalComponent).sum();

        assertEquals(principal, totalPrincipal, 5.0,
                "Sum of principal components should equal loan amount");
    }

    @Test
    @DisplayName("Interest component should decrease each installment (reducing balance)")
    void interestShouldDecreaseEachMonth() {
        when(emiRepository.saveAll(anyList())).thenAnswer(i -> i.getArgument(0));

        List<EmiSchedule> schedule = emiCalculationService.generateEmiSchedule(
                1L, 100L, 100_000, 10.0, 12, LocalDate.now().plusDays(30));

        for (int i = 1; i < schedule.size(); i++) {
            assertTrue(
                schedule.get(i).getInterestComponent() <
                schedule.get(i - 1).getInterestComponent(),
                "Interest component should decrease each month (reducing balance method)"
            );
        }
    }

    @Test
    @DisplayName("Foreclosure quote should calculate 2% penalty on outstanding principal")
    void shouldCalculateForeclosureWithPenalty() {
        EmiSchedule emi1 = EmiSchedule.builder()
                .loanId(1L).installmentNumber(3)
                .principalComponent(8000.0).emiAmount(8791.0)
                .status(EmiStatus.UPCOMING).build();
        EmiSchedule emi2 = EmiSchedule.builder()
                .loanId(1L).installmentNumber(4)
                .principalComponent(8067.0).emiAmount(8791.0)
                .status(EmiStatus.DUE).build();

        when(emiRepository.findByLoanIdAndStatusIn(eq(1L), anyList()))
                .thenReturn(List.of(emi1, emi2));

        ForeclosureQuote quote = emiCalculationService.calculateForeclosure(1L, LocalDate.now());

        double expectedPrincipal = 8000.0 + 8067.0;
        double expectedPenalty   = expectedPrincipal * 0.02;

        assertEquals(expectedPrincipal, quote.getOutstandingPrincipal(), 1.0);
        assertEquals(expectedPenalty, quote.getForeclosurePenalty(), 1.0);
        assertEquals(expectedPrincipal + expectedPenalty, quote.getTotalPayable(), 2.0);
        assertNotNull(quote.getValidTill(), "Foreclosure quote should have a validity date");
    }

    @Test
    @DisplayName("Penalty calculation should be 0 for future EMI due dates")
    void penaltyShouldBeZeroForFutureDates() {
        EmiSchedule emi = EmiSchedule.builder()
                .dueDate(LocalDate.now().plusDays(5))
                .emiAmount(8791.0)
                .build();

        double penalty = emiCalculationService.calculatePenalty(emi, LocalDate.now());
        assertEquals(0.0, penalty, "Penalty should be zero for a future EMI");
    }

    @Test
    @DisplayName("Penalty should accrue 0.1% per day for overdue EMI")
    void penaltyShouldAccrueForOverdueEmi() {
        EmiSchedule emi = EmiSchedule.builder()
                .dueDate(LocalDate.now().minusDays(10))
                .emiAmount(10_000.0)
                .build();

        double penalty = emiCalculationService.calculatePenalty(emi, LocalDate.now());
        double expected = 10_000.0 * 0.001 * 10; // 0.1%/day * 10 days

        assertEquals(expected, penalty, 0.01, "Penalty should be 0.1% per day");
    }
}
