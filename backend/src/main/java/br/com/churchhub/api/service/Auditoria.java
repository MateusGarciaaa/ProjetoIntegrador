package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.OffsetDateTime;

/**
 * Log de alterações críticas (RN13): quem fez, quando e o quê, numa linha por ação, no logger
 * {@code AUDITORIA} (pode ser separado em arquivo próprio pela configuração de log).
 *
 * <p>Registra só identificadores, e-mails (já validados por {@code @Email}) e valores de enum:
 * nunca senha, token ou texto livre digitado pelo usuário, que poderia forjar linhas no log.</p>
 */
@Component
public class Auditoria {

    private static final Logger LOG = LoggerFactory.getLogger("AUDITORIA");

    private final Clock clock;

    public Auditoria(Clock clock) {
        this.clock = clock;
    }

    /** @param detalhe o que mudou, montado só com enums e booleanos (ex.: {@code "perfil=PASTOR->SECRETARIO"}) */
    public void registrar(AcaoAuditada acao, Ator ator, Usuario alvo, String detalhe) {
        LOG.info("acao={} quando={} ator={} <{}> alvo={} <{}> {}",
                acao, OffsetDateTime.now(clock), ator.id(), ator.email(), alvo.getId(), alvo.getEmail(), detalhe);
    }
}
