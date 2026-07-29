package com.credit.onboarding.config;

import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import com.credit.onboarding.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements CommandLineRunner {

    private final CustomerRepository customerRepository;
    private final PasswordEncoder    passwordEncoder;

    @Override
    public void run(String... args) {
        if (!customerRepository.existsByEmail("admin@creditplatform.com")) {
            Customer admin = Customer.builder()
                    .fullName("Platform Admin")
                    .email("admin@creditplatform.com")
                    .mobile("9000000000")
                    .passwordHash(passwordEncoder.encode("Admin@1234"))
                    .status(CustomerStatus.ELIGIBLE)
                    .monthlyIncome(0.0)
                    .employmentType("ADMIN")
                    .employerName("CreditPlatform")
                    .build();
            customerRepository.save(admin);
            log.info("✅ Admin created: admin@creditplatform.com / Admin@1234");
        } else {
            log.info("✅ Admin already exists");
        }
    }
}
