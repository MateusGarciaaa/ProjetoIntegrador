public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password) {}