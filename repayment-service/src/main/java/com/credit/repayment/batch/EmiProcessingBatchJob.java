package com.credit.repayment.batch;

import com.credit.repayment.entity.EmiSchedule;
import com.credit.repayment.entity.EmiSchedule.EmiStatus;
import com.credit.repayment.kafka.RepaymentEventPublisher;
import com.credit.repayment.repository.EmiScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.batch.core.*;
import org.springframework.batch.core.configuration.annotation.StepScope;
import org.springframework.batch.core.job.builder.JobBuilder;
import org.springframework.batch.core.repository.JobRepository;
import org.springframework.batch.core.step.builder.StepBuilder;
import org.springframework.batch.item.ItemProcessor;
import org.springframework.batch.item.ItemWriter;
import org.springframework.batch.item.data.RepositoryItemReader;
import org.springframework.batch.item.data.builder.RepositoryItemReaderBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Spring Batch job that processes all EMIs due today.
 * Reads in chunks of 500 — restartable if job fails midway.
 * Triggered by @Scheduled on the 1st of each month.
 */
@Configuration
@RequiredArgsConstructor
@Slf4j
public class EmiProcessingBatchJob {

    private final EmiScheduleRepository    emiRepository;
    private final RepaymentEventPublisher  eventPublisher;

    @Bean
    public Job monthlyEmiProcessingJob(JobRepository jobRepository,
                                        Step emiProcessingStep) {
        return new JobBuilder("monthlyEmiProcessingJob", jobRepository)
                .start(emiProcessingStep)
                .listener(new JobExecutionListener() {
                    @Override
                    public void beforeJob(JobExecution jobExecution) {
                        log.info("Starting monthly EMI processing batch job");
                    }
                    @Override
                    public void afterJob(JobExecution jobExecution) {
                        log.info("Monthly EMI batch job completed with status: {}",
                                jobExecution.getStatus());
                    }
                })
                .build();
    }

    @Bean
    public Step emiProcessingStep(JobRepository jobRepository,
                                   PlatformTransactionManager transactionManager) {
        return new StepBuilder("emiProcessingStep", jobRepository)
                .<EmiSchedule, EmiSchedule>chunk(500, transactionManager) // Process 500 at a time
                .reader(emiItemReader())
                .processor(emiItemProcessor())
                .writer(emiItemWriter())
                .faultTolerant()
                .skipLimit(10)  // Skip up to 10 bad records before failing
                .skip(Exception.class)
                .build();
    }

    @Bean
    @StepScope
    public RepositoryItemReader<EmiSchedule> emiItemReader() {
        LocalDate today = LocalDate.now();
        return new RepositoryItemReaderBuilder<EmiSchedule>()
                .name("emiReader")
                .repository(emiRepository)
                .methodName("findByDueDateAndStatusIn")
                .arguments(today, List.of(EmiStatus.DUE, EmiStatus.UPCOMING))
                .sorts(Map.of("id", Sort.Direction.ASC))
                .pageSize(500)
                .build();
    }

    @Bean
    public ItemProcessor<EmiSchedule, EmiSchedule> emiItemProcessor() {
        return emi -> {
            log.debug("Processing EMI: loanId={}, installment={}",
                    emi.getLoanId(), emi.getInstallmentNumber());

            LocalDate today = LocalDate.now();

            if (emi.getDueDate().isBefore(today)) {
                long daysOverdue = today.toEpochDay() - emi.getDueDate().toEpochDay();
                emi.setDaysOverdue((int) daysOverdue);

                double penalty = emi.getEmiAmount() * 0.001 * daysOverdue; // 0.1%/day
                emi.setPenaltyAmount(Math.round(penalty * 100.0) / 100.0);

                if (daysOverdue > 90) {
                    emi.setStatus(EmiStatus.NPA);
                } else {
                    emi.setStatus(EmiStatus.OVERDUE);
                }
            } else {
                emi.setStatus(EmiStatus.DUE);
            }
            return emi;
        };
    }

    @Bean
    public ItemWriter<EmiSchedule> emiItemWriter() {
        return emis -> {
            emiRepository.saveAll(emis);
            emis.forEach(emi -> {
                if (emi.getStatus() == EmiStatus.DUE) {
                    eventPublisher.publishEmiDue(emi);
                } else if (emi.getStatus() == EmiStatus.OVERDUE) {
                    eventPublisher.publishEmiOverdue(emi);
                }
            });
            log.info("Processed and saved {} EMI records", emis.size());
        };
    }
}
