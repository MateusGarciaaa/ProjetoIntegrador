package br.com.churchhub.api.service;

public interface MailSender {
    void sendPasswordResetEmail(String toEmail, String resetToken);
}

