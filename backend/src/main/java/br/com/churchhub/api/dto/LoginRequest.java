package br.com.churchhub.api.dto;

import br.com.churchhub.api.validation.CabeNoBcrypt;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "E-mail inválido")
        String email,

        // Sem o limite, o BCrypt lança exceção ao comparar (500). Nenhuma senha gravada passa de 72 bytes.
        @NotBlank(message = "A senha é obrigatória")
        @CabeNoBcrypt
        String password) {
}
