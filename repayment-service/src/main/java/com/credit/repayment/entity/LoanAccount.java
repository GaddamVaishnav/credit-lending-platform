package com.credit.repayment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "loan_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long loanApplicationId;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private Double principalAmount;

    @Column(nullable = false)
    private Double annualInterestRate;

    @Column(nullable = false)
    private Integer tenureMonths;

    @Column(nullable = false)
    private Double emiAmount;

    private Double outstandingPrincipal;
    private Double totalAmountPaid;
    private Integer emilsPaid;
    private Integer emisRemaining;

    @Column(nullable = false)
    private LocalDate firstEmiDate;

    private LocalDate nextEmiDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanAccountStatus status;

    private LocalDate closedAt;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum LoanAccountStatus {
        ACTIVE, CLOSED, DEFAULTED, NPA, FORECLOSED, WRITTEN_OFF
    }
}
