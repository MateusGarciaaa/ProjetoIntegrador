package br.com.churchhub.api.util;

import java.util.Locale;

/**
 * E-mails de usuário são gravados em minúsculas e sem espaços nas pontas: "Admin@x.com " e
 * "admin@x.com" são a mesma conta. Toda busca de usuário por e-mail passa por aqui.
 */
public final class NormalizadorEmail {

    private NormalizadorEmail() {
    }

    public static String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
