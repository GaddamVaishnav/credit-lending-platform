package com.credit.repayment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "emi_schedules", indexes = {
        @Index(name = "idx_loan_id", columnList = "loanId"),
        @Index(name = "idx_due_date", columnList = "dueDate"),
        @Index(name = "idx_status", columnList = "status")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EmiSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long loanId;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private Integer installmentNumber;

    @Column(nullable = false)
    private LocalDate dueDate;

    @Column(nullable = false, precision = 10)
    private Double emiAmount;

    @Column(nullable = false, precision = 10)
    private Double principalComponent;

    @Column(nullable = false, precision = 10)
    private Double interestComponent;

    @Column(nullable = false, precision = 10)
    private Double outstandingPrincipal;

    private Double penaltyAmount;
    private Double paidAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmiStatus status;

    private LocalDate paidDate;
    private String paymentTransactionId;
    private String paymentMode; // UPI, NEFT, AUTO_DEBIT

    @CreationTimestamp
    private LocalDateTime createdAt;

    private Integer daysOverdue;

    public enum EmiStatus {
        UPCOMING, DUE, PAID, PARTIALLY_PAID, OVERDUE, NPA, WAIVED
    }
}
