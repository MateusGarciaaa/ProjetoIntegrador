package br.com.churchhub.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class LoggingMailSender implements MailSender {

    static final String CAMINHO_REDEFINICAO = "/reset-password?token=%s";
    /**
     * Mesma tela e mesmo token do reset. O {@code convite=1} só troca o texto da tela ("Bem-vindo
     * ao ChurchHub!"): quem decide se o link vale é sempre o token, conferido no backend.
     */
    static final String CAMINHO_CONVITE = CAMINHO_REDEFINICAO + "&convite=1";

    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        log.info("[DEV] Link de redefinição para {}: {}", toEmail, CAMINHO_REDEFINICAO.formatted(resetToken));
    }

    @Override
    public void sendInviteEmail(String toEmail, String inviteToken) {
        log.info("[DEV] Convite para {}: {}", toEmail, CAMINHO_CONVITE.formatted(inviteToken));
    }
}
