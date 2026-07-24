-- Run this once to create all service databases
-- Used by docker-compose on first start

CREATE DATABASE IF NOT EXISTS credit_onboarding_db;
CREATE DATABASE IF NOT EXISTS credit_loan_db;
CREATE DATABASE IF NOT EXISTS credit_disbursement_db;
CREATE DATABASE IF NOT EXISTS credit_repayment_db;

-- Create application user with access to all DBs
CREATE USER IF NOT EXISTS 'credit_user'@'%' IDENTIFIED BY 'credit_pass';

GRANT ALL PRIVILEGES ON credit_onboarding_db.* TO 'credit_user'@'%';
GRANT ALL PRIVILEGES ON credit_loan_db.*        TO 'credit_user'@'%';
GRANT ALL PRIVILEGES ON credit_disbursement_db.* TO 'credit_user'@'%';
GRANT ALL PRIVILEGES ON credit_repayment_db.*   TO 'credit_user'@'%';

FLUSH PRIVILEGES;
