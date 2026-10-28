package br.com.churchhub.api.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import br.com.churchhub.api.config.properties.TimeProperties;

/**
 * Relógio da aplicação, no fuso configurado (TimeProperties). Os serviços pedem a hora a
 * ele (LocalDateTime.now(clock)) em vez de usar o fuso padrão da JVM, e os testes trocam
 * por um Clock.fixed para verificar regras dependentes do tempo.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock(TimeProperties timeProperties) {
        return Clock.system(timeProperties.zone());
    }
}
