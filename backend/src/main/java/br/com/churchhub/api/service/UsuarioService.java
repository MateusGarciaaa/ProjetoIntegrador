package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.util.NormalizadorEmail;
import br.com.churchhub.api.validation.SenhaBcrypt;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de cadastro de usuários do sistema. Hoje atende a carga inicial; é a base
 * para o futuro cadastro de usuários pelo administrador (RN02).
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PerfilRepository perfilRepository;
    private final PasswordEncoder passwordEncoder;

    public boolean existeAlgumUsuario() {
        return usuarioRepository.count() > 0;
    }

    /**
     * Cria o usuário apenas se o e-mail ainda não estiver cadastrado.
     *
     * @return {@code true} se criou; {@code false} se já existia
     */
    @Transactional
    public boolean criarSeNaoExistir(String nome, String email, String senha, NomePerfil nomePerfil) {
        if (!SenhaBcrypt.cabe(senha)) {
            throw new IllegalArgumentException(
                    "A senha deve ter no máximo %d bytes em UTF-8 (limite do BCrypt).".formatted(SenhaBcrypt.MAX_BYTES));
        }
        String emailNormalizado = NormalizadorEmail.normalizar(email);
        if (usuarioRepository.existsByEmail(emailNormalizado)) {
            return false;
        }

        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(emailNormalizado);
        usuario.setSenha(passwordEncoder.encode(senha));
        usuario.setPerfil(buscarPerfil(nomePerfil));
        usuarioRepository.save(usuario);
        return true;
    }

    private Perfil buscarPerfil(NomePerfil nomePerfil) {
        return perfilRepository.findByNome(nomePerfil.name())
                .orElseThrow(() -> new IllegalStateException(
                        "Perfil %s não encontrado: confira a migration V1.".formatted(nomePerfil)));
    }
}
