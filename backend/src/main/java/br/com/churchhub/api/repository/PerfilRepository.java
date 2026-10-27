package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Perfil;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PerfilRepository extends JpaRepository<Perfil, UUID> {
}