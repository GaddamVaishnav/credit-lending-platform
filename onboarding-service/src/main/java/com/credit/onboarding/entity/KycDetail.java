package com.credit.onboarding.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "kyc_details")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class KycDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false)
    private String aadhaarNumber;   // encrypted

    @Column(nullable = false)
    private String panNumber;       // encrypted

    private String kycProviderRefId;

    @Enumerated(EnumType.STRING)
    private KycStatus verificationStatus;

    private String rejectionReason;

    @CreationTimestamp
    private LocalDateTime submittedAt;

    private LocalDateTime verifiedAt;

    public enum KycStatus {
        SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED
    }
}
