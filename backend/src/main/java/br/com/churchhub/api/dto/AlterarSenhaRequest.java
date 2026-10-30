package br.com.churchhub.api.dto;

import br.com.churchhub.api.validation.CabeNoBcrypt;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Troca de senha logado: as regras da nova senha são as mesmas do ResetPasswordRequest. */
public record AlterarSenhaRequest(
        // Sem o limite, o BCrypt lança exceção ao comparar (500), como no LoginRequest.
        @NotBlank(message = "A senha atual é obrigatória")
        @CabeNoBcrypt(message = "A senha atual é longa demais: o limite é de 72 bytes "
                + "(letras acentuadas e símbolos ocupam 2 ou mais)")
        String currentPassword,

        @NotBlank(message = "A nova senha é obrigatória")
        @Size(min = 6, max = 72, message = "A nova senha deve ter entre 6 e 72 caracteres")
        @CabeNoBcrypt(message = "A nova senha é longa demais: o limite é de 72 bytes "
                + "(letras acentuadas e símbolos ocupam 2 ou mais)")
        String newPassword) {
}
