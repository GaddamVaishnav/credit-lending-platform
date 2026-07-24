package com.credit.repayment.scheduler;

import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import com.credit.repayment.kafka.RepaymentEventPublisher;
import com.credit.repayment.repository.EmiScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.*;
import org.springframework.batch.core.launch.JobLauncher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmiScheduler {

    private final EmiScheduleRepository    emiRepository;
    private final RepaymentEventPublisher  eventPublisher;
    private final JobLauncher              jobLauncher;
    private final Job                      monthlyEmiProcessingJob;

    /**
     * Every day at 8 AM — mark EMIs due today, trigger reminders.
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void markDueEmisAndSendReminders() {
        log.info("Running daily EMI reminder job at {}", LocalDateTime.now());
        LocalDate today = LocalDate.now();

        // Mark UPCOMING EMIs that are now due
        var upcomingDue = emiRepository.findByDueDateAndStatusIn(
                today, List.of(EmiStatus.UPCOMING));
        upcomingDue.forEach(emi -> {
            emi.setStatus(EmiStatus.DUE);
            emiRepository.save(emi);
            eventPublisher.publishEmiDue(emi); // → Notification service sends SMS
        });
        log.info("Marked {} EMIs as DUE for {}", upcomingDue.size(), today);

        // Send 3-day advance reminders
        LocalDate threeDaysAhead = today.plusDays(3);
        var upcoming3Days = emiRepository.findByDueDateAndStatusIn(
                threeDaysAhead, List.of(EmiStatus.UPCOMING));
        upcoming3Days.forEach(emi -> eventPublisher.publishEmiReminder(emi, 3));
        log.info("Sent {} advance reminders (3 days)", upcoming3Days.size());
    }

    /**
     * Every day at 9 AM — escalate overdue EMIs.
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void escalateOverdueEmis() {
        log.info("Running overdue escalation job");
        LocalDate today = LocalDate.now();

        var overdueEmis = emiRepository.findByStatusIn(
                List.of(EmiStatus.DUE, EmiStatus.OVERDUE));

        overdueEmis.forEach(emi -> {
            if (emi.getDueDate().isBefore(today)) {
                long daysOverdue = today.toEpochDay() - emi.getDueDate().toEpochDay();
                emi.setDaysOverdue((int) daysOverdue);

                double penalty = emi.getEmiAmount() * 0.001 * daysOverdue;
                emi.setPenaltyAmount(Math.round(penalty * 100.0) / 100.0);

                if (daysOverdue > 90) {
                    emi.setStatus(EmiStatus.NPA);
                    eventPublisher.publishNpaFlagged(emi);
                } else {
                    emi.setStatus(EmiStatus.OVERDUE);
                    eventPublisher.publishEmiOverdue(emi);
                }
                emiRepository.save(emi);
            }
        });
        log.info("Escalated {} overdue EMIs", overdueEmis.size());
    }

    /**
     * 1st of every month at 6 AM — bulk EMI Spring Batch job.
     */
    @Scheduled(cron = "0 0 6 1 * *")
    public void runMonthlyEmiBatchJob() {
        log.info("Launching monthly EMI batch processing job");
        try {
            JobParameters params = new JobParametersBuilder()
                    .addString("runDate", LocalDate.now().toString())
                    .addLong("timestamp", System.currentTimeMillis())
                    .toJobParameters();
            JobExecution execution = jobLauncher.run(monthlyEmiProcessingJob, params);
            log.info("Monthly batch job status: {}", execution.getStatus());
        } catch (Exception e) {
            log.error("Monthly EMI batch job failed", e);
        }
    }
}
