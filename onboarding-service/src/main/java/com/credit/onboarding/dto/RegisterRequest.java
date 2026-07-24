package com.credit.onboarding.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 3, max = 100)
    private String fullName;

    @NotBlank
    @Email(message = "Valid email is required")
    private String email;

    @NotBlank
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Valid 10-digit Indian mobile number required")
    private String mobile;

    @NotBlank
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%]).+$",
             message = "Password must contain uppercase, digit, and special character")
    private String password;

    @NotNull
    private Double monthlyIncome;

    @NotBlank
    private String employmentType;

    private String employerName;
}
