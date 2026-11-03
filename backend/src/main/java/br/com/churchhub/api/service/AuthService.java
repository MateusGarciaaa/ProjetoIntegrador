package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.ForgotPasswordRequest;
import br.com.churchhub.api.dto.ForgotPasswordResponse;
import br.com.churchhub.api.dto.LoginRequest;
import br.com.churchhub.api.dto.LoginResponse;
import br.com.churchhub.api.dto.ResetPasswordRequest;
import br.com.churchhub.api.entity.PasswordResetToken;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.InvalidCredentialsException;
import br.com.churchhub.api.exception.InvalidOrExpiredResetTokenException;
import br.com.churchhub.api.repository.PasswordResetTokenRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import br.com.churchhub.api.util.NormalizadorEmail;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthService {

    static final String MENSAGEM_FORGOT_PASSWORD =
            "Se o e-mail existir em nossa base, um link de redefinição foi enviado.";

    /**
     * Validade do convite: quem é cadastrado pode demorar a abrir o e-mail, ao contrário de quem
     * acabou de pedir a redefinição (30 min, app.jwt.reset-token-expiration-minutes).
     */
    public static final Duration VALIDADE_CONVITE = Duration.ofHours(72);

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailSender mailSender;
    private final long resetTokenExpirationMinutes;
    /** Validade do link de redefinição medida no relógio da aplicação (ClockConfig). */
    private final Clock clock;

    public AuthService(
            AuthenticationManager authenticationManager,
            UsuarioRepository usuarioRepository,
            PasswordResetTokenRepository resetTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            MailSender mailSender,
            @Value("${app.jwt.reset-token-expiration-minutes}") long resetTokenExpirationMinutes,
            Clock clock) {
        this.authenticationManager = authenticationManager;
        this.usuarioRepository = usuarioRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailSender = mailSender;
        this.resetTokenExpirationMinutes = resetTokenExpirationMinutes;
        this.clock = clock;
    }

    public LoginResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );
            UsuarioDetailsImpl userDetails = (UsuarioDetailsImpl) authentication.getPrincipal();
            String token = jwtService.generateToken(userDetails);
            return new LoginResponse(token, "Bearer", jwtService.getExpirationSeconds());

        } catch (AuthenticationException e) {
            throw new InvalidCredentialsException();
        }
    }

    /**
     * A resposta é sempre a mesma: e-mail inexistente, usuário inativo e envio real são
     * indistinguíveis para quem chama (evita enumeração de contas).
     */
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        usuarioRepository.findByEmail(NormalizadorEmail.normalizar(request.email()))
                .filter(Usuario::isAtivo)
                .ifPresent(this::enviarLinkDeRedefinicao);

        return new ForgotPasswordResponse(MENSAGEM_FORGOT_PASSWORD);
    }

    private void enviarLinkDeRedefinicao(Usuario usuario) {
        String token = gerarLink(usuario, Duration.ofMinutes(resetTokenExpirationMinutes));
        mailSender.sendPasswordResetEmail(usuario.getEmail(), token);
    }

    /**
     * Convite de usuário cadastrado pelo administrador (RN02): o mesmo link e a mesma tela da
     * redefinição, com validade de {@link #VALIDADE_CONVITE} (a validade é gravada por token,
     * em {@code expira_em}). Também invalida os links anteriores, inclusive um convite pendente.
     */
    @Transactional
    public void enviarConvite(Usuario usuario) {
        String token = gerarLink(usuario, VALIDADE_CONVITE);
        mailSender.sendInviteEmail(usuario.getEmail(), token);
    }

    /** Só o link mais recente vale: os anteriores ainda pendentes são invalidados antes. */
    private String gerarLink(Usuario usuario, Duration validade) {
        resetTokenRepository.invalidarPendentes(usuario);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(UUID.randomUUID().toString());
        resetToken.setUsuario(usuario);
        resetToken.setExpiraEm(LocalDateTime.now(clock).plus(validade));
        resetTokenRepository.save(resetToken);
        return resetToken.getToken();
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // Usuário desativado depois do pedido também não redefine: o link pendente deixa de valer.
        PasswordResetToken resetToken = resetTokenRepository.findByToken(request.token())
                .filter(t -> !t.isUsado())
                .filter(t -> t.getExpiraEm().isAfter(LocalDateTime.now(clock)))
                .filter(t -> t.getUsuario().isAtivo())
                .orElseThrow(InvalidOrExpiredResetTokenException::new);

        Usuario usuario = resetToken.getUsuario();
        // Encerra as sessões abertas: tokens emitidos antes da troca deixam de valer (JwtService.avaliar).
        usuario.definirSenha(passwordEncoder.encode(request.newPassword()), clock);
        usuarioRepository.save(usuario);

        resetToken.setUsado(true);
        resetTokenRepository.save(resetToken);
    }
}