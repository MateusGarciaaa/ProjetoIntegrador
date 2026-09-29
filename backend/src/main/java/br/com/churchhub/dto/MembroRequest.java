// dto/MembroRequest.java
package br.com.churchhub.api.dto;

import br.com.churchhub.api.entity.StatusMembro;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public record MembroRequest(

        @NotBlank(message = "O nome é obrigatório")
        String nome,

        @NotBlank(message = "O CPF é obrigatório")
        @Pattern(regexp = "\\d{11}", message = "O CPF deve conter 11 dígitos numéricos")
        String cpf,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "E-mail inválido")
        String email,

        String telefone,

        String endereco,

        LocalDate dataNascimento,

        LocalDate dataBatismo,

        LocalDate dataConversao,

        StatusMembro status) {
}