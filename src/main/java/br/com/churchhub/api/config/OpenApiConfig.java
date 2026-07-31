package br.com.churchhub.api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
/**
Isso adiciona o botão "Authorize" no Swagger UI — você faz
login em /api/v1/auth/login, pega o token da resposta, cola lá (só o token, sem Bearer ),
 e todos os endpoints protegidos passam a ser testáveis direto pela interface.
*/
@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI churchhubOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("ChurchHub API")
                        .description("API REST para gestão administrativa, financeira e organizacional de igrejas.")
                        .version("v0.0.1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME,
                                new SecurityScheme()
                                        .name(BEARER_SCHEME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")));
    }
}