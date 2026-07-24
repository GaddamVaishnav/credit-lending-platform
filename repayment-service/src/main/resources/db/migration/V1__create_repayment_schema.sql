-- V1: Repayment service schema

CREATE TABLE IF NOT EXISTS loan_accounts (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_application_id   BIGINT NOT NULL UNIQUE,
    customer_id           BIGINT NOT NULL,
    principal_amount      DECIMAL(15,2) NOT NULL,
    annual_interest_rate  DECIMAL(5,2)  NOT NULL,
    tenure_months         INT           NOT NULL,
    emi_amount            DECIMAL(10,2) NOT NULL,
    outstanding_principal DECIMAL(15,2),
    total_amount_paid     DECIMAL(15,2) DEFAULT 0,
    emils_paid            INT DEFAULT 0,
    emis_remaining        INT,
    first_emi_date        DATE NOT NULL,
    next_emi_date         DATE,
    status                ENUM('ACTIVE','CLOSED','DEFAULTED','NPA','FORECLOSED','WRITTEN_OFF')
                          NOT NULL DEFAULT 'ACTIVE',
    closed_at             DATE,
    created_at            DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    updated_at            DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_customer    (customer_id),
    INDEX idx_status      (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS emi_schedules (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    loan_id                  BIGINT NOT NULL,
    customer_id              BIGINT NOT NULL,
    installment_number       INT    NOT NULL,
    due_date                 DATE   NOT NULL,
    emi_amount               DECIMAL(10,2) NOT NULL,
    principal_component      DECIMAL(10,2) NOT NULL,
    interest_component       DECIMAL(10,2) NOT NULL,
    outstanding_principal    DECIMAL(15,2) NOT NULL,
    penalty_amount           DECIMAL(10,2) DEFAULT 0,
    paid_amount              DECIMAL(10,2),
    status                   ENUM('UPCOMING','DUE','PAID','PARTIALLY_PAID',
                                  'OVERDUE','NPA','WAIVED') NOT NULL DEFAULT 'UPCOMING',
    paid_date                DATE,
    payment_transaction_id   VARCHAR(100),
    payment_mode             VARCHAR(50),
    days_overdue             INT DEFAULT 0,
    created_at               DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_loan_id        (loan_id),
    INDEX idx_due_date       (due_date),
    INDEX idx_status         (status),
    INDEX idx_customer_id    (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
