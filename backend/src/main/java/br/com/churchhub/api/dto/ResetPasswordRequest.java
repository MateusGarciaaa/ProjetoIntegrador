package br.com.churchhub.api.dto;

import br.com.churchhub.api.validation.CabeNoBcrypt;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "O token é obrigatório")
        String token,

        // @Size conta caracteres; o limite real do BCrypt é de 72 bytes (@CabeNoBcrypt).
        @NotBlank(message = "A nova senha é obrigatória")
        @Size(min = 6, max = 72, message = "A nova senha deve ter entre 6 e 72 caracteres")
        @CabeNoBcrypt(message = "A nova senha é longa demais: o limite é de 72 bytes "
                + "(letras acentuadas e símbolos ocupam 2 ou mais)")
        String newPassword) {
}
