package com.credit.repayment.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class PaymentRequest {

    @NotNull
    private Long loanId;

    @NotNull
    @Positive
    private Double amount;

    private String paymentMode; // UPI, NEFT, IMPS, AUTO_DEBIT
    private String utrNumber;
}
