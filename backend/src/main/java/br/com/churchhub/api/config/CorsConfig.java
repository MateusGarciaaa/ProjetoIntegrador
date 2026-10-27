package br.com.churchhub.api.config;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import br.com.churchhub.api.config.properties.CorsProperties;

@Configuration
public class CorsConfig {

    private static final String API_PATH_PATTERN = "/api/**";
    private static final List<String> ALLOWED_METHODS = List.of("GET", "POST", "PUT", "DELETE", "OPTIONS");
    private static final List<String> ALLOWED_HEADERS = List.of("Authorization", "Content-Type");

    private final CorsProperties corsProperties;

    public CorsConfig(CorsProperties corsProperties) {
        this.corsProperties = corsProperties;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration(API_PATH_PATTERN, buildApiCorsConfiguration());
        return source;
    }

    private CorsConfiguration buildApiCorsConfiguration() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(normalizarOrigens(corsProperties.allowedOrigins()));
        configuration.setAllowedMethods(ALLOWED_METHODS);
        configuration.setAllowedHeaders(ALLOWED_HEADERS);
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(corsProperties.maxAge());
        return configuration;
    }

    /**
     * O navegador envia a origem sem barra final ("https://app.vercel.app"). Uma barra
     * digitada a mais na variável de ambiente faria toda chamada ser recusada.
     */
    private static List<String> normalizarOrigens(List<String> origens) {
        return origens.stream()
                .map(String::trim)
                .map(origem -> origem.replaceAll("/+$", ""))
                .filter(origem -> !origem.isEmpty())
                .toList();
    }
}