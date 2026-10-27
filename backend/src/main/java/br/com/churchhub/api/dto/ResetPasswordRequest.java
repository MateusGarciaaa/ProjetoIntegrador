package br.com.churchhub.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "O token é obrigatório")
        String token,

        // 72 é o limite do BCrypt: acima disso o restante da senha seria ignorado.
        @NotBlank(message = "A nova senha é obrigatória")
        @Size(min = 6, max = 72, message = "A nova senha deve ter entre 6 e 72 caracteres")
        String newPassword) {
}
