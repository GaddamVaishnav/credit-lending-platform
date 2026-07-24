package com.credit.onboarding.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "customer_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CustomerDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType docType;

    @Column(nullable = false)
    private String s3Key;

    private String fileName;
    private String contentType;
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    private DocumentStatus uploadStatus;

    private String rejectionReason;

    @CreationTimestamp
    private LocalDateTime uploadedAt;

    private LocalDateTime verifiedAt;

    public enum DocumentType {
        SALARY_SLIP, BANK_STATEMENT, ID_PROOF, ADDRESS_PROOF,
        INCOME_TAX_RETURN, FORM_16, BUSINESS_PROOF
    }

    public enum DocumentStatus {
        UPLOADED, UNDER_REVIEW, VERIFIED, REJECTED
    }
}
