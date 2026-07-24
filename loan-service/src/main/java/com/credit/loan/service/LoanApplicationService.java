package com.credit.loan.service;

import com.credit.loan.dto.*;
import com.credit.loan.entity.*;
import com.credit.loan.kafka.LoanEventPublisher;
import com.credit.loan.repository.LoanApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class LoanApplicationService {

    private final LoanApplicationRepository loanRepository;
    private final UnderwritingEngine         underwritingEngine;
    private final LoanEventPublisher         eventPublisher;

    @Transactional
    public LoanApplicationDto applyForLoan(Long customerId, LoanApplicationRequest request) {
        validateLoanRequest(request);

        // Check no active application exists
        boolean hasActive = loanRepository.existsByCustomerIdAndStatusNotIn(
                customerId, List.of(ApplicationStatus.REJECTED,
                        ApplicationStatus.CANCELLED, ApplicationStatus.DISBURSED));
        if (hasActive) throw new RuntimeException("You already have an active loan application");

        LoanApplication application = LoanApplication.builder()
                .customerId(customerId)
                .loanType(request.getLoanType())
                .requestedAmount(request.getRequestedAmount())
                .tenureMonths(request.getTenureMonths())
                .creditScore(request.getCreditScore())
                .monthlyIncome(request.getMonthlyIncome())
                .employmentType(request.getEmploymentType())
                .existingEmiObligations(request.getExistingEmiObligations())
                .status(ApplicationStatus.SUBMITTED)
                .build();

        loanRepository.save(application);
        log.info("Loan application submitted: {}", application.getId());

        // Trigger underwriting asynchronously
        processUnderwriting(application);

        eventPublisher.publishLoanSubmitted(application);
        return mapToDto(application);
    }

    @Transactional
    public void processUnderwriting(LoanApplication application) {
        application.setStatus(ApplicationStatus.UNDER_REVIEW);
        loanRepository.save(application);

        // All checks run in parallel (see UnderwritingEngine)
        UnderwritingEngine.FinalDecision decision = underwritingEngine.evaluate(application);

        if (decision.approved()) {
            application.setApprovedAmount(decision.approvedAmount());
            application.setInterestRate(decision.interestRate());
            application.setEmiAmount(decision.emiAmount());
            application.setProcessingFee(decision.approvedAmount() * 0.01); // 1% processing fee
            application.setStatus(ApplicationStatus.APPROVED);
            application.setApprovedAt(LocalDateTime.now());
            loanRepository.save(application);

            eventPublisher.publishLoanApproved(application);
            log.info("Loan approved: {} | Amount: {} | Rate: {}% | EMI: {}",
                    application.getId(), decision.approvedAmount(),
                    decision.interestRate(), decision.emiAmount());
        } else {
            application.setStatus(ApplicationStatus.REJECTED);
            application.setRejectionReason(decision.rejectionReason());
            loanRepository.save(application);

            eventPublisher.publishLoanRejected(application);
            log.info("Loan rejected: {} | Reason: {}", application.getId(), decision.rejectionReason());
        }
    }

    @Transactional
    public LoanApplicationDto signAgreement(Long applicationId, Long customerId) {
        LoanApplication app = findByIdAndCustomer(applicationId, customerId);
        if (app.getStatus() != ApplicationStatus.AGREEMENT_PENDING) {
            throw new RuntimeException("Application is not in AGREEMENT_PENDING state");
        }
        app.setStatus(ApplicationStatus.AGREEMENT_SIGNED);
        app.setAgreementSignedAt(LocalDateTime.now());
        loanRepository.save(app);

        eventPublisher.publishAgreementSigned(app);
        log.info("Loan agreement signed: {}", applicationId);
        return mapToDto(app);
    }

    public LoanApplicationDto getApplication(Long applicationId, Long customerId) {
        return mapToDto(findByIdAndCustomer(applicationId, customerId));
    }

    public List<LoanApplicationDto> getCustomerApplications(Long customerId) {
        return loanRepository.findByCustomerIdOrderByAppliedAtDesc(customerId)
                .stream().map(this::mapToDto).toList();
    }

    @Transactional
    public void cancelApplication(Long applicationId, Long customerId) {
        LoanApplication app = findByIdAndCustomer(applicationId, customerId);
        if (!app.getStatus().canTransitionTo(ApplicationStatus.CANCELLED)) {
            throw new RuntimeException(
                "Cannot cancel application in status: " + app.getStatus());
        }
        app.setStatus(ApplicationStatus.CANCELLED);
        loanRepository.save(app);
        log.info("Loan application cancelled: {}", applicationId);
    }

    private void validateLoanRequest(LoanApplicationRequest req) {
        LoanType type = req.getLoanType();
        if (req.getRequestedAmount() < type.getMinAmount()
                || req.getRequestedAmount() > type.getMaxAmount()) {
            throw new RuntimeException(String.format(
                    "Amount must be between %.0f and %.0f for %s",
                    type.getMinAmount(), type.getMaxAmount(), type.name()));
        }
        if (req.getTenureMonths() < type.getMinTenureMonths()
                || req.getTenureMonths() > type.getMaxTenureMonths()) {
            throw new RuntimeException("Tenure out of range for selected loan type");
        }
    }

    private LoanApplication findByIdAndCustomer(Long id, Long customerId) {
        return loanRepository.findByIdAndCustomerId(id, customerId)
                .orElseThrow(() -> new RuntimeException("Loan application not found: " + id));
    }

    private LoanApplicationDto mapToDto(LoanApplication app) {
        return LoanApplicationDto.builder()
                .id(app.getId()).customerId(app.getCustomerId())
                .loanType(app.getLoanType()).requestedAmount(app.getRequestedAmount())
                .approvedAmount(app.getApprovedAmount()).tenureMonths(app.getTenureMonths())
                .interestRate(app.getInterestRate()).emiAmount(app.getEmiAmount())
                .processingFee(app.getProcessingFee()).status(app.getStatus())
                .rejectionReason(app.getRejectionReason())
                .appliedAt(app.getAppliedAt()).approvedAt(app.getApprovedAt())
                .build();
    }
}
