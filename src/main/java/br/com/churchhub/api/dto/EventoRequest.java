// dto/EventoRequest.java
package br.com.churchhub.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record EventoRequest(

        @NotBlank(message = "O título é obrigatório")
        String titulo,

        String descricao,

        @NotNull(message = "A data é obrigatória")
        LocalDate data,

        @NotNull(message = "O horário é obrigatório")
        LocalTime horario,

        String local) {
}