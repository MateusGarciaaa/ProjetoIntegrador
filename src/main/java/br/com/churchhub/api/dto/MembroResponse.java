// dto/MembroResponse.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.StatusMembro;

import java.time.LocalDate;
import java.util.UUID;

public record MembroResponse(
        UUID id,
        String nome,
        String cpf,
        String email,
        String telefone,
        String endereco,
        LocalDate dataNascimento,
        LocalDate dataBatismo,
        LocalDate dataConversao,
        StatusMembro status) {
}