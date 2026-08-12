// dto/AniversarianteResponse.java
package br.com.churchhub.api.dto;

import java.time.LocalDate;
import java.util.UUID;

public record AniversarianteResponse(
        UUID id,
        String nome,
        LocalDate dataNascimento) {
}