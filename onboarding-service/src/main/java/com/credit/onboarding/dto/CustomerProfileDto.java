package com.credit.onboarding.dto;

import com.credit.onboarding.entity.CustomerStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder
public class CustomerProfileDto {
    private Long id;
    private String fullName;
    private String email;
    private String mobile;
    private CustomerStatus status;
    private Integer creditScore;
    private Double monthlyIncome;
    private String employmentType;
    private LocalDateTime createdAt;
    private LocalDateTime eligibleAt;
}
