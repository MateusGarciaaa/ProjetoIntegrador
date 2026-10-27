package br.com.churchhub.api.entity;

/**
 * Perfis cadastrados pela migration V1 (tabela perfis). O nome é o mesmo usado nos
 * {@code @PreAuthorize}, com o prefixo ROLE_ adicionado pelo UsuarioDetailsImpl.
 * Líder fica para a Fase 2 (depende do módulo de Ministérios).
 */
public enum NomePerfil {
    ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO, MEMBRO
}
