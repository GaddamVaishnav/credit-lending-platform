package com.credit.loan.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UnderwritingResult {

    private boolean passed;
    private boolean conditional; // pass with conditions (e.g. higher rate)
    private String  reason;

    public static UnderwritingResult pass(String reason) {
        return UnderwritingResult.builder().passed(true).reason(reason).build();
    }

    public static UnderwritingResult conditional(String reason) {
        return UnderwritingResult.builder().passed(true).conditional(true).reason(reason).build();
    }

    public static UnderwritingResult fail(String reason) {
        return UnderwritingResult.builder().passed(false).reason(reason).build();
    }
}
