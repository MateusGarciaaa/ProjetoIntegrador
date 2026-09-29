// controller/MovimentacaoFinanceiraController.java
package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraResponse;
import br.com.churchhub.api.dto.ResumoFinanceiroResponse;
import br.com.churchhub.api.service.MovimentacaoFinanceiraService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@Tag(name = "Financeiro")
@RestController
@RequestMapping("/api/v1/financial")
@RequiredArgsConstructor
public class MovimentacaoFinanceiraController {

    private final MovimentacaoFinanceiraService movimentacaoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO','PASTOR')")
    public ResponseEntity<Page<MovimentacaoFinanceiraResponse>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @PageableDefault(size = 20, sort = "data") Pageable pageable) {
        return ResponseEntity.ok(movimentacaoService.listar(dataInicio, dataFim, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO','PASTOR')")
    public ResponseEntity<MovimentacaoFinanceiraResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(movimentacaoService.buscarPorId(id));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO','PASTOR')")
    public ResponseEntity<ResumoFinanceiroResponse> resumo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim) {
        return ResponseEntity.ok(movimentacaoService.resumo(dataInicio, dataFim));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO')")
    public ResponseEntity<MovimentacaoFinanceiraResponse> cadastrar(
            @Valid @RequestBody MovimentacaoFinanceiraRequest request) {
        MovimentacaoFinanceiraResponse response = movimentacaoService.cadastrar(request);
        return ResponseEntity.status(201).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO')")
    public ResponseEntity<MovimentacaoFinanceiraResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody MovimentacaoFinanceiraRequest request) {
        return ResponseEntity.ok(movimentacaoService.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        movimentacaoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}