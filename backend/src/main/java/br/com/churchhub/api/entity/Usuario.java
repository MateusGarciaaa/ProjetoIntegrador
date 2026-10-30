package br.com.churchhub.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Entity
@Table(name = "usuarios")
@Getter @Setter @NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senha;

    @Column(nullable = false)
    private boolean ativo = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "perfil_id", nullable = false)
    private Perfil perfil;

    /**
     * Última definição de senha (V8), truncada em segundos. {@code null} = convite pendente.
     * Tokens com {@code iat} anterior a este instante são recusados (troca de senha encerra as sessões).
     */
    @Column(name = "senha_alterada_em")
    private Instant senhaAlteradaEm;

    /**
     * Grava a nova senha (já codificada) e o instante da troca, truncado em segundos: o {@code iat}
     * do JWT tem precisão de segundos, e o token emitido logo depois, no mesmo segundo, precisa valer.
     */
    public void definirSenha(String senhaCodificada, Clock clock) {
        this.senha = senhaCodificada;
        this.senhaAlteradaEm = Instant.now(clock).truncatedTo(ChronoUnit.SECONDS);
    }

    /** Cadastrado pelo administrador e ainda não definiu a senha pelo link do convite. */
    public boolean isConvitePendente() {
        return senhaAlteradaEm == null;
    }
}