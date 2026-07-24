package com.credit.onboarding.repository;

import com.credit.onboarding.entity.CustomerDocument;
import com.credit.onboarding.entity.CustomerDocument.DocumentStatus;
import com.credit.onboarding.entity.CustomerDocument.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerDocumentRepository extends JpaRepository<CustomerDocument, Long> {

    List<CustomerDocument> findByCustomerId(Long customerId);

    Optional<CustomerDocument> findByIdAndCustomerId(Long id, Long customerId);

    List<CustomerDocument> findByCustomerIdAndDocType(Long customerId, DocumentType docType);

    @Query("SELECT d FROM CustomerDocument d WHERE d.customer.id = :customerId AND d.uploadStatus = :status")
    List<CustomerDocument> findByCustomerIdAndStatus(@Param("customerId") Long customerId,
                                                      @Param("status") DocumentStatus status);

    @Query("SELECT COUNT(d) FROM CustomerDocument d WHERE d.customer.id = :customerId AND d.uploadStatus = 'VERIFIED'")
    long countVerifiedDocuments(@Param("customerId") Long customerId);

    boolean existsByCustomerIdAndDocTypeAndUploadStatus(Long customerId,
                                                          DocumentType docType,
                                                          DocumentStatus status);
}
