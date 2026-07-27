public record ForgotPasswordRequest(
        @NotBlank @Email String email) {}