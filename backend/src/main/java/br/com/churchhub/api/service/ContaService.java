package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.AlterarSenhaRequest;
import br.com.churchhub.api.dto.LoginResponse;
import br.com.churchhub.api.dto.MeResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.BusinessException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

/** "Minha conta": dados e troca de senha do próprio usuário autenticado. */
@Service
@RequiredArgsConstructor
public class ContaService {

    static final String MENSAGEM_SENHA_ATUAL_INCORRETA = "A senha atual está incorreta";
    static final String MENSAGEM_SENHA_REPETIDA = "A nova senha deve ser diferente da atual";

    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final Auditoria auditoria;
    private final Clock clock;

    @Transactional(readOnly = true)
    public MeResponse buscar(UUID id) {
        Usuario usuario = buscarUsuario(id);
        return new MeResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(),
                NomePerfil.valueOf(usuario.getPerfil().getNome()));
    }

    /**
     * Troca a senha e devolve um token novo: as sessões abertas (inclusive a atual) caem pelo
     * {@code senhaAlteradaEm}, e a atual continua com o token devolvido.
     *
     * <p>Senha atual errada é 400 (não 401): no frontend, 401 fora do login encerra a sessão.</p>
     */
    @Transactional
    public LoginResponse alterarSenha(UUID id, AlterarSenhaRequest request) {
        Usuario usuario = buscarUsuario(id);
        if (!passwordEncoder.matches(request.currentPassword(), usuario.getSenha())) {
            throw new BusinessException(MENSAGEM_SENHA_ATUAL_INCORRETA);
        }
        if (passwordEncoder.matches(request.newPassword(), usuario.getSenha())) {
            throw new BusinessException(MENSAGEM_SENHA_REPETIDA);
        }

        usuario.definirSenha(passwordEncoder.encode(request.newPassword()), clock);
        usuarioRepository.save(usuario);
        // Um link de redefinição pedido antes deixaria trocar a senha de novo sem a senha atual.
        resetTokenRepository.invalidarPendentes(usuario);

        UsuarioDetailsImpl detalhes = new UsuarioDetailsImpl(usuario);
        auditoria.registrar(AcaoAuditada.SENHA_ALTERADA, Ator.de(detalhes), usuario, "origem=minha-conta");
        return new LoginResponse(jwtService.generateToken(detalhes), "Bearer", jwtService.getExpirationSeconds());
    }

    private Usuario buscarUsuario(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }
}
