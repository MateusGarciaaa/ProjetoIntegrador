package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.AlterarSenhaRequest;
import br.com.churchhub.api.dto.LoginResponse;
import br.com.churchhub.api.dto.MeResponse;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import br.com.churchhub.api.service.ContaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "Minha conta", para qualquer usuário autenticado. Fica fora de {@code /auth/**} de propósito:
 * aquelas rotas são públicas, e o frontend não envia o token para elas.
 */
@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final ContaService contaService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MeResponse> buscar(@AuthenticationPrincipal UsuarioDetailsImpl usuario) {
        return ResponseEntity.ok(contaService.buscar(usuario.getId()));
    }

    /** Devolve um token novo: o anterior deixa de valer com a troca (as outras sessões também). */
    @PutMapping("/password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<LoginResponse> alterarSenha(@AuthenticationPrincipal UsuarioDetailsImpl usuario,
                                                      @Valid @RequestBody AlterarSenhaRequest request) {
        return ResponseEntity.ok(contaService.alterarSenha(usuario.getId(), request));
    }
}
