// controller/CategoriaFinanceiraController.java
package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.CategoriaFinanceiraRequest;
import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.service.CategoriaFinanceiraService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Categorias Financeiras")
@RestController
@RequestMapping("/api/v1/financial-categories")
@RequiredArgsConstructor
public class CategoriaFinanceiraController {

    private final CategoriaFinanceiraService categoriaFinanceiraService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO','PASTOR')")
    public ResponseEntity<List<CategoriaFinanceiraResponse>> listar(
            @RequestParam(required = false) TipoMovimentacao tipo) {
        return ResponseEntity.ok(categoriaFinanceiraService.listar(tipo));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','TESOUREIRO')")
    public ResponseEntity<CategoriaFinanceiraResponse> cadastrar(
            @Valid @RequestBody CategoriaFinanceiraRequest request) {
        CategoriaFinanceiraResponse response = categoriaFinanceiraService.cadastrar(request);
        return ResponseEntity.status(201).body(response);
    }
}