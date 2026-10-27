package br.com.churchhub.api.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.core.PropertyReferenceException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Único ponto que converte exceções em respostas HTTP no formato {@link ApiError}.
 * Também recebe as falhas de autenticação/autorização dos filtros, via SecurityErrorHandler.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // ---------- 400 ----------

    @ExceptionHandler({BusinessException.class, InvalidOrExpiredResetTokenException.class})
    public ResponseEntity<ApiError> handleBusiness(RuntimeException ex, HttpServletRequest request) {
        return responder(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String mensagem = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return responder(HttpStatus.BAD_REQUEST, mensagem, request);
    }

    /** JSON malformado, data em formato errado, valor fora do enum... */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(HttpMessageNotReadableException ex, HttpServletRequest request) {
        return responder(HttpStatus.BAD_REQUEST,
                "Corpo da requisição inválido. Confira o JSON, as datas (AAAA-MM-DD) e os valores permitidos.", request);
    }

    /** Ex.: {id} que não é UUID, data inválida na query string. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return responder(HttpStatus.BAD_REQUEST, "Valor inválido para o parâmetro '%s'.".formatted(ex.getName()), request);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> handleMissingParameter(MissingServletRequestParameterException ex,
                                                           HttpServletRequest request) {
        return responder(HttpStatus.BAD_REQUEST,
                "Parâmetro obrigatório ausente: '%s'.".formatted(ex.getParameterName()), request);
    }

    /** ?sort= com um campo que não existe na entidade. */
    @ExceptionHandler(PropertyReferenceException.class)
    public ResponseEntity<ApiError> handleInvalidSort(PropertyReferenceException ex, HttpServletRequest request) {
        return responder(HttpStatus.BAD_REQUEST,
                "Campo de ordenação inválido: '%s'.".formatted(ex.getPropertyName()), request);
    }

    // ---------- 401 / 403 ----------

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException ex, HttpServletRequest request) {
        return responder(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    /** Token ausente, inválido ou expirado em rota protegida (vem do SecurityErrorHandler). */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return responder(HttpStatus.UNAUTHORIZED, "Sessão inválida ou expirada. Faça login novamente.", request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return responder(HttpStatus.FORBIDDEN, "Você não possui permissão para acessar este recurso.", request);
    }

    // ---------- 404 / 405 / 409 ----------

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return responder(HttpStatus.NOT_FOUND, ex.getMessage(), request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return responder(HttpStatus.NOT_FOUND, "Recurso não encontrado.", request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex,
                                                             HttpServletRequest request) {
        return responder(HttpStatus.METHOD_NOT_ALLOWED,
                "Método %s não suportado neste recurso.".formatted(ex.getMethod()), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> handleConflict(ConflictException ex, HttpServletRequest request) {
        return responder(HttpStatus.CONFLICT, ex.getMessage(), request);
    }

    /** Rede de segurança para constraints do banco (UNIQUE, FK) não verificadas antes no serviço. */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Violação de integridade em {}: {}", request.getRequestURI(), ex.getMostSpecificCause().getMessage());
        return responder(HttpStatus.CONFLICT,
                "A operação conflita com dados já cadastrados ou vinculados a este registro.", request);
    }

    // ---------- 500 ----------

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Erro não tratado em {} {}", request.getMethod(), request.getRequestURI(), ex);
        return responder(HttpStatus.INTERNAL_SERVER_ERROR, "Ocorreu um erro interno no servidor.", request);
    }

    private ResponseEntity<ApiError> responder(HttpStatus status, String mensagem, HttpServletRequest request) {
        ApiError corpo = new ApiError(
                LocalDateTime.now(),
                status.value(),
                status.getReasonPhrase(),
                mensagem,
                request.getRequestURI());
        return ResponseEntity.status(status).body(corpo);
    }
}
