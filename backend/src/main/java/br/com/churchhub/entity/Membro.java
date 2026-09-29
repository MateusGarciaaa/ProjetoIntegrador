// entity/Membro.java
package br.com.churchhub.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "membros")
@Getter @Setter @NoArgsConstructor
public class Membro {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true, length = 11)
    private String cpf;

    @Column(nullable = false, unique = true)
    private String email;

    private String telefone;

    private String endereco;

    private LocalDate dataNascimento;

    private LocalDate dataBatismo;

    private LocalDate dataConversao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StatusMembro status;
}