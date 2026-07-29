package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Membro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MembroRepository extends JpaRepository<Membro, UUID> {

    boolean existsByEmail(String email);
    boolean existsByCpf(String cpf);

    Optional<Membro> findByEmail(String email);
    Optional<Membro> findByCpf(String cpf);

    Page<Membro> findByNomeContainingIgnoreCase(String nome, Pageable pageable);
}