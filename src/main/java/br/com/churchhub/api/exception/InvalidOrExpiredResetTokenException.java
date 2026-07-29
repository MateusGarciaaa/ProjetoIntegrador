package br.com.churchhub.api.exception;

public class InvalidOrExpiredResetTokenException extends RuntimeException {
    public InvalidOrExpiredResetTokenException() {
        super("Token de redefinição inválido ou expirado");
    }
}