-- V1: Loan service schema

CREATE TABLE IF NOT EXISTS loan_applications (
    id                        BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id               BIGINT NOT NULL,
    loan_type                 ENUM('PERSONAL_LOAN','HOME_LOAN','VEHICLE_LOAN',
                                   'EDUCATION_LOAN','BUSINESS_LOAN') NOT NULL,
    requested_amount          DECIMAL(15,2) NOT NULL,
    approved_amount           DECIMAL(15,2),
    tenure_months             INT NOT NULL,
    interest_rate             DECIMAL(5,2),
    emi_amount                DECIMAL(10,2),
    processing_fee            DECIMAL(10,2),
    credit_score              INT,
    monthly_income            DECIMAL(15,2),
    employment_type           VARCHAR(50),
    existing_emi_obligations  DECIMAL(10,2) DEFAULT 0,
    foir_ratio                DECIMAL(5,2),
    status                    ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED',
                                   'REJECTED','AGREEMENT_PENDING','AGREEMENT_SIGNED',
                                   'DISBURSED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
    rejection_reason          TEXT,
    underwriter_notes         TEXT,
    loan_agreement_s3_key     VARCHAR(500),
    agreement_signed_at       DATETIME(6),
    applied_at                DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at                DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    approved_at               DATETIME(6),
    disbursed_at              DATETIME(6),
    INDEX idx_customer_id (customer_id),
    INDEX idx_status      (status),
    INDEX idx_applied_at  (applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS underwriting_decisions (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_application_id   BIGINT NOT NULL,
    check_type            VARCHAR(50) NOT NULL,
    passed                TINYINT(1)  NOT NULL DEFAULT 0,
    conditional           TINYINT(1)  NOT NULL DEFAULT 0,
    reason                VARCHAR(500),
    evaluated_at          DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    FOREIGN KEY (loan_application_id) REFERENCES loan_applications(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
