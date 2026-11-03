package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Log de alterações críticas (RN13): quem fez, quando e o quê, numa linha por ação, no logger
 * {@code AUDITORIA} (pode ser separado em arquivo próprio pela configuração de log).
 *
 * <p>Dentro de uma transação, a linha só é escrita depois do commit: uma operação desfeita
 * (ex.: e-mail duplicado detectado pelo índice único no commit) não deixa registro falso.
 * O instante registrado é o da ação, não o do commit.</p>
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
        OffsetDateTime quando = OffsetDateTime.now(clock);
        // Copiados agora: a entidade pode mudar até o commit.
        UUID alvoId = alvo.getId();
        String alvoEmail = alvo.getEmail();
        Runnable escrever = () -> LOG.info("acao={} quando={} ator={} <{}> alvo={} <{}> {}",
                acao, quando, ator.id(), ator.email(), alvoId, alvoEmail, detalhe);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    escrever.run();
                }
            });
        } else {
            escrever.run();
        }
    }
}
