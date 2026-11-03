package br.com.churchhub.api.service;

public interface MailSender {
    void sendPasswordResetEmail(String toEmail, String resetToken);

    /** Convite de um usuário cadastrado pelo administrador: o link leva à definição da primeira senha. */
    void sendInviteEmail(String toEmail, String inviteToken);
}
