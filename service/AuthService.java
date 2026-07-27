@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailSender mailSender;

    @Value("${app.jwt.reset-token-expiration-minutes}")
    private long resetTokenExpirationMinutes;

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

    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        usuarioRepository.findByEmail(request.email()).ifPresent(usuario -> {
            PasswordResetToken resetToken = new PasswordResetToken();
            resetToken.setToken(UUID.randomUUID().toString());
            resetToken.setUsuario(usuario);
            resetToken.setExpiraEm(LocalDateTime.now().plusMinutes(resetTokenExpirationMinutes));
            resetTokenRepository.save(resetToken);

            mailSender.sendPasswordResetEmail(usuario.getEmail(), resetToken.getToken());
        });

        // Resposta genérica sempre - não confirma nem nega existência do e-mail (07-API.md)
        return new ForgotPasswordResponse(
                "Se o e-mail existir em nossa base, um link de redefinição foi enviado.");
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = resetTokenRepository.findByToken(request.token())
                .filter(t -> !t.isUsado())
                .filter(t -> t.getExpiraEm().isAfter(LocalDateTime.now()))
                .orElseThrow(InvalidOrExpiredResetTokenException::new);

        Usuario usuario = resetToken.getUsuario();
        usuario.setSenha(passwordEncoder.encode(request.newPassword()));
        usuarioRepository.save(usuario);

        resetToken.setUsado(true);
        resetTokenRepository.save(resetToken);
    }
}