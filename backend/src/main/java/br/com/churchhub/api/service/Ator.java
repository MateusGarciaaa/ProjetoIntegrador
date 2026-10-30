package br.com.churchhub.api.service;

import br.com.churchhub.api.security.UsuarioDetailsImpl;

import java.util.UUID;

/** Quem executa uma ação auditada (RN13): o usuário autenticado da requisição. */
public record Ator(UUID id, String email) {

    public static Ator de(UsuarioDetailsImpl usuario) {
        return new Ator(usuario.getId(), usuario.getUsername());
    }
}
