package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.StatusMembro;

import java.time.LocalDateTime;
import java.util.UUID;

/** Membro cadastrado recentemente (bloco "Novos membros" do dashboard). criadoEm: no fuso da igreja. */
public record NovoMembroResponse(
        UUID id,
        String nome,
        StatusMembro status,
        LocalDateTime criadoEm) {
}
