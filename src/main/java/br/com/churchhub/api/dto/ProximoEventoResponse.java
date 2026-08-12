// dto/ProximoEventoResponse.java
package br.com.churchhub.api.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ProximoEventoResponse(
        UUID id,
        String titulo,
        LocalDate data,
        LocalTime horario) {
}