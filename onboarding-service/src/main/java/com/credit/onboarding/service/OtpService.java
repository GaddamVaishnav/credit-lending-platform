package com.credit.onboarding.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private static final String OTP_PREFIX        = "OTP:";
    private static final String OTP_ATTEMPT_PREFIX = "OTP_ATTEMPT:";
    private static final int    OTP_TTL_MINUTES   = 5;
    private static final int    MAX_ATTEMPTS       = 3;
    private static final int    ATTEMPT_TTL_HOURS  = 1;

    private final RedisTemplate<String, String> redisTemplate;

    public String generateAndStoreOtp(String mobile) {
        String attemptKey = OTP_ATTEMPT_PREFIX + mobile;
        String attempts   = redisTemplate.opsForValue().get(attemptKey);

        if (attempts != null && Integer.parseInt(attempts) >= MAX_ATTEMPTS) {
            throw new RuntimeException("Max OTP attempts reached. Try after 1 hour.");
        }

        String otp = String.format("%06d", new Random().nextInt(1000000));
        redisTemplate.opsForValue().set(
                OTP_PREFIX + mobile, otp, Duration.ofMinutes(OTP_TTL_MINUTES));

        // Increment attempt counter
        redisTemplate.opsForValue().increment(attemptKey);
        redisTemplate.expire(attemptKey, Duration.ofHours(ATTEMPT_TTL_HOURS));

        log.info("OTP generated for mobile: {}****, OTP: {}", mobile.substring(0, 4), otp);
        // In production: send via Twilio/SMS gateway
        return otp;
    }

    public boolean verifyOtp(String mobile, String otp) {
        String storedOtp = redisTemplate.opsForValue().get(OTP_PREFIX + mobile);
        if (storedOtp == null) {
            throw new RuntimeException("OTP expired or not found. Please request a new OTP.");
        }
        boolean isValid = storedOtp.equals(otp);
        if (isValid) {
            // Invalidate OTP after successful use (one-time use)
            redisTemplate.delete(OTP_PREFIX + mobile);
            redisTemplate.delete(OTP_ATTEMPT_PREFIX + mobile);
        }
        return isValid;
    }
}
