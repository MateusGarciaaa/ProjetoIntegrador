// controller/MembroController.java
package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.service.MembroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class MembroController {

    private final MembroService membroService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO','TESOUREIRO')")
    public ResponseEntity<Page<MembroResponse>> listar(
            @RequestParam(required = false) String nome,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(membroService.listar(nome, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO','TESOUREIRO')")
    public ResponseEntity<MembroResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(membroService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SECRETARIO')")
    public ResponseEntity<MembroResponse> cadastrar(@Valid @RequestBody MembroRequest request) {
        MembroResponse response = membroService.cadastrar(request);
        return ResponseEntity.status(201).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SECRETARIO')")
    public ResponseEntity<MembroResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody MembroRequest request) {
        return ResponseEntity.ok(membroService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        membroService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}