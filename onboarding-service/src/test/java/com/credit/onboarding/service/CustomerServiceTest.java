package com.credit.onboarding.service;

import com.credit.onboarding.dto.RegisterRequest;
import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerStatus;
import com.credit.onboarding.repository.CustomerRepository;
import com.credit.onboarding.security.JwtService;
import com.credit.onboarding.service.CustomerService;
import com.credit.onboarding.service.OtpService;
import com.credit.onboarding.service.CreditScoreService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CustomerService Unit Tests")
class CustomerServiceTest {

    @Mock private CustomerRepository     customerRepository;
    @Mock private PasswordEncoder        passwordEncoder;
    @Mock private JwtService             jwtService;
    @Mock private OtpService             otpService;
    @Mock private CreditScoreService     creditScoreService;
    @Mock private AuthenticationManager  authenticationManager;
    @Mock private UserDetailsService     userDetailsService;
    @Mock private KafkaTemplate          kafkaTemplate;

    @InjectMocks
    private CustomerService customerService;

    private RegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = new RegisterRequest();
        validRequest.setFullName("Rahul Sharma");
        validRequest.setEmail("rahul@example.com");
        validRequest.setMobile("9876543210");
        validRequest.setPassword("Test@1234");
        validRequest.setMonthlyIncome(75000.0);
        validRequest.setEmploymentType("SALARIED");
    }

    @Test
    @DisplayName("Should register customer successfully when email and mobile are new")
    void shouldRegisterCustomerSuccessfully() {
        when(customerRepository.existsByEmail(anyString())).thenReturn(false);
        when(customerRepository.existsByMobile(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");
        when(customerRepository.save(any(Customer.class))).thenAnswer(i -> {
            Customer c = i.getArgument(0);
            c.setId(1L);
            return c;
        });
        when(otpService.generateAndStoreOtp(anyString())).thenReturn("123456");

        String result = customerService.register(validRequest);

        assertNotNull(result);
        assertTrue(result.contains("OTP sent"));
        verify(customerRepository).save(argThat(c ->
                c.getStatus() == CustomerStatus.REGISTERED &&
                c.getEmail().equals("rahul@example.com")));
        verify(otpService).generateAndStoreOtp("9876543210");
        verify(kafkaTemplate).send(eq("customer-events"), anyString(), any());
    }

    @Test
    @DisplayName("Should throw exception when email already exists")
    void shouldThrowWhenEmailAlreadyExists() {
        when(customerRepository.existsByEmail("rahul@example.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> customerService.register(validRequest));

        assertTrue(ex.getMessage().contains("Email already registered"));
        verify(customerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw exception when mobile already exists")
    void shouldThrowWhenMobileAlreadyExists() {
        when(customerRepository.existsByEmail(anyString())).thenReturn(false);
        when(customerRepository.existsByMobile("9876543210")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> customerService.register(validRequest));

        assertTrue(ex.getMessage().contains("Mobile already registered"));
    }

    @Test
    @DisplayName("Should transition customer status correctly")
    void shouldTransitionStatusCorrectly() {
        Customer customer = Customer.builder()
                .id(1L).status(CustomerStatus.REGISTERED).build();
        when(customerRepository.save(any())).thenReturn(customer);

        customerService.transitionStatus(customer, CustomerStatus.KYC_PENDING);

        assertEquals(CustomerStatus.KYC_PENDING, customer.getStatus());
        verify(customerRepository).save(customer);
    }

    @Test
    @DisplayName("Should throw on invalid status transition")
    void shouldThrowOnInvalidStatusTransition() {
        Customer customer = Customer.builder()
                .id(1L).status(CustomerStatus.REGISTERED).build();

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> customerService.transitionStatus(customer, CustomerStatus.ELIGIBLE));

        assertTrue(ex.getMessage().contains("Invalid status transition"));
    }

    @Test
    @DisplayName("OTP verification should succeed with correct OTP")
    void shouldVerifyOtpAndReturnTokens() {
        when(otpService.verifyOtp("9876543210", "123456")).thenReturn(true);
        Customer customer = Customer.builder()
                .id(1L).email("rahul@example.com").mobile("9876543210")
                .status(CustomerStatus.REGISTERED).fullName("Rahul Sharma").build();
        when(customerRepository.findByMobile("9876543210")).thenReturn(Optional.of(customer));
        when(customerRepository.save(any())).thenReturn(customer);
        when(userDetailsService.loadUserByUsername(anyString()))
                .thenReturn(org.springframework.security.core.userdetails.User
                        .withUsername("rahul@example.com").password("x").roles("USER").build());
        when(jwtService.generateAccessToken(any(), anyLong())).thenReturn("access_token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh_token");

        var response = customerService.verifyOtpAndLogin("9876543210", "123456");

        assertNotNull(response);
        assertEquals("access_token", response.getAccessToken());
        assertEquals("refresh_token", response.getRefreshToken());
    }

    @Test
    @DisplayName("OTP verification should fail with wrong OTP")
    void shouldFailOtpVerificationWithWrongOtp() {
        when(otpService.verifyOtp("9876543210", "999999")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> customerService.verifyOtpAndLogin("9876543210", "999999"));

        assertTrue(ex.getMessage().contains("Invalid or expired OTP"));
    }
}
