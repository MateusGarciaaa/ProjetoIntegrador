package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.dto.MembroResumoResponse;
import br.com.churchhub.api.entity.StatusMembro;
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

    /**
     * Ficha completa (CPF, contato, endereço, datas): só quem cuida do rol de membros.
     * Filtros opcionais: nome (contém, ignora maiúsculas) e status (valor inválido → 400).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO')")
    public ResponseEntity<Page<MembroResponse>> listar(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) StatusMembro status,
            @PageableDefault(size = 20, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(membroService.listar(nome, status, pageable));
    }

    /**
     * Busca enxuta (id, nome, status) para escolher um membro em outros módulos, como o
     * membro de um lançamento financeiro. É o único acesso do TESOUREIRO a membros.
     */
    @GetMapping("/lookup")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO','TESOUREIRO')")
    public ResponseEntity<Page<MembroResumoResponse>> buscarResumo(
            @RequestParam(required = false) String nome,
            @RequestParam(required = false) StatusMembro status,
            @PageableDefault(size = MembroService.TAMANHO_MAXIMO_PAGINA_RESUMO) Pageable pageable) {
        return ResponseEntity.ok(membroService.buscarResumo(nome, status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO')")
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