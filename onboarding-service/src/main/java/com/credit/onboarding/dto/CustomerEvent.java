package com.credit.onboarding.dto;

import com.credit.onboarding.entity.CustomerStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CustomerEvent {
    @NotNull(message = "Customer ID cannot be null")
    private Long customerId;
    private String fullName;
    private String email;
    private String mobile;
    private CustomerStatus status;
    private Integer creditScore;
    private Double monthlyIncome;
    private String employmentType;
    private String eventType;       // CUSTOMER_REGISTERED, CUSTOMER_ELIGIBLE, KYC_VERIFIED
    private LocalDateTime eventTime;
}
