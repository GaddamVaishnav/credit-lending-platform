package com.credit.onboarding.service;

import com.credit.onboarding.entity.Customer;
import com.credit.onboarding.entity.CustomerDocument;
import com.credit.onboarding.entity.CustomerDocument.DocumentType;
import com.credit.onboarding.entity.CustomerDocument.DocumentStatus;
import com.credit.onboarding.repository.CustomerDocumentRepository;
import com.credit.onboarding.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final CustomerDocumentRepository documentRepository;
    private final CustomerRepository         customerRepository;

    @Value("${aws.s3.bucket-name:credit-platform-documents}")
    private String bucketName;

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    private static final List<String> ALLOWED_TYPES =
            List.of("application/pdf", "image/jpeg", "image/png");

    public CustomerDocument uploadDocument(Long customerId, MultipartFile file,
                                           DocumentType docType) throws IOException {
        validateFile(file);

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerId));

        String s3Key = buildS3Key(customerId, docType, file.getOriginalFilename());

        // TODO: wire up real S3Client when AWS credentials are configured
        // s3Client.putObject(putRequest, RequestBody.fromInputStream(...));
        log.info("Document upload (mock): customerId={}, docType={}, s3Key={}", customerId, docType, s3Key);

        CustomerDocument doc = CustomerDocument.builder()
                .customer(customer)
                .docType(docType)
                .s3Key(s3Key)
                .fileName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSize(file.getSize())
                .uploadStatus(DocumentStatus.UPLOADED)
                .build();

        return documentRepository.save(doc);
    }

    /**
     * Generate a pre-signed URL for a document by its ID and owning customer.
     * In production this calls AWS S3 Presigner. Here it returns a mock URL.
     */
    public String getPresignedUrl(Long docId, Long customerId) {
        CustomerDocument doc = documentRepository.findByIdAndCustomerId(docId, customerId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + docId));

        // TODO: replace with real S3Presigner call when AWS is configured
        // GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
        //     .signatureDuration(Duration.ofMinutes(15))
        //     .getObjectRequest(r -> r.bucket(bucketName).key(doc.getS3Key()))
        //     .build();
        // return s3Presigner.presignGetObject(presignRequest).url().toString();

        String mockUrl = "https://" + bucketName + ".s3.amazonaws.com/" + doc.getS3Key()
                + "?X-Amz-Expires=900&mock=true";
        log.info("Generated pre-signed URL (mock) for docId={}", docId);
        return mockUrl;
    }

    /**
     * Generate a pre-signed URL directly from an S3 key (internal use).
     */
    public String generatePresignedUrl(String s3Key) {
        // TODO: replace with real S3Presigner call when AWS is configured
        return "https://" + bucketName + ".s3.amazonaws.com/" + s3Key + "?X-Amz-Expires=900&mock=true";
    }

    public void deleteDocument(Long docId, Long customerId) {
        CustomerDocument doc = documentRepository.findByIdAndCustomerId(docId, customerId)
                .orElseThrow(() -> new RuntimeException("Document not found: " + docId));

        // TODO: s3Client.deleteObject(...) when AWS is configured
        log.info("Document deleted (mock): docId={}", docId);
        documentRepository.delete(doc);
    }

    public List<CustomerDocument> getDocuments(Long customerId) {
        return documentRepository.findByCustomerId(customerId);
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new RuntimeException("File is empty");
        if (file.getSize() > MAX_FILE_SIZE)
            throw new RuntimeException("File size exceeds 5MB limit");
        if (!ALLOWED_TYPES.contains(file.getContentType()))
            throw new RuntimeException("File type not allowed. Allowed: PDF, JPEG, PNG");
    }

    private String buildS3Key(Long customerId, DocumentType docType, String fileName) {
        String ext = fileName != null && fileName.contains(".")
                ? fileName.substring(fileName.lastIndexOf(".")) : ".pdf";
        return String.format("customers/%d/documents/%s/%s%s",
                customerId, docType.name().toLowerCase(), UUID.randomUUID(), ext);
    }
}
