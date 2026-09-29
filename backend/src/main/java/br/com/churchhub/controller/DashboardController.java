// controller/DashboardController.java
package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.DashboardResponse;
import br.com.churchhub.api.service.DashboardService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private static final String ROLE_ADMINISTRADOR = "ROLE_ADMINISTRADOR";

    private final DashboardService dashboardService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','PASTOR')")
    public ResponseEntity<DashboardResponse> obter(Authentication authentication) {
        boolean incluirDadosFinanceiros = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(ROLE_ADMINISTRADOR));

        return ResponseEntity.ok(dashboardService.gerar(incluirDadosFinanceiros));
    }
}