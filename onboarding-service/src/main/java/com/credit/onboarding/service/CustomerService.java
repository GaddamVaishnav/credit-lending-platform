package com.credit.onboarding.service;

import com.credit.onboarding.dto.*;
import com.credit.onboarding.entity.*;
import com.credit.onboarding.repository.*;
import com.credit.onboarding.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomerService {

    private final CustomerRepository     customerRepository;
    private final KycDetailRepository    kycDetailRepository;
    private final PasswordEncoder        passwordEncoder;
    private final JwtService             jwtService;
    private final OtpService             otpService;
    private final CreditScoreService     creditScoreService;
    private final AuthenticationManager  authenticationManager;
    private final UserDetailsService     userDetailsService;
    private final KafkaTemplate<String, CustomerEvent> kafkaTemplate;

    @Transactional
    public String register(RegisterRequest request) {
        if (customerRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already registered: " + request.getEmail());
        }
        if (customerRepository.existsByMobile(request.getMobile())) {
            throw new RuntimeException("Mobile already registered: " + request.getMobile());
        }

        Customer customer = Customer.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .mobile(request.getMobile())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .monthlyIncome(request.getMonthlyIncome())
                .employmentType(request.getEmploymentType())
                .employerName(request.getEmployerName())
                .status(CustomerStatus.REGISTERED)
                .build();

        customerRepository.save(customer);

        String otp = otpService.generateAndStoreOtp(request.getMobile());
        log.info("Customer registered: {}, OTP sent", customer.getId());

        try {
            CustomerEvent event = CustomerEvent.builder()
                    .customerId(customer.getId())
                    .fullName(customer.getFullName())
                    .email(customer.getEmail())
                    .mobile(customer.getMobile())
                    .status(CustomerStatus.REGISTERED)
                    .eventType("CUSTOMER_REGISTERED")
                    .eventTime(LocalDateTime.now())
                    .build();
            kafkaTemplate.send("customer-events", String.valueOf(customer.getId()), event);
        } catch (Exception e) {
            log.warn("Failed to send Kafka event: {}", e.getMessage());
        }

        return "OTP sent to " + maskMobile(request.getMobile());
    }

    @Transactional
    public AuthResponse verifyOtpAndLogin(String mobile, String otp) {
        if (!otpService.verifyOtp(mobile, otp)) {
            throw new RuntimeException("Invalid or expired OTP");
        }

        Customer customer = customerRepository.findByMobile(mobile)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        customer.setStatus(CustomerStatus.KYC_PENDING);
        customerRepository.save(customer);

        UserDetails userDetails = userDetailsService.loadUserByUsername(customer.getEmail());
        String accessToken  = jwtService.generateAccessToken(userDetails, customer.getId());
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(900L)
                .profile(mapToProfileDto(customer))
                .build();
    }

    public AuthResponse login(String email, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password));

        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
        String accessToken  = jwtService.generateAccessToken(userDetails, customer.getId());
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(900L)
                .profile(mapToProfileDto(customer))
                .build();
    }

    @Transactional
    public String submitKyc(Long customerId, KycRequest request) {
        Customer customer = findAndValidateStatus(customerId, CustomerStatus.KYC_PENDING);

        KycDetail kyc = KycDetail.builder()
                .customer(customer)
                .aadhaarNumber(encrypt(request.getAadhaarNumber()))
                .panNumber(encrypt(request.getPanNumber()))
                .verificationStatus(KycDetail.KycStatus.SUBMITTED)
                .build();

        kycDetailRepository.save(kyc);

        // Mock: auto-verify KYC immediately
        transitionStatus(customer, CustomerStatus.DOCS_PENDING);
        transitionStatus(customer, CustomerStatus.KYC_VERIFIED);

        log.info("KYC submitted and auto-verified for customer: {}", customerId);
        return "KYC submitted and verified. You can now fetch your credit score.";
    }

    @Transactional
    public String triggerCreditScoreFetch(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));
        creditScoreService.fetchCreditScore(customerId);
        log.info("Credit score fetch triggered for customer: {}", customerId);
        return "Credit score fetch initiated. You will be notified once complete.";
    }

    @Transactional(readOnly = true)
    public CustomerProfileDto getProfile(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));
        return mapToProfileDto(customer);
    }

    @Transactional
    public void forceSetKycVerified(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));
        customer.setStatus(CustomerStatus.KYC_VERIFIED);
        customerRepository.save(customer);
        log.info("Force set KYC_VERIFIED for customer: {}", customerId);
    }

    public String resendOtp(String mobile) {
        customerRepository.findByMobile(mobile)
                .orElseThrow(() -> new RuntimeException("Mobile not registered: " + mobile));
        String otp = otpService.generateAndStoreOtp(mobile);
        log.info("OTP resent for mobile: {}****", mobile.substring(0, 4));
        return "OTP resent to " + maskMobile(mobile);
    }

    @Transactional
    public void transitionStatus(Customer customer, CustomerStatus newStatus) {
        if (!customer.getStatus().canTransitionTo(newStatus)) {
            throw new RuntimeException(String.format(
                    "Invalid status transition: %s → %s", customer.getStatus(), newStatus));
        }
        customer.setStatus(newStatus);
        customerRepository.save(customer);
        log.info("Customer {} status: {} → {}", customer.getId(), customer.getStatus(), newStatus);
    }

    private Customer findAndValidateStatus(Long customerId, CustomerStatus expectedStatus) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));
        if (customer.getStatus() != expectedStatus) {
            throw new RuntimeException(
                    "Expected status " + expectedStatus + " but found " + customer.getStatus());
        }
        return customer;
    }

    private CustomerProfileDto mapToProfileDto(Customer c) {
        return CustomerProfileDto.builder()
                .id(c.getId())
                .fullName(c.getFullName())
                .email(c.getEmail())
                .mobile(c.getMobile())
                .status(c.getStatus())
                .creditScore(c.getCreditScore())
                .monthlyIncome(c.getMonthlyIncome())
                .employmentType(c.getEmploymentType())
                .createdAt(c.getCreatedAt())
                .eligibleAt(c.getEligibleAt())
                .build();
    }

    public List<CustomerResponse> getAllCustomers() {
        return customerRepository.findAll()
                .stream()
                .map(customer -> new CustomerResponse(
                        customer.getId(),
                        customer.getFullName(),
                        customer.getEmail(),
                        customer.getMobile(),
                        customer.getStatus().toString()))
                .toList();
    }

    private String maskMobile(String mobile) {
        return mobile.substring(0, 2) + "****" + mobile.substring(6);
    }

    private String encrypt(String value) {
        return "ENC:" + value;
    }
}

