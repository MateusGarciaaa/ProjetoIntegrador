package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Usuario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    @EntityGraph(attributePaths = "perfil")
    Optional<Usuario> findByEmail(String email);
}