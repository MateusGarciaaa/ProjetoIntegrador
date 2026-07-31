// dto/EventoResponse.java
package br.com.churchhub.api.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record EventoResponse(
        UUID id,
        String titulo,
        String descricao,
        LocalDate data,
        LocalTime horario,
        String local) {
}