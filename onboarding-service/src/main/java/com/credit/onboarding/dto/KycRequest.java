package com.credit.onboarding.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class KycRequest {

    @NotBlank
    @Pattern(regexp = "^[2-9]{1}[0-9]{11}$", message = "Valid 12-digit Aadhaar number required")
    private String aadhaarNumber;

    @NotBlank
    @Pattern(regexp = "^[A-Z]{5}[0-9]{4}[A-Z]{1}$", message = "Valid PAN format required (e.g. ABCDE1234F)")
    private String panNumber;
}
