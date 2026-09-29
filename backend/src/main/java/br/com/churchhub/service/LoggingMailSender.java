package br.com.churchhub.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class LoggingMailSender implements MailSender {
    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        log.info("[DEV] Link de redefinição para {}: /reset-password?token={}", toEmail, resetToken);
    }
}