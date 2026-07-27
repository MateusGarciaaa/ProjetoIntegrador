public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password) {}

public record LoginResponse(
        String token,
        String type,
        long expiresIn) {}

public record ForgotPasswordRequest(
        @NotBlank @Email String email) {}

public record ForgotPasswordResponse(String message) {}

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6) String newPassword) {}