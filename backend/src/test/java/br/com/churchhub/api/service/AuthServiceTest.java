package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.ForgotPasswordRequest;
import br.com.churchhub.api.dto.ForgotPasswordResponse;
import br.com.churchhub.api.dto.ResetPasswordRequest;
import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.InvalidOrExpiredResetTokenException;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    private static final String EMAIL = "pastor@churchhub.local";
    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    /** 27/10/2026, 19:00 em São Paulo (22:00 UTC). */
    private static final Instant INSTANTE = Instant.parse("2026-10-27T22:00:00Z");
    private static final LocalDateTime AGORA = LocalDateTime.of(2026, 10, 27, 19, 0);

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PasswordResetTokenRepository resetTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private MailSender mailSender;

    private AuthService authService;

    @BeforeEach
    void criarServico() {
        authService = servicoNoInstante(INSTANTE);
    }

    private AuthService servicoNoInstante(Instant instante) {
        return new AuthService(authenticationManager, usuarioRepository, resetTokenRepository,
                passwordEncoder, jwtService, mailSender, 30, Clock.fixed(instante, SAO_PAULO));
    }

    private PasswordResetToken tokenQueExpiraEm(LocalDateTime expiraEm) {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("abc");
        token.setUsuario(usuario(true));
        token.setExpiraEm(expiraEm);
        when(resetTokenRepository.findByToken("abc")).thenReturn(Optional.of(token));
        return token;
    }

    private static Usuario usuario(boolean ativo) {
        Usuario usuario = new Usuario();
        usuario.setEmail(EMAIL);
        usuario.setAtivo(ativo);
        return usuario;
    }

    @Test
    void forgotPasswordNormalizaOEmailComoOLogin() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(true)));

        authService.forgotPassword(new ForgotPasswordRequest("  Pastor@ChurchHub.LOCAL "));

        verify(mailSender).sendPasswordResetEmail(any(), anyString());
    }

    @Test
    void novoPedidoInvalidaOsTokensAnterioresAntesDeGerarOutro() {
        Usuario usuario = usuario(true);
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario));

        authService.forgotPassword(new ForgotPasswordRequest(EMAIL));

        InOrder ordem = inOrder(resetTokenRepository, mailSender);
        ordem.verify(resetTokenRepository).invalidarPendentes(usuario);
        ArgumentCaptor<PasswordResetToken> novo = ArgumentCaptor.forClass(PasswordResetToken.class);
        ordem.verify(resetTokenRepository).save(novo.capture());
        ordem.verify(mailSender).sendPasswordResetEmail(EMAIL, novo.getValue().getToken());
        assertThat(novo.getValue().isUsado()).isFalse();
    }

    @Test
    void usuarioInativoNaoRecebeLinkEARespostaEIgualADeEmailInexistente() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(false)));
        when(usuarioRepository.findByEmail("ninguem@churchhub.local")).thenReturn(Optional.empty());

        ForgotPasswordResponse inativo = authService.forgotPassword(new ForgotPasswordRequest(EMAIL));
        ForgotPasswordResponse inexistente = authService.forgotPassword(new ForgotPasswordRequest("ninguem@churchhub.local"));

        assertThat(inativo).isEqualTo(inexistente);
        assertThat(inativo.message()).isEqualTo(AuthService.MENSAGEM_FORGOT_PASSWORD);
        verifyNoInteractions(resetTokenRepository, mailSender);
    }

    @Test
    void tokenDeUsuarioDesativadoDepoisDoPedidoNaoRedefineASenha() {
        PasswordResetToken token = new PasswordResetToken();
        token.setToken("abc");
        token.setUsuario(usuario(false));
        token.setExpiraEm(AGORA.plusMinutes(10));
        when(resetTokenRepository.findByToken("abc")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(new ResetPasswordRequest("abc", "novaSenha1")))
                .isInstanceOf(InvalidOrExpiredResetTokenException.class);
        verify(passwordEncoder, never()).encode(any());
        verify(usuarioRepository, never()).save(any());
    }

    // ---------- validade do link (relógio da aplicação) ----------

    @Test
    void linkVenceTrintaMinutosDepoisDoPedidoNoRelogioDaIgreja() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(true)));

        authService.forgotPassword(new ForgotPasswordRequest(EMAIL));

        ArgumentCaptor<PasswordResetToken> novo = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepository).save(novo.capture());
        assertThat(novo.getValue().getExpiraEm()).isEqualTo(AGORA.plusMinutes(30));
    }

    // ---------- convite (RN02) ----------

    @Test
    void conviteVale72HorasInvalidaOsLinksAnterioresEUsaOEmailDeConvite() {
        Usuario usuario = usuario(true);

        authService.enviarConvite(usuario);

        InOrder ordem = inOrder(resetTokenRepository, mailSender);
        ordem.verify(resetTokenRepository).invalidarPendentes(usuario);
        ArgumentCaptor<PasswordResetToken> novo = ArgumentCaptor.forClass(PasswordResetToken.class);
        ordem.verify(resetTokenRepository).save(novo.capture());
        ordem.verify(mailSender).sendInviteEmail(EMAIL, novo.getValue().getToken());
        assertThat(novo.getValue().getExpiraEm()).isEqualTo(AGORA.plusHours(72));
        verify(mailSender, never()).sendPasswordResetEmail(any(), any());
    }

    @Test
    void conviteNaoMudaOPrazoDaRedefinicao() {
        when(usuarioRepository.findByEmail(EMAIL)).thenReturn(Optional.of(usuario(true)));
        authService.enviarConvite(usuario(true));
        authService.forgotPassword(new ForgotPasswordRequest(EMAIL));

        ArgumentCaptor<PasswordResetToken> links = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepository, org.mockito.Mockito.times(2)).save(links.capture());
        assertThat(links.getAllValues()).extracting(PasswordResetToken::getExpiraEm)
                .containsExactly(AGORA.plusHours(72), AGORA.plusMinutes(30));
    }

    @Test
    void tokenAindaNoPrazoRedefineASenhaEFicaUsado() {
        PasswordResetToken token = tokenQueExpiraEm(AGORA.plusMinutes(1));
        when(passwordEncoder.encode("novaSenha1")).thenReturn("hash");

        authService.resetPassword(new ResetPasswordRequest("abc", "novaSenha1"));

        assertThat(token.getUsuario().getSenha()).isEqualTo("hash");
        assertThat(token.isUsado()).isTrue();
        // Registra a troca (encerra as sessões abertas) e, se era convite, ele deixa de estar pendente.
        assertThat(token.getUsuario().getSenhaAlteradaEm()).isEqualTo(INSTANTE);
        assertThat(token.getUsuario().isConvitePendente()).isFalse();
    }

    @Test
    void noInstanteDoVencimentoOTokenJaNaoVale() {   // isAfter: o próprio instante já está vencido
        tokenQueExpiraEm(AGORA);

        assertThatThrownBy(() -> authService.resetPassword(new ResetPasswordRequest("abc", "novaSenha1")))
                .isInstanceOf(InvalidOrExpiredResetTokenException.class);
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void prazoEMedidoNoFusoDaIgrejaENaoEmUtc() {
        // 01:30 UTC de 28/10 ainda é 27/10, 22:30, em São Paulo: o link que vence às 23:00 continua valendo.
        tokenQueExpiraEm(LocalDateTime.of(2026, 10, 27, 23, 0));

        servicoNoInstante(Instant.parse("2026-10-28T01:30:00Z")).resetPassword(new ResetPasswordRequest("abc", "novaSenha1"));

        verify(usuarioRepository).save(any());
    }
}
