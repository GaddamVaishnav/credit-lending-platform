package com.credit.notification.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Document(collection = "notification_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationHistory {

    @Id
    private String id;

    @Indexed
    private Long customerId;

    private String eventType;
    private String channel;         // EMAIL, SMS, PUSH
    private String recipient;       // email or masked mobile
    private String subject;
    private String status;          // SENT, FAILED
    private String notes;
    private String errorMessage;

    private LocalDateTime sentAt;
    private LocalDateTime createdAt;
}
