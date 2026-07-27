public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {
    Optional<Usuario> findByEmail(String email);
}

public interface PerfilRepository extends JpaRepository<Perfil, UUID> {
}