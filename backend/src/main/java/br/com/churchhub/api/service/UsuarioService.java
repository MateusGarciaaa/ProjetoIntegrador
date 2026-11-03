package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.UsuarioAtualizacaoRequest;
import br.com.churchhub.api.dto.UsuarioCadastroRequest;
import br.com.churchhub.api.dto.UsuarioResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.UsuarioMapper;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioFiltros;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.util.NormalizadorEmail;
import br.com.churchhub.api.validation.SenhaBcrypt;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Usuários do sistema: carga inicial e gestão pelo administrador (RN02).
 *
 * <p>Invariantes da gestão: o administrador não se desativa nem tira de si o perfil de
 * Administrador, e o sistema nunca fica sem nenhum Administrador ativo. As operações que podem
 * remover um Administrador ativo travam antes as linhas dos administradores ativos
 * ({@link UsuarioRepository#travarAdministradoresAtivos()}), então duas delas não correm juntas.</p>
 */
@Service
@RequiredArgsConstructor
public class UsuarioService {

    static final String MENSAGEM_EMAIL_DUPLICADO = "Já existe um usuário com este e-mail";
    static final String MENSAGEM_DESATIVAR_A_SI = "Você não pode desativar a sua própria conta";
    static final String MENSAGEM_REMOVER_PROPRIO_PERFIL =
            "Você não pode remover o seu próprio perfil de Administrador";
    static final String MENSAGEM_ULTIMO_ADMINISTRADOR =
            "O sistema precisa de pelo menos um Administrador ativo: cadastre ou ative outro antes";
    static final String MENSAGEM_CONVITE_INATIVO = "Ative o usuário antes de reenviar o convite";
    static final String MENSAGEM_CONVITE_ACEITO =
            "Este usuário já definiu a senha. Se a esqueceu, ele pode usar \"Esqueci minha senha\" no login";

    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PerfilRepository perfilRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final UsuarioMapper usuarioMapper;
    private final Auditoria auditoria;
    private final Clock clock;

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
        usuario.definirSenha(passwordEncoder.encode(senha), clock);
        usuario.setPerfil(buscarPerfil(nomePerfil));
        usuarioRepository.save(usuario);
        return true;
    }

    // ---------- Gestão pelo administrador (RN02) ----------

    @Transactional(readOnly = true)
    public Page<UsuarioResponse> listar(String nome, NomePerfil perfil, Boolean ativo, Pageable pageable) {
        return usuarioRepository.findAll(UsuarioFiltros.de(nome, perfil, ativo), pageable)
                .map(usuarioMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse buscarPorId(UUID id) {
        return usuarioMapper.toResponse(buscarUsuario(id));
    }

    /**
     * Cadastra sem senha conhecida e envia o convite. A coluna {@code senha} é obrigatória, então
     * recebe o hash de um valor aleatório que ninguém conhece: o login fica impossível até o
     * convite ser aceito, e {@code senhaAlteradaEm} nulo marca o convite como pendente.
     */
    @Transactional
    public UsuarioResponse cadastrar(UsuarioCadastroRequest request, Ator ator) {
        String email = NormalizadorEmail.normalizar(request.email());
        if (usuarioRepository.existsByEmail(email)) {
            throw new ConflictException(MENSAGEM_EMAIL_DUPLICADO);
        }

        Usuario usuario = new Usuario();
        usuario.setNome(request.nome().strip());
        usuario.setEmail(email);
        usuario.setSenha(passwordEncoder.encode(senhaInutilizavel()));
        usuario.setPerfil(buscarPerfil(request.perfil()));
        usuario = usuarioRepository.save(usuario);

        auditoria.registrar(AcaoAuditada.USUARIO_CADASTRADO, ator, usuario, "perfil=" + request.perfil());
        authService.enviarConvite(usuario);
        return usuarioMapper.toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse atualizar(UUID id, UsuarioAtualizacaoRequest request, Ator ator) {
        // Trava antes de ler o alvo: o estado lido do alvo já é o posterior a uma operação concorrente.
        var administradoresAtivos = usuarioRepository.travarAdministradoresAtivos();
        Usuario usuario = buscarUsuario(id);
        NomePerfil perfilAnterior = NomePerfil.valueOf(usuario.getPerfil().getNome());
        NomePerfil perfilNovo = request.perfil();

        if (perfilAnterior == NomePerfil.ADMINISTRADOR && perfilNovo != NomePerfil.ADMINISTRADOR) {
            if (usuario.getId().equals(ator.id())) {
                throw new ConflictException(MENSAGEM_REMOVER_PROPRIO_PERFIL);
            }
            garantirOutroAdministradorAtivo(administradoresAtivos, usuario);
        }

        usuario.setNome(request.nome().strip());
        if (perfilNovo != perfilAnterior) {
            usuario.setPerfil(buscarPerfil(perfilNovo));
        }
        usuario = usuarioRepository.save(usuario);

        if (perfilNovo != perfilAnterior) {
            auditoria.registrar(AcaoAuditada.PERFIL_ALTERADO, ator, usuario,
                    "perfil=%s->%s".formatted(perfilAnterior, perfilNovo));
        }
        return usuarioMapper.toResponse(usuario);
    }

    /** Sem exclusão física. Desativar derruba as sessões abertas e invalida os links pendentes. */
    @Transactional
    public UsuarioResponse desativar(UUID id, Ator ator) {
        if (id.equals(ator.id())) {
            throw new ConflictException(MENSAGEM_DESATIVAR_A_SI);
        }
        var administradoresAtivos = usuarioRepository.travarAdministradoresAtivos();
        Usuario usuario = buscarUsuario(id);
        if (!usuario.isAtivo()) {
            return usuarioMapper.toResponse(usuario);
        }
        if (NomePerfil.ADMINISTRADOR.name().equals(usuario.getPerfil().getNome())) {
            garantirOutroAdministradorAtivo(administradoresAtivos, usuario);
        }

        usuario.setAtivo(false);
        usuario = usuarioRepository.save(usuario);
        // Sem isso, um link pendente voltaria a valer se o usuário fosse reativado.
        resetTokenRepository.invalidarPendentes(usuario);
        auditoria.registrar(AcaoAuditada.USUARIO_DESATIVADO, ator, usuario, "ativo=true->false");
        return usuarioMapper.toResponse(usuario);
    }

    @Transactional
    public UsuarioResponse ativar(UUID id, Ator ator) {
        Usuario usuario = buscarUsuario(id);
        if (usuario.isAtivo()) {
            return usuarioMapper.toResponse(usuario);
        }
        usuario.setAtivo(true);
        usuario = usuarioRepository.save(usuario);
        auditoria.registrar(AcaoAuditada.USUARIO_ATIVADO, ator, usuario, "ativo=false->true");
        return usuarioMapper.toResponse(usuario);
    }

    /** Novo link de convite (o anterior deixa de valer). Só para quem ainda não definiu a senha. */
    @Transactional
    public void reenviarConvite(UUID id, Ator ator) {
        Usuario usuario = buscarUsuario(id);
        if (!usuario.isAtivo()) {
            throw new ConflictException(MENSAGEM_CONVITE_INATIVO);
        }
        if (!usuario.isConvitePendente()) {
            throw new ConflictException(MENSAGEM_CONVITE_ACEITO);
        }
        authService.enviarConvite(usuario);
        auditoria.registrar(AcaoAuditada.CONVITE_REENVIADO, ator, usuario, "validade=" + AuthService.VALIDADE_CONVITE);
    }

    private static void garantirOutroAdministradorAtivo(List<Usuario> administradoresAtivos, Usuario alvo) {
        boolean haOutro = administradoresAtivos.stream().anyMatch(admin -> !admin.getId().equals(alvo.getId()));
        if (!haOutro) {
            throw new ConflictException(MENSAGEM_ULTIMO_ADMINISTRADOR);
        }
    }

    /** 32 bytes aleatórios em Base64 (43 caracteres ASCII): cabem no BCrypt e ninguém os conhece. */
    private static String senhaInutilizavel() {
        byte[] bytes = new byte[32];
        ALEATORIO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Usuario buscarUsuario(UUID id) {
        return usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    private Perfil buscarPerfil(NomePerfil nomePerfil) {
        return perfilRepository.findByNome(nomePerfil.name())
                .orElseThrow(() -> new IllegalStateException(
                        "Perfil %s não encontrado: confira a migration V1.".formatted(nomePerfil)));
    }
}
