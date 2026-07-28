public interface MailSender {
    void sendPasswordResetEmail(String toEmail, String resetToken);
}

