package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.NomePerfil;

import java.util.UUID;

/**
 * Usuário na gestão do administrador (RN02). {@code convitePendente}: cadastrado e ainda sem senha
 * definida pelo link do convite. Nunca expõe a senha nem o instante da troca.
 */
public record UsuarioResponse(
        UUID id,
        String nome,
        String email,
        NomePerfil perfil,
        boolean ativo,
        boolean convitePendente) {
}
