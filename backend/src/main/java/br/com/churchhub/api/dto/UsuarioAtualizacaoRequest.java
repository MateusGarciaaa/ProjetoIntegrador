package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.NomePerfil;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Edição pelo administrador: nome e perfil. O e-mail (login) não muda por aqui. */
public record UsuarioAtualizacaoRequest(
        @NotBlank(message = "O nome é obrigatório")
        @Size(max = 150, message = "O nome deve ter no máximo 150 caracteres")
        String nome,

        @NotNull(message = "O perfil é obrigatório")
        NomePerfil perfil) {
}
