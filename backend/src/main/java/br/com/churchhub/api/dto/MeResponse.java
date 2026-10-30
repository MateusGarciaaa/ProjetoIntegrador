package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.NomePerfil;

import java.util.UUID;

/** Dados da própria conta (tela "Minha conta"). Sem senha nem datas internas. */
public record MeResponse(
        UUID id,
        String nome,
        String email,
        NomePerfil perfil) {
}
