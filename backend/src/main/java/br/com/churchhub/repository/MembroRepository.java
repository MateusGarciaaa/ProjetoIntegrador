// repository/MembroRepository.java
package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MembroRepository extends JpaRepository<Membro, UUID> {

    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);

    Optional<Membro> findByEmail(String email);
    Optional<Membro> findByCpf(String cpf);

    Page<Membro> findByNomeContainingIgnoreCase(String nome, Pageable pageable);

    long countByStatus(StatusMembro status);

    @Query("""
            SELECT m FROM Membro m
            WHERE m.dataNascimento IS NOT NULL
            AND EXTRACT(MONTH FROM m.dataNascimento) = EXTRACT(MONTH FROM CURRENT_DATE)
            ORDER BY EXTRACT(DAY FROM m.dataNascimento) ASC
            """)
    List<Membro> buscarAniversariantesDoMes();
}