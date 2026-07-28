@Service
@Slf4j
public class LoggingMailSender implements MailSender {
    @Override
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        log.info("[DEV] Link de redefinição para {}: /reset-password?token={}", toEmail, resetToken);
    }
}