package br.com.churchhub.api.exception;

import java.time.LocalDateTime;

public record ApiError(

        LocalDateTime timestamp,

        int status,

        String error,

        String message,

        String path

) {
}