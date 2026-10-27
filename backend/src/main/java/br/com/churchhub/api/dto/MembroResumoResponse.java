package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.StatusMembro;

import java.util.UUID;

/**
 * Dados mínimos de um membro para seletores de outros módulos (ex.: membro de um lançamento
 * financeiro). Não expõe CPF, contato, endereço nem datas: quem precisa só escolher um membro
 * não deve receber a ficha completa.
 */
public record MembroResumoResponse(
        UUID id,
        String nome,
        StatusMembro status) {
}
