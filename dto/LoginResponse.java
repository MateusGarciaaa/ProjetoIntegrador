public record LoginResponse(
        String token,
        String type,
        long expiresIn) {}