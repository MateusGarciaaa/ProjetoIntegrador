package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.service.DashboardService;
import br.com.churchhub.api.service.VisibilidadeDashboard;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Qualquer perfil logado abre o dashboard; cada bloco vem preenchido só para quem pode vê-lo
 * no módulo de origem (RN12, {@link VisibilidadeDashboard}) e chega null para os demais.
 */
@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DashboardResponse> obter(Authentication authentication) {
        var autoridades = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        return ResponseEntity.ok(dashboardService.gerar(VisibilidadeDashboard.dasAutoridades(autoridades)));
    }
}
