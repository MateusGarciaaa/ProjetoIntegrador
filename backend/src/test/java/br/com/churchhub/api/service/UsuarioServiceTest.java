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
import br.com.churchhub.api.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UsuarioServiceTest {

    private static final Instant AGORA = Instant.parse("2026-10-28T13:00:00.400Z");

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PerfilRepository perfilRepository;
    @Mock
    private PasswordResetTokenRepository resetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthService authService;
    @Mock
    private Auditoria auditoria;

    private UsuarioService usuarioService;

    private Usuario admin;
    private Ator ator;

    @BeforeEach
    void preparar() {
        usuarioService = new UsuarioService(usuarioRepository, perfilRepository, resetTokenRepository,
                passwordEncoder, authService, new UsuarioMapper(), auditoria,
                Clock.fixed(AGORA, ZoneId.of("America/Sao_Paulo")));
        for (NomePerfil nome : NomePerfil.values()) {
            when(perfilRepository.findByNome(nome.name())).thenReturn(Optional.of(perfil(nome)));
        }
        when(usuarioRepository.save(any())).thenAnswer(chamada -> chamada.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenAnswer(chamada -> "hash:" + chamada.getArgument(0));

        admin = usuario("admin@churchhub.local", NomePerfil.ADMINISTRADOR, true);
        ator = new Ator(admin.getId(), admin.getEmail());
    }

    private static Perfil perfil(NomePerfil nome) {
        Perfil perfil = new Perfil();
        perfil.setNome(nome.name());
        return perfil;
    }

    private Usuario usuario(String email, NomePerfil perfil, boolean ativo) {
        Usuario usuario = new Usuario();
        usuario.setId(UUID.randomUUID());
        usuario.setNome("Nome de " + email);
        usuario.setEmail(email);
        usuario.setPerfil(perfil(perfil));
        usuario.setAtivo(ativo);
        usuario.setSenhaAlteradaEm(Instant.parse("2026-01-01T00:00:00Z"));
        when(usuarioRepository.findById(usuario.getId())).thenReturn(Optional.of(usuario));
        return usuario;
    }

    private void administradoresAtivos(Usuario... admins) {
        when(usuarioRepository.travarAdministradoresAtivos()).thenReturn(List.of(admins));
    }

    // ---------- carga inicial ----------

    @Test
    void recusaSenhaQueNaoCabeNoBcryptAntesDeCodificar() {
        assertThatThrownBy(() -> usuarioService.criarSeNaoExistir(
                "Ana", "ana@igreja.org", "é".repeat(37), NomePerfil.ADMINISTRADOR))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("72 bytes");
        verifyNoInteractions(usuarioRepository, passwordEncoder);
    }

    @Test
    void cargaInicialRegistraASenhaComoDefinida() {
        usuarioService.criarSeNaoExistir("Ana", "Ana@Igreja.org", "senha123", NomePerfil.ADMINISTRADOR);

        ArgumentCaptor<Usuario> salvo = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(salvo.capture());
        assertThat(salvo.getValue().getEmail()).isEqualTo("ana@igreja.org");
        assertThat(salvo.getValue().getSenhaAlteradaEm()).isEqualTo(Instant.parse("2026-10-28T13:00:00Z"));
    }

    // ---------- cadastro ----------

    @Test
    void cadastraComEmailNormalizadoSemSenhaConhecidaEEnviaOConvite() {
        UsuarioResponse resposta = usuarioService.cadastrar(
                new UsuarioCadastroRequest("  Paula Lima ", "Paula@Igreja.ORG", NomePerfil.PASTOR), ator);

        ArgumentCaptor<Usuario> salvo = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository).save(salvo.capture());
        Usuario usuario = salvo.getValue();
        assertThat(usuario.getNome()).isEqualTo("Paula Lima");
        assertThat(usuario.getEmail()).isEqualTo("paula@igreja.org");
        assertThat(usuario.getPerfil().getNome()).isEqualTo("PASTOR");
        assertThat(usuario.isAtivo()).isTrue();
        // Hash de 32 bytes aleatórios (43 caracteres em Base64), nunca vazio nem previsível.
        assertThat(usuario.getSenha()).startsWith("hash:").hasSize("hash:".length() + 43);
        assertThat(usuario.isConvitePendente()).isTrue();
        assertThat(resposta.convitePendente()).isTrue();
        assertThat(resposta.perfil()).isEqualTo(NomePerfil.PASTOR);

        verify(authService).enviarConvite(usuario);
        verify(auditoria).registrar(AcaoAuditada.USUARIO_CADASTRADO, ator, usuario, "perfil=PASTOR");
    }

    @Test
    void duasSenhasGeradasNuncaSaoIguais() {
        usuarioService.cadastrar(new UsuarioCadastroRequest("A", "a@igreja.org", NomePerfil.MEMBRO), ator);
        usuarioService.cadastrar(new UsuarioCadastroRequest("B", "b@igreja.org", NomePerfil.MEMBRO), ator);

        ArgumentCaptor<Usuario> salvos = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepository, org.mockito.Mockito.times(2)).save(salvos.capture());
        assertThat(salvos.getAllValues().get(0).getSenha()).isNotEqualTo(salvos.getAllValues().get(1).getSenha());
    }

    @Test
    void emailRepetidoMesmoComMaiusculasEh409() {
        when(usuarioRepository.existsByEmail("pastor@churchhub.local")).thenReturn(true);

        assertThatThrownBy(() -> usuarioService.cadastrar(
                new UsuarioCadastroRequest("Outro", "PASTOR@churchhub.local", NomePerfil.MEMBRO), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Já existe um usuário com este e-mail");
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(authService, auditoria);
    }

    // ---------- edição ----------

    @Test
    void mudaNomeEPerfilERegistraSoAMudancaDePerfil() {
        Usuario secretario = usuario("sec@igreja.org", NomePerfil.SECRETARIO, true);
        administradoresAtivos(admin);

        UsuarioResponse resposta = usuarioService.atualizar(secretario.getId(),
                new UsuarioAtualizacaoRequest("Novo Nome", NomePerfil.TESOUREIRO), ator);

        assertThat(resposta.nome()).isEqualTo("Novo Nome");
        assertThat(resposta.perfil()).isEqualTo(NomePerfil.TESOUREIRO);
        verify(auditoria).registrar(AcaoAuditada.PERFIL_ALTERADO, ator, secretario, "perfil=SECRETARIO->TESOUREIRO");
    }

    @Test
    void mudarSoONomeNaoGeraAuditoria() {
        Usuario secretario = usuario("sec@igreja.org", NomePerfil.SECRETARIO, true);
        administradoresAtivos(admin);

        usuarioService.atualizar(secretario.getId(), new UsuarioAtualizacaoRequest("Outro", NomePerfil.SECRETARIO), ator);

        verifyNoInteractions(auditoria);
    }

    @Test
    void administradorNaoRemoveOProprioPerfil() {
        Usuario outroAdmin = usuario("admin2@igreja.org", NomePerfil.ADMINISTRADOR, true);
        administradoresAtivos(admin, outroAdmin);

        assertThatThrownBy(() -> usuarioService.atualizar(admin.getId(),
                new UsuarioAtualizacaoRequest("Eu", NomePerfil.PASTOR), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Você não pode remover o seu próprio perfil de Administrador");
        assertThat(admin.getPerfil().getNome()).isEqualTo("ADMINISTRADOR");
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void administradorPodeMudarOProprioNome() {
        administradoresAtivos(admin);

        UsuarioResponse resposta = usuarioService.atualizar(admin.getId(),
                new UsuarioAtualizacaoRequest("Novo Nome", NomePerfil.ADMINISTRADOR), ator);

        assertThat(resposta.nome()).isEqualTo("Novo Nome");
    }

    @Test
    void tirarOPerfilDoUnicoOutroAdministradorAtivoEh409() {
        // Cenário da corrida: o ator foi desativado por uma transação concorrente que já terminou;
        // a trava devolve só o alvo como Administrador ativo.
        Usuario outroAdmin = usuario("admin2@igreja.org", NomePerfil.ADMINISTRADOR, true);
        administradoresAtivos(outroAdmin);

        assertThatThrownBy(() -> usuarioService.atualizar(outroAdmin.getId(),
                new UsuarioAtualizacaoRequest("X", NomePerfil.MEMBRO), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessageStartingWith("O sistema precisa de pelo menos um Administrador ativo");
    }

    @Test
    void tiraOPerfilDeOutroAdministradorQuandoSobraUm() {
        Usuario outroAdmin = usuario("admin2@igreja.org", NomePerfil.ADMINISTRADOR, true);
        administradoresAtivos(admin, outroAdmin);

        assertThat(usuarioService.atualizar(outroAdmin.getId(),
                new UsuarioAtualizacaoRequest("X", NomePerfil.PASTOR), ator).perfil()).isEqualTo(NomePerfil.PASTOR);
    }

    @Test
    void travaOsAdministradoresAntesDeLerOAlvo() {
        Usuario outroAdmin = usuario("admin2@igreja.org", NomePerfil.ADMINISTRADOR, true);
        administradoresAtivos(admin, outroAdmin);

        usuarioService.desativar(outroAdmin.getId(), ator);

        InOrder ordem = inOrder(usuarioRepository);
        ordem.verify(usuarioRepository).travarAdministradoresAtivos();
        ordem.verify(usuarioRepository).findById(outroAdmin.getId());
    }

    @Test
    void usuarioInexistenteEh404() {
        UUID id = UUID.randomUUID();
        when(usuarioRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> usuarioService.atualizar(id, new UsuarioAtualizacaoRequest("X", NomePerfil.MEMBRO), ator))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- ativar / desativar ----------

    @Test
    void administradorNaoSeDesativa() {
        assertThatThrownBy(() -> usuarioService.desativar(admin.getId(), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Você não pode desativar a sua própria conta");
        assertThat(admin.isAtivo()).isTrue();
        verify(usuarioRepository, never()).travarAdministradoresAtivos();
    }

    @Test
    void desativarOUltimoOutroAdministradorAtivoEh409() {
        Usuario outroAdmin = usuario("admin2@igreja.org", NomePerfil.ADMINISTRADOR, true);
        administradoresAtivos(outroAdmin);

        assertThatThrownBy(() -> usuarioService.desativar(outroAdmin.getId(), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessageStartingWith("O sistema precisa de pelo menos um Administrador ativo");
        assertThat(outroAdmin.isAtivo()).isTrue();
    }

    @Test
    void desativaInvalidaOsLinksPendentesERegistra() {
        Usuario membro = usuario("membro@igreja.org", NomePerfil.MEMBRO, true);
        administradoresAtivos(admin);

        UsuarioResponse resposta = usuarioService.desativar(membro.getId(), ator);

        assertThat(resposta.ativo()).isFalse();
        verify(resetTokenRepository).invalidarPendentes(membro);
        verify(auditoria).registrar(AcaoAuditada.USUARIO_DESATIVADO, ator, membro, "ativo=true->false");
    }

    @Test
    void desativarQuemJaEstaInativoNaoMudaNadaNemRegistra() {
        Usuario membro = usuario("membro@igreja.org", NomePerfil.MEMBRO, false);
        administradoresAtivos(admin);

        assertThat(usuarioService.desativar(membro.getId(), ator).ativo()).isFalse();
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(auditoria);
    }

    @Test
    void ativaERegistra() {
        Usuario membro = usuario("membro@igreja.org", NomePerfil.MEMBRO, false);

        assertThat(usuarioService.ativar(membro.getId(), ator).ativo()).isTrue();
        verify(auditoria).registrar(AcaoAuditada.USUARIO_ATIVADO, ator, membro, "ativo=false->true");
    }

    // ---------- convite ----------

    @Test
    void reenviaConvitePendente() {
        Usuario convidado = usuario("novo@igreja.org", NomePerfil.MEMBRO, true);
        convidado.setSenhaAlteradaEm(null);

        usuarioService.reenviarConvite(convidado.getId(), ator);

        verify(authService).enviarConvite(convidado);
        verify(auditoria).registrar(eq(AcaoAuditada.CONVITE_REENVIADO), eq(ator), eq(convidado), anyString());
    }

    @Test
    void naoReenviaConviteDeQuemJaDefiniuASenha() {
        Usuario membro = usuario("membro@igreja.org", NomePerfil.MEMBRO, true);

        assertThatThrownBy(() -> usuarioService.reenviarConvite(membro.getId(), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessageStartingWith("Este usuário já definiu a senha");
        verifyNoInteractions(authService);
    }

    @Test
    void naoReenviaConviteDeUsuarioInativo() {
        Usuario convidado = usuario("novo@igreja.org", NomePerfil.MEMBRO, false);
        convidado.setSenhaAlteradaEm(null);

        assertThatThrownBy(() -> usuarioService.reenviarConvite(convidado.getId(), ator))
                .isInstanceOf(ConflictException.class)
                .hasMessage("Ative o usuário antes de reenviar o convite");
        verifyNoInteractions(authService);
    }
}
