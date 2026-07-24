package com.credit.repayment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ForeclosureQuote {
    private Long      loanId;
    private Double    outstandingPrincipal;
    private Double    overduePenalty;
    private Double    foreclosurePenalty;    // 2% of outstanding principal
    private Double    totalPayable;
    private LocalDate validTill;             // Quote valid for 3 days
}
