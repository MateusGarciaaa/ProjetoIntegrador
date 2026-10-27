package br.com.churchhub.api.validation;

import java.nio.charset.StandardCharsets;

/**
 * Limite real de senha do BCrypt: 72 BYTES, não 72 caracteres. "é" ocupa 2 bytes em UTF-8,
 * então 37 letras acentuadas já passam do limite, e o BCryptPasswordEncoder lança
 * IllegalArgumentException (que viraria 500) em vez de truncar.
 */
public final class SenhaBcrypt {

    public static final int MAX_BYTES = 72;

    private SenhaBcrypt() {
    }

    public static int bytesUtf8(String senha) {
        return senha.getBytes(StandardCharsets.UTF_8).length;
    }

    /** {@code null} cabe: a obrigatoriedade é do @NotBlank. */
    public static boolean cabe(String senha) {
        return senha == null || bytesUtf8(senha) <= MAX_BYTES;
    }
}
