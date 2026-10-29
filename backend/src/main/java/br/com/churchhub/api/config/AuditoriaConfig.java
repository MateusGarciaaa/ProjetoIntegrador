package br.com.churchhub.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.auditing.DateTimeProvider;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Auditoria do JPA (@CreatedDate) com a hora do Clock da aplicação, no fuso da igreja, e não a da
 * JVM. Fica numa @Configuration própria (e não na classe principal) para os testes @WebMvcTest,
 * que não sobem o JPA, não tentarem ativá-la.
 */
@Configuration
@EnableJpaAuditing(dateTimeProviderRef = "dataHoraDaAuditoria")
public class AuditoriaConfig {

    @Bean
    public DateTimeProvider dataHoraDaAuditoria(Clock clock) {
        return () -> Optional.of(LocalDateTime.now(clock));
    }
}
