package com.credit.loan.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum LoanType {
    PERSONAL_LOAN(50_000, 2_000_000, 12, 60, 10.5, 14.5),
    HOME_LOAN(500_000, 50_000_000, 60, 360, 8.5, 11.0),
    VEHICLE_LOAN(100_000, 5_000_000, 12, 84, 9.0, 12.5),
    EDUCATION_LOAN(50_000, 2_000_000, 12, 120, 9.5, 13.0),
    BUSINESS_LOAN(100_000, 10_000_000, 12, 60, 11.0, 15.0);

    private final double minAmount;
    private final double maxAmount;
    private final int minTenureMonths;
    private final int maxTenureMonths;
    private final double baseRate;
    private final double maxRate;
}
