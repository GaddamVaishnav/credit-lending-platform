package com.credit.onboarding.service;

import com.credit.onboarding.dto.CustomerEvent;
import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import com.credit.onboarding.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreditScoreService {

    private final CustomerRepository customerRepository;
    private final KafkaTemplate<String, CustomerEvent> kafkaTemplate;

    private static final int ELIGIBLE_SCORE_THRESHOLD = 650;

    /**
     * Fetch credit score asynchronously from CIBIL (mock implementation).
     * Uses @Async to run on dedicated thread pool — covers multithreading R&R.
     */
    @Async("creditScoreExecutor")
    public CompletableFuture<Integer> fetchCreditScore(Long customerId) {
        log.info("Fetching credit score for customer: {} on thread: {}",
                customerId, Thread.currentThread().getName());

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customer.setStatus(CustomerStatus.SCORE_FETCHING);
        customerRepository.save(customer);

        try {
            // Simulate CIBIL API call latency (200–800ms)
            Thread.sleep(500);

            // Mock CIBIL score between 550 and 850
            int score = 550 + new Random().nextInt(301);
            String bureau = "CIBIL";

            customer.setCreditScore(score);
            customer.setCreditBureau(bureau);

            CustomerStatus newStatus = score >= ELIGIBLE_SCORE_THRESHOLD
                    ? CustomerStatus.ELIGIBLE : CustomerStatus.REJECTED;

            customer.setStatus(newStatus);
            if (newStatus == CustomerStatus.ELIGIBLE) {
                customer.setEligibleAt(LocalDateTime.now());
            }
            customerRepository.save(customer);

            // Publish Kafka event → Loan Engine, Notification service
            CustomerEvent event = CustomerEvent.builder()
                    .customerId(customer.getId())
                    .fullName(customer.getFullName())
                    .email(customer.getEmail())
                    .mobile(customer.getMobile())
                    .status(newStatus)
                    .creditScore(score)
                    .monthlyIncome(customer.getMonthlyIncome())
                    .employmentType(customer.getEmploymentType())
                    .eventType(newStatus == CustomerStatus.ELIGIBLE
                            ? "CUSTOMER_ELIGIBLE" : "CUSTOMER_REJECTED")
                    .eventTime(LocalDateTime.now())
                    .build();

            kafkaTemplate.send("customer-events", String.valueOf(customerId), event);

            log.info("Credit score fetched: customerId={}, score={}, status={}",
                    customerId, score, newStatus);
            return CompletableFuture.completedFuture(score);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Credit score fetch interrupted", e);
        }
    }
}
