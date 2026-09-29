// controller/EventoController.java
package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.EventoResponse;
import br.com.churchhub.api.service.EventoService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@Tag(name = "Eventos")
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventoController {

    private static final String ROLE_ADMINISTRADOR = "ROLE_ADMINISTRADOR";

    private final EventoService eventoService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO','MEMBRO')")
    public ResponseEntity<Page<EventoResponse>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @PageableDefault(size = 20, sort = "data") Pageable pageable) {
        return ResponseEntity.ok(eventoService.listar(dataInicio, dataFim, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR','SECRETARIO','MEMBRO')")
    public ResponseEntity<EventoResponse> buscarPorId(@PathVariable UUID id) {
        return ResponseEntity.ok(eventoService.buscarPorId(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SECRETARIO')")
    public ResponseEntity<EventoResponse> cadastrar(@Valid @RequestBody EventoRequest request) {
        EventoResponse response = eventoService.cadastrar(request);
        return ResponseEntity.status(201).body(response);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','SECRETARIO')")
    public ResponseEntity<EventoResponse> atualizar(
            @PathVariable UUID id,
            @Valid @RequestBody EventoRequest request,
            Authentication authentication) {
        boolean isAdministrador = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(ROLE_ADMINISTRADOR));
        return ResponseEntity.ok(eventoService.atualizar(id, request, isAdministrador));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        eventoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}