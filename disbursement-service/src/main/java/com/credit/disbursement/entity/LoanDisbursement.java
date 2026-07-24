package com.credit.disbursement.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "loan_disbursements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanDisbursement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long loanApplicationId;

    @Column(nullable = false)
    private Long customerId;

    @Column(nullable = false)
    private Double disbursedAmount;

    @Column(nullable = false)
    private Double processingFee;

    private Double netAmountTransferred; // disbursedAmount - processingFee

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DisbursementStatus status;

    private String paymentGatewayRefId;  // Razorpay payout ID
    private String bankAccountNumber;     // masked
    private String bankIfscCode;
    private String bankName;

    private String loanAgreementS3Key;
    private LocalDate firstEmiDate;

    private String failureReason;

    @CreationTimestamp
    private LocalDateTime createdAt;

    private LocalDateTime disbursedAt;

    public enum DisbursementStatus {
        INITIATED, PROCESSING, COMPLETED, FAILED, REVERSED
    }
}
