package com.credit.loan.entity;

import java.util.Map;
import java.util.Set;

public enum ApplicationStatus {
    DRAFT,
    SUBMITTED,
    UNDER_REVIEW,
    APPROVED,
    REJECTED,
    AGREEMENT_PENDING,
    AGREEMENT_SIGNED,
    DISBURSED,
    CANCELLED;

    private static final Map<ApplicationStatus, Set<ApplicationStatus>> TRANSITIONS = Map.of(
        DRAFT,             Set.of(SUBMITTED, CANCELLED),
        SUBMITTED,         Set.of(UNDER_REVIEW, CANCELLED),
        UNDER_REVIEW,      Set.of(APPROVED, REJECTED),
        APPROVED,          Set.of(AGREEMENT_PENDING, CANCELLED),
        AGREEMENT_PENDING, Set.of(AGREEMENT_SIGNED, CANCELLED),
        AGREEMENT_SIGNED,  Set.of(DISBURSED)
    );

    public boolean canTransitionTo(ApplicationStatus next) {
        return TRANSITIONS.getOrDefault(this, Set.of()).contains(next);
    }
}
