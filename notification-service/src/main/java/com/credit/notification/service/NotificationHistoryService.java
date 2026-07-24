package com.credit.notification.service;

import com.credit.notification.entity.NotificationHistory;
import com.credit.notification.repository.NotificationHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationHistoryService {

    private final NotificationHistoryRepository repository;

    public void save(Long customerId, String eventType, String notes) {
        NotificationHistory history = NotificationHistory.builder()
                .customerId(customerId)
                .eventType(eventType)
                .status("SENT")
                .notes(notes)
                .sentAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(history);
        log.debug("Notification history saved: customerId={}, event={}", customerId, eventType);
    }

    public void saveEmailRecord(Long customerId, String eventType,
                                 String recipient, String subject) {
        NotificationHistory history = NotificationHistory.builder()
                .customerId(customerId).eventType(eventType)
                .channel("EMAIL").recipient(recipient).subject(subject)
                .status("SENT").sentAt(LocalDateTime.now()).createdAt(LocalDateTime.now())
                .build();
        repository.save(history);
    }

    public void saveSmsRecord(Long customerId, String eventType, String mobile) {
        String masked = mobile.length() >= 8
                ? mobile.substring(0, 4) + "****" + mobile.substring(8) : "****";
        NotificationHistory history = NotificationHistory.builder()
                .customerId(customerId).eventType(eventType)
                .channel("SMS").recipient(masked)
                .status("SENT").sentAt(LocalDateTime.now()).createdAt(LocalDateTime.now())
                .build();
        repository.save(history);
    }

    public void saveFailure(Long customerId, String eventType, String errorMessage) {
        NotificationHistory history = NotificationHistory.builder()
                .customerId(customerId).eventType(eventType)
                .status("FAILED").errorMessage(errorMessage)
                .createdAt(LocalDateTime.now())
                .build();
        repository.save(history);
    }

    public List<NotificationHistory> getHistory(Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }
}
