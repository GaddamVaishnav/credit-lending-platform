package com.credit.repayment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class PaymentResponse {
    private String    transactionId;
    private Long      loanId;
    private Integer   installmentNumber;
    private Double    amountPaid;
    private Double    penaltyPaid;
    private Integer   remainingEmis;
    private Double    outstandingPrincipal;
    private LocalDate paymentDate;
    private String    status;
    private boolean   loanClosed;
}
