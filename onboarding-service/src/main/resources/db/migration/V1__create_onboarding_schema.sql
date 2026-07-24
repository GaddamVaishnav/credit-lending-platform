-- V1: Initial schema for onboarding service
-- Flyway manages all schema changes - never modify existing migrations

CREATE TABLE IF NOT EXISTS customers (
    id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name            VARCHAR(100) NOT NULL,
    email                VARCHAR(150) NOT NULL UNIQUE,
    mobile               VARCHAR(15)  NOT NULL UNIQUE,
    password_hash        VARCHAR(255) NOT NULL,
    status               ENUM('REGISTERED','KYC_PENDING','DOCS_PENDING','KYC_VERIFIED',
                              'SCORE_FETCHING','ELIGIBLE','REJECTED','SUSPENDED') NOT NULL DEFAULT 'REGISTERED',
    pan_number           VARCHAR(255),   -- AES-256 encrypted
    aadhaar_number       VARCHAR(255),   -- AES-256 encrypted
    credit_score         INT,
    credit_bureau        VARCHAR(50),
    monthly_income       DECIMAL(15,2),
    employment_type      VARCHAR(50),
    employer_name        VARCHAR(150),
    created_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at           DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    eligible_at          DATETIME(6),
    INDEX idx_email  (email),
    INDEX idx_mobile (mobile),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS kyc_details (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id           BIGINT NOT NULL,
    aadhaar_number        VARCHAR(255) NOT NULL,
    pan_number            VARCHAR(255) NOT NULL,
    kyc_provider_ref_id   VARCHAR(100),
    verification_status   ENUM('SUBMITTED','UNDER_REVIEW','VERIFIED','REJECTED') DEFAULT 'SUBMITTED',
    rejection_reason      TEXT,
    submitted_at          DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    verified_at           DATETIME(6),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE KEY uq_customer_kyc (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_documents (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id      BIGINT NOT NULL,
    doc_type         ENUM('SALARY_SLIP','BANK_STATEMENT','ID_PROOF','ADDRESS_PROOF',
                         'INCOME_TAX_RETURN','FORM_16','BUSINESS_PROOF') NOT NULL,
    s3_key           VARCHAR(500) NOT NULL,
    file_name        VARCHAR(255),
    content_type     VARCHAR(100),
    file_size        BIGINT,
    upload_status    ENUM('UPLOADED','UNDER_REVIEW','VERIFIED','REJECTED') DEFAULT 'UPLOADED',
    rejection_reason TEXT,
    uploaded_at      DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    verified_at      DATETIME(6),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_docs (customer_id),
    INDEX idx_doc_status    (upload_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customer_audit_log (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id  BIGINT NOT NULL,
    old_status   VARCHAR(50),
    new_status   VARCHAR(50),
    changed_by   VARCHAR(100),
    change_reason TEXT,
    changed_at   DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_audit_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
