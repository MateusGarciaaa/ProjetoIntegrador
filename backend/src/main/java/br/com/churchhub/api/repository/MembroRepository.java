package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembroRepository extends JpaRepository<Membro, UUID> {

    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);

    Optional<Membro> findByEmail(String email);
    Optional<Membro> findByCpf(String cpf);

    Page<Membro> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    Page<Membro> findByStatus(StatusMembro status, Pageable pageable);

    Page<Membro> findByNomeContainingIgnoreCaseAndStatus(String nome, StatusMembro status, Pageable pageable);

    long countByStatus(StatusMembro status);

    /** Novos membros: os cadastrados a partir de `desde` (criado_em NULL nunca entra), mais recentes primeiro. */
    List<Membro> findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc(LocalDateTime desde);

    long countByCriadoEmGreaterThanEqual(LocalDateTime desde);

    /**
     * Só para a carga de demonstração: a auditoria preenche criado_em em todo cadastro, e o UPDATE
     * em massa é o único jeito de tratar membros fictícios como anteriores ao sistema (NULL).
     */
    @Modifying
    @Query("UPDATE Membro m SET m.criadoEm = NULL WHERE m.id IN :ids")
    int apagarDataDeCadastro(@Param("ids") Collection<UUID> ids);

    @Query("""
            SELECT m FROM Membro m
            WHERE m.dataNascimento IS NOT NULL
            AND EXTRACT(MONTH FROM m.dataNascimento) = :mes
            ORDER BY EXTRACT(DAY FROM m.dataNascimento) ASC
            """)
    // O mês vem do Clock da aplicação: CURRENT_DATE seguiria o fuso da sessão JDBC (o da JVM).
    List<Membro> buscarAniversariantesDoMes(@Param("mes") int mes);
}