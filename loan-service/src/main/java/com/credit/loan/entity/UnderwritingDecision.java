package com.credit.loan.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "underwriting_decisions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UnderwritingDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loan_application_id", nullable = false)
    private LoanApplication loanApplication;

    @Column(nullable = false)
    private String checkType;   // CREDIT_SCORE, FOIR, EMPLOYMENT, LTV

    @Column(nullable = false)
    private boolean passed;

    private boolean conditional;

    @Column(length = 500)
    private String reason;

    @CreationTimestamp
    private LocalDateTime evaluatedAt;
}
