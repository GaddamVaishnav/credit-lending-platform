package com.credit.loan.dto;

import com.credit.loan.entity.LoanType;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LoanApplicationRequest {

    // customerId can come from body OR query param
    private Long customerId;

    @NotNull
    private LoanType loanType;

    @NotNull
    @Positive
    private Double requestedAmount;

    @NotNull
    @Min(value = 12, message = "Minimum tenure is 12 months")
    @Max(value = 360, message = "Maximum tenure is 360 months")
    private Integer tenureMonths;

    @NotNull
    @Positive
    private Double monthlyIncome;

    @NotNull
    @Min(300) @Max(900)
    private Integer creditScore;

    @NotBlank
    private String employmentType;

    @PositiveOrZero
    private Double existingEmiObligations;

    private String loanPurpose;
}
