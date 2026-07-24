package com.credit.onboarding.entity;

import java.util.Map;
import java.util.Set;

public enum CustomerStatus {
    REGISTERED,
    KYC_PENDING,
    DOCS_PENDING,
    KYC_VERIFIED,
    SCORE_FETCHING,
    ELIGIBLE,
    REJECTED,
    SUSPENDED;

    private static final Map<CustomerStatus, Set<CustomerStatus>> ALLOWED_TRANSITIONS = Map.of(
        REGISTERED,     Set.of(KYC_PENDING),
        KYC_PENDING,    Set.of(DOCS_PENDING, REJECTED),
        DOCS_PENDING,   Set.of(KYC_VERIFIED, REJECTED),
        KYC_VERIFIED,   Set.of(SCORE_FETCHING, REJECTED),
        SCORE_FETCHING, Set.of(ELIGIBLE, REJECTED)
    );

    public boolean canTransitionTo(CustomerStatus next) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(next);
    }
}
