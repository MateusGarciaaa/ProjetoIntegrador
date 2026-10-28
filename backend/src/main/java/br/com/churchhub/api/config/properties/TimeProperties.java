package br.com.churchhub.api.config.properties;

import java.time.ZoneId;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotNull;

/**
 * Fuso horário da igreja (app.time.zone / APP_TIMEZONE). É nele que se decide "hoje" e
 * "agora" nas regras de negócio — por exemplo, se um evento já foi encerrado (RN09) —,
 * qualquer que seja o fuso da máquina onde a API roda. Um nome inválido impede a inicialização.
 *
 * @param zone identificador IANA, ex.: America/Sao_Paulo
 */
@Validated
@ConfigurationProperties(prefix = "app.time")
public record TimeProperties(@NotNull @DefaultValue("America/Sao_Paulo") ZoneId zone) {
}
