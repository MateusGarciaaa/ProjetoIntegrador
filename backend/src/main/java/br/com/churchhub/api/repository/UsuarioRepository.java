package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Usuario;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID>, JpaSpecificationExecutor<Usuario> {

    @EntityGraph(attributePaths = "perfil")
    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = "perfil")
    Page<Usuario> findAll(Specification<Usuario> filtros, Pageable pageable);

    /**
     * Administradores ativos, com as linhas travadas (SELECT ... FOR UPDATE) até o fim da transação.
     * Duas operações que poderiam deixar o sistema sem Administrador (ex.: dois administradores
     * desativando um ao outro ao mesmo tempo) passam a acontecer uma depois da outra, e a segunda
     * já enxerga o resultado da primeira.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM Usuario u WHERE u.ativo = true AND u.perfil.nome = 'ADMINISTRADOR'")
    List<Usuario> travarAdministradoresAtivos();
}
