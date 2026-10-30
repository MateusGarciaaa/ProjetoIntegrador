package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.NomePerfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cadastro pelo administrador: sem senha. O usuário recebe um convite (link de definição de senha).
 * RN01: exatamente um perfil, dos que existem em {@link NomePerfil} (Líder fica para a Fase 2;
 * valor fora do enum → 400).
 */
public record UsuarioCadastroRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres")
        String nome,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "E-mail inválido")
        @Size(max = 150, message = "O e-mail deve ter no máximo 150 caracteres")
        String email,

        @NotNull(message = "O perfil é obrigatório")
        NomePerfil perfil) {
}
