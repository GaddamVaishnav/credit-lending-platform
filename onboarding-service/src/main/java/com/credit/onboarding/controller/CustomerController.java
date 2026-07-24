package com.credit.onboarding.controller;

import com.credit.onboarding.dto.CustomerProfileDto;
import com.credit.onboarding.dto.CustomerResponse;
import com.credit.onboarding.dto.KycRequest;
import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerDocument;
import com.credit.onboarding.entity.CustomerDocument.DocumentType;
import com.credit.onboarding.repository.CustomerRepository;
import com.credit.onboarding.service.CustomerService;
import com.credit.onboarding.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService    customerService;
    private final DocumentService    documentService;
    private final CustomerRepository customerRepository;

    // Helper to get customerId from authenticated user
    private Long getCustomerId(UserDetails userDetails) {
        Customer customer = customerRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Customer not found"));
        return customer.getId();
    }

    // ---- Profile ----
    @GetMapping("/customers/{id}/profile")
    public ResponseEntity<CustomerProfileDto> getProfile(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getProfile(id));
    }

    @GetMapping("/customers/me")
    public ResponseEntity<CustomerProfileDto> getMyProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long customerId = getCustomerId(userDetails);
        return ResponseEntity.ok(customerService.getProfile(customerId));
    }

    // ---- KYC ----
    @PostMapping("/kyc/submit")
    public ResponseEntity<Map<String, String>> submitKyc(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody KycRequest request) {
        Long customerId = getCustomerId(userDetails);
        String message = customerService.submitKyc(customerId, request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @GetMapping("/kyc/status/{customerId}")
    public ResponseEntity<Map<String, Object>> getKycStatus(@PathVariable Long customerId) {
        CustomerProfileDto profile = customerService.getProfile(customerId);
        return ResponseEntity.ok(Map.of(
                "customerId", customerId,
                "status", profile.getStatus(),
                "creditScore", profile.getCreditScore() != null ? profile.getCreditScore() : "Not fetched"
        ));
    }

    // ---- Documents ----
    @PostMapping(value = "/documents/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CustomerDocument> uploadDocument(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file,
            @RequestParam("docType") DocumentType docType) throws IOException {
        Long customerId = getCustomerId(userDetails);
        CustomerDocument doc = documentService.uploadDocument(customerId, file, docType);
        return ResponseEntity.ok(doc);
    }

    @GetMapping("/documents/{docId}/url")
    public ResponseEntity<Map<String, String>> getDocumentUrl(
            @PathVariable Long docId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long customerId = getCustomerId(userDetails);
        String url = documentService.getPresignedUrl(docId, customerId);
        return ResponseEntity.ok(Map.of("url", url, "expiresIn", "15 minutes"));
    }

    @DeleteMapping("/documents/{docId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable Long docId,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long customerId = getCustomerId(userDetails);
        documentService.deleteDocument(docId, customerId);
        return ResponseEntity.noContent().build();
    }

    // ---- Credit Score ----
    @PostMapping("/credit-score/fetch")
    public ResponseEntity<Map<String, String>> fetchCreditScore(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long customerId = getCustomerId(userDetails);
        String message = customerService.triggerCreditScoreFetch(customerId);
        return ResponseEntity.accepted().body(Map.of("message", message));
    }

    @GetMapping("/customers")
    public ResponseEntity<List<CustomerResponse>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }
}
