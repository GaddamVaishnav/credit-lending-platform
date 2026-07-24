package com.credit.loan.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "loan_applications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LoanApplication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long customerId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LoanType loanType;

    @Column(nullable = false)
    private Double requestedAmount;

    private Double approvedAmount;

    @Column(nullable = false)
    private Integer tenureMonths;

    private Double interestRate;
    private Double emiAmount;
    private Double processingFee;

    // Customer snapshot at time of application
    private Integer creditScore;
    private Double monthlyIncome;
    private String employmentType;
    private Double existingEmiObligations;
    private Double foirRatio;   // Fixed Obligations to Income Ratio

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ApplicationStatus status;

    private String rejectionReason;
    private String underwriterNotes;

    private String loanAgreementS3Key;
    private LocalDateTime agreementSignedAt;

    @OneToMany(mappedBy = "loanApplication", cascade = CascadeType.ALL)
    private List<UnderwritingDecision> underwritingDecisions;

    @CreationTimestamp
    private LocalDateTime appliedAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    private LocalDateTime approvedAt;
    private LocalDateTime disbursedAt;
}
