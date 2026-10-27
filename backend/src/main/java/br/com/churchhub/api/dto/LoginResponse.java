package br.com.churchhub.api.dto;

public record LoginResponse(
        String token,
        String type,
        long expiresIn) {}