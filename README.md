# Credit Lending & Loan Management Platform

A full-stack microservices platform built with Spring Boot 3 and Angular 17.

## Architecture

```
6 Spring Boot Microservices + Angular 17 Frontend
├── onboarding-service  (port 8081) - Registration, OTP, KYC, Credit Score
├── loan-service        (port 8082) - Loan Application, Underwriting Engine
├── disbursement-service(port 8083) - Razorpay Integration, Kafka Consumer
├── repayment-service   (port 8084) - EMI Engine, Spring Batch, Payments
├── notification-service(port 8085) - Kafka Consumer, Email, SMS
├── api-gateway         (port 8080) - JWT Filter, Routing
└── frontend            (port 4200) - Angular 17 SPA
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 17, Spring Boot 3.2, Spring Security, Spring Batch |
| Messaging | Apache Kafka |
| Databases | MySQL (4 schemas), Redis, MongoDB |
| Frontend | Angular 17, TypeScript, RxJS |
| DevOps | Docker, Eureka, JWT, Maven |

## Quick Start

### 1. Start Docker Infrastructure
```bash
docker-compose up -d
```

### 2. Fix MySQL Permissions (run after every restart)
```bash
docker exec credit-mysql mysql -u root -proot -e "GRANT ALL PRIVILEGES ON *.* TO 'credit_user'@'%' WITH GRANT OPTION; FLUSH PRIVILEGES;"
```

### 3. Start All Services
```bash
# Open 6 terminals, one for each:
cd onboarding-service   && mvn spring-boot:run
cd loan-service         && mvn spring-boot:run
cd disbursement-service && mvn spring-boot:run
cd repayment-service    && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
cd api-gateway          && mvn spring-boot:run
```

### 4. Start Frontend
```bash
cd frontend
npm install
npx ng serve
```

Open: http://localhost:4200

## API Endpoints

### Onboarding (8081)
- POST /api/v1/auth/register
- POST /api/v1/auth/verify-otp
- POST /api/v1/auth/login
- POST /api/v1/kyc/submit
- POST /api/v1/credit-score/fetch
- GET  /api/v1/customers/{id}/profile

### Loans (8082)
- POST /api/v1/loans/apply?customerId=1
- GET  /api/v1/loans/my-applications?customerId=1
- POST /api/v1/loans/{id}/sign-agreement?customerId=1
- GET  /api/v1/loans/emi-calculator

### Repayments (8084)
- GET  /api/v1/emi/{loanId}/schedule?customerId=1
- POST /api/v1/repayments/pay?customerId=1
- GET  /api/v1/repayments/{loanId}/foreclosure

## Monitoring
- Eureka Dashboard: http://localhost:8761
- Service Health: http://localhost:{port}/actuator/health

## Default Credentials
- MySQL: credit_user / credit_pass
- Redis: redispass
- Test User: vaishnav@test.com / Test@1234
