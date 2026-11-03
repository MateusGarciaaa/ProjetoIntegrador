package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.Usuario;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AuditoriaTest {

    private final Auditoria auditoria = new Auditoria(
            Clock.fixed(Instant.parse("2026-10-28T13:00:00Z"), ZoneId.of("America/Sao_Paulo")));
    private final ListAppender<ILoggingEvent> linhas = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger("AUDITORIA");
    private final Ator ator = new Ator(UUID.fromString("00000000-0000-0000-0000-000000000001"), "admin@igreja.org");
    private Usuario alvo;

    @BeforeEach
    void preparar() {
        linhas.start();
        logger.addAppender(linhas);
        alvo = new Usuario();
        alvo.setId(UUID.fromString("00000000-0000-0000-0000-000000000002"));
        alvo.setEmail("alvo@igreja.org");
        alvo.setSenha("hash-secreto");
    }

    @AfterEach
    void limpar() {
        logger.detachAppender(linhas);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void foraDeTransacaoEscreveNaHoraComQuemQuandoEOQue() {
        auditoria.registrar(AcaoAuditada.PERFIL_ALTERADO, ator, alvo, "perfil=PASTOR->MEMBRO");

        assertThat(linhas.list).singleElement().extracting(ILoggingEvent::getFormattedMessage)
                .isEqualTo("acao=PERFIL_ALTERADO quando=2026-10-28T10:00-03:00 "
                        + "ator=00000000-0000-0000-0000-000000000001 <admin@igreja.org> "
                        + "alvo=00000000-0000-0000-0000-000000000002 <alvo@igreja.org> perfil=PASTOR->MEMBRO");
        assertThat(linhas.list.getFirst().getFormattedMessage()).doesNotContain("hash-secreto");
    }

    @Test
    void dentroDeTransacaoSoEscreveDepoisDoCommit() {
        TransactionSynchronizationManager.initSynchronization();

        auditoria.registrar(AcaoAuditada.USUARIO_CADASTRADO, ator, alvo, "perfil=MEMBRO");
        assertThat(linhas.list).isEmpty();

        TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
        assertThat(linhas.list).hasSize(1);
    }

    @Test
    void transacaoDesfeitaNaoDeixaRegistro() {
        TransactionSynchronizationManager.initSynchronization();

        auditoria.registrar(AcaoAuditada.USUARIO_CADASTRADO, ator, alvo, "perfil=MEMBRO");
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));

        assertThat(linhas.list).isEmpty();
    }
}
