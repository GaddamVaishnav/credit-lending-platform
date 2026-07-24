-- V1: Disbursement service schema

CREATE TABLE IF NOT EXISTS loan_disbursements (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_application_id      BIGINT NOT NULL UNIQUE,
    customer_id              BIGINT NOT NULL,
    disbursed_amount         DECIMAL(15,2) NOT NULL,
    processing_fee           DECIMAL(10,2) NOT NULL,
    net_amount_transferred   DECIMAL(15,2),
    status                   ENUM('INITIATED','PROCESSING','COMPLETED','FAILED','REVERSED')
                             NOT NULL DEFAULT 'INITIATED',
    payment_gateway_ref_id   VARCHAR(100),
    bank_account_number      VARCHAR(50),
    bank_ifsc_code           VARCHAR(20),
    bank_name                VARCHAR(100),
    loan_agreement_s3_key    VARCHAR(500),
    first_emi_date           DATE,
    failure_reason           TEXT,
    created_at               DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    disbursed_at             DATETIME(6),
    INDEX idx_loan_id        (loan_application_id),
    INDEX idx_customer_id    (customer_id),
    INDEX idx_status         (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
