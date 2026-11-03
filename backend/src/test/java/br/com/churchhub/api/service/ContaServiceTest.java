package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.AlterarSenhaRequest;
import br.com.churchhub.api.dto.LoginResponse;
import br.com.churchhub.api.dto.MeResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.BusinessException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContaServiceTest {

    private static final UUID ID = UUID.randomUUID();
    private static final Instant AGORA = Instant.parse("2026-10-28T13:00:00.750Z");

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordResetTokenRepository resetTokenRepository;
    @Mock
    private JwtService jwtService;
    @Mock
    private Auditoria auditoria;

    /** BCrypt real (custo baixo): o teste confere a comparação de verdade, não um mock. */
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private ContaService contaService;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        contaService = new ContaService(usuarioRepository, resetTokenRepository, passwordEncoder, jwtService,
                auditoria, Clock.fixed(AGORA, ZoneId.of("America/Sao_Paulo")));

        Perfil perfil = new Perfil();
        perfil.setNome("TESOUREIRO");
        usuario = new Usuario();
        usuario.setId(ID);
        usuario.setNome("Tânia");
        usuario.setEmail("tesoureiro@churchhub.local");
        usuario.setSenha(passwordEncoder.encode("senhaAtual"));
        usuario.setPerfil(perfil);
        usuario.setSenhaAlteradaEm(Instant.parse("2026-01-01T00:00:00Z"));
    }

    @Test
    void buscaOsProprioDados() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));

        assertThat(contaService.buscar(ID))
                .isEqualTo(new MeResponse(ID, "Tânia", "tesoureiro@churchhub.local", NomePerfil.TESOUREIRO));
    }

    @Test
    void usuarioQueSumiuDaBaseDa404() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> contaService.buscar(ID)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void trocaASenhaRegistraOInstanteEmSegundosEDevolveTokenNovo() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));
        when(jwtService.generateToken(any())).thenReturn("token-novo");
        when(jwtService.getExpirationSeconds()).thenReturn(86400L);

        LoginResponse resposta = contaService.alterarSenha(ID, new AlterarSenhaRequest("senhaAtual", "outraSenha"));

        assertThat(resposta).isEqualTo(new LoginResponse("token-novo", "Bearer", 86400L));
        assertThat(passwordEncoder.matches("outraSenha", usuario.getSenha())).isTrue();
        assertThat(usuario.getSenhaAlteradaEm()).isEqualTo(Instant.parse("2026-10-28T13:00:00Z"));
        verify(usuarioRepository).save(usuario);
        verify(resetTokenRepository).invalidarPendentes(usuario);
        verify(auditoria).registrar(eq(AcaoAuditada.SENHA_ALTERADA),
                eq(new Ator(ID, "tesoureiro@churchhub.local")), eq(usuario), any());
    }

    @Test
    void tokenNovoEhDoProprioUsuarioComPerfilAtual() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));
        when(jwtService.generateToken(any())).thenAnswer(chamada -> {
            UsuarioDetailsImpl detalhes = chamada.getArgument(0);
            assertThat(detalhes.getUsername()).isEqualTo("tesoureiro@churchhub.local");
            assertThat(detalhes.getAuthorities()).extracting("authority").containsExactly("ROLE_TESOUREIRO");
            return "token-novo";
        });

        contaService.alterarSenha(ID, new AlterarSenhaRequest("senhaAtual", "outraSenha"));
    }

    @Test
    void senhaAtualErradaEh400ENadaMuda() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));
        String hashAntes = usuario.getSenha();

        assertThatThrownBy(() -> contaService.alterarSenha(ID, new AlterarSenhaRequest("errada", "outraSenha")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A senha atual está incorreta");
        assertThat(usuario.getSenha()).isEqualTo(hashAntes);
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(jwtService, auditoria, resetTokenRepository);
    }

    @Test
    void novaSenhaIgualAAtualEhRecusada() {
        when(usuarioRepository.findById(ID)).thenReturn(Optional.of(usuario));

        assertThatThrownBy(() -> contaService.alterarSenha(ID, new AlterarSenhaRequest("senhaAtual", "senhaAtual")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("A nova senha deve ser diferente da atual");
        verify(usuarioRepository, never()).save(any());
        verifyNoInteractions(jwtService, auditoria);
    }
}
