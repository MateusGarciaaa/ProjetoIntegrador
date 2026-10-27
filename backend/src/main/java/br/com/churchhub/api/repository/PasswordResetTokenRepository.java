package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByToken(String token);

    List<PasswordResetToken> findByUsuario(Usuario usuario);

    /** Marca como usados todos os tokens ainda não usados do usuário: só o link mais recente vale. */
    @Modifying
    @Query("update PasswordResetToken t set t.usado = true where t.usuario = :usuario and t.usado = false")
    int invalidarPendentes(@Param("usuario") Usuario usuario);
}
