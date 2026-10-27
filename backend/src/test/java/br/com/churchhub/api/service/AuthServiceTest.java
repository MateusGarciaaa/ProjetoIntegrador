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

import java.time.LocalDateTime;
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
        authService = new AuthService(authenticationManager, usuarioRepository, resetTokenRepository,
                passwordEncoder, jwtService, mailSender, 30);
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
        token.setExpiraEm(LocalDateTime.now().plusMinutes(10));
        when(resetTokenRepository.findByToken("abc")).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> authService.resetPassword(new ResetPasswordRequest("abc", "novaSenha1")))
                .isInstanceOf(InvalidOrExpiredResetTokenException.class);
        verify(passwordEncoder, never()).encode(any());
        verify(usuarioRepository, never()).save(any());
    }
}
