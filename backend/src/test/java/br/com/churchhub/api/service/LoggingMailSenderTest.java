package br.com.churchhub.api.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;

/** O link "enviado" é o caminho que o frontend abre: o convite leva o indicador, a redefinição não. */
class LoggingMailSenderTest {

    private final LoggingMailSender mailSender = new LoggingMailSender();
    private final ListAppender<ILoggingEvent> linhas = new ListAppender<>();
    private final Logger logger = (Logger) LoggerFactory.getLogger(LoggingMailSender.class);

    @BeforeEach
    void capturar() {
        linhas.start();
        logger.addAppender(linhas);
    }

    @AfterEach
    void soltar() {
        logger.detachAppender(linhas);
    }

    @Test
    void conviteLevaOIndicadorParaATelaDeBoasVindas() {
        mailSender.sendInviteEmail("novo@igreja.org", "abc-123");

        assertThat(linhas.list).singleElement().extracting(ILoggingEvent::getFormattedMessage)
                .isEqualTo("[DEV] Convite para novo@igreja.org: /reset-password?token=abc-123&convite=1");
    }

    @Test
    void redefinicaoNaoLevaOIndicador() {
        mailSender.sendPasswordResetEmail("ana@igreja.org", "abc-123");

        assertThat(linhas.list).singleElement().extracting(ILoggingEvent::getFormattedMessage)
                .isEqualTo("[DEV] Link de redefinição para ana@igreja.org: /reset-password?token=abc-123");
    }
}
