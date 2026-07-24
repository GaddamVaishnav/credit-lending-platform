package com.credit.notification.repository;

import com.credit.notification.entity.NotificationHistory;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationHistoryRepository extends MongoRepository<NotificationHistory, String> {
    List<NotificationHistory> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    List<NotificationHistory> findByCustomerIdAndEventType(Long customerId, String eventType);
    List<NotificationHistory> findByStatus(String status);
}
