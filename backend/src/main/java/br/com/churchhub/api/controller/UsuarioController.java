package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.UsuarioAtualizacaoRequest;
import br.com.churchhub.api.dto.UsuarioCadastroRequest;
import br.com.churchhub.api.dto.UsuarioResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import br.com.churchhub.api.service.Ator;
import br.com.churchhub.api.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Gestão de usuários (RN02): só o ADMINISTRADOR. Sem exclusão física: o usuário é desativado.
 * Cadastro sem senha: o usuário recebe um convite para defini-la.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    /** Filtros opcionais: nome (contém, ignora maiúsculas), perfil e ativo (valor inválido → 400). */
    @GetMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Page<UsuarioResponse>> listar(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) NomePerfil perfil,
            @RequestParam(required = false) Boolean ativo,
            // O id deixa a paginação estável entre homônimos.
            @PageableDefault(size = 20, sort = {"nome", "id"}) Pageable pageable) {
        return ResponseEntity.ok(usuarioService.listar(nome, perfil, ativo, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(usuarioService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> cadastrar(@AuthenticationPrincipal UsuarioDetailsImpl admin,
                                                     @Valid @RequestBody UsuarioCadastroRequest request) {
        return ResponseEntity.status(201).body(usuarioService.cadastrar(request, Ator.de(admin)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> atualizar(@AuthenticationPrincipal UsuarioDetailsImpl admin,
                                                     @PathVariable UUID id,
                                                     @Valid @RequestBody UsuarioAtualizacaoRequest request) {
        return ResponseEntity.ok(usuarioService.atualizar(id, request, Ator.de(admin)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> desativar(@AuthenticationPrincipal UsuarioDetailsImpl admin,
                                                     @PathVariable UUID id) {
        return ResponseEntity.ok(usuarioService.desativar(id, Ator.de(admin)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<UsuarioResponse> ativar(@AuthenticationPrincipal UsuarioDetailsImpl admin,
                                                  @PathVariable UUID id) {
        return ResponseEntity.ok(usuarioService.ativar(id, Ator.de(admin)));
    }

    @PostMapping("/{id}/invite")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> reenviarConvite(@AuthenticationPrincipal UsuarioDetailsImpl admin,
                                                @PathVariable UUID id) {
        usuarioService.reenviarConvite(id, Ator.de(admin));
        return ResponseEntity.noContent().build();
    }
}
