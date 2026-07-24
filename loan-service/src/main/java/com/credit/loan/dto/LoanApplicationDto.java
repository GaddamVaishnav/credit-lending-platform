package com.credit.loan.dto;

import com.credit.loan.entity.ApplicationStatus;
import com.credit.loan.entity.LoanType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LoanApplicationDto {
    private Long              id;
    private Long              customerId;
    private LoanType          loanType;
    private Double            requestedAmount;
    private Double            approvedAmount;
    private Integer           tenureMonths;
    private Double            interestRate;
    private Double            emiAmount;
    private Double            processingFee;
    private ApplicationStatus status;
    private String            rejectionReason;
    private LocalDateTime     appliedAt;
    private LocalDateTime     approvedAt;
}
