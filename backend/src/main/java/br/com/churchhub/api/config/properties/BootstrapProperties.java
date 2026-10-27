package br.com.churchhub.api.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.util.StringUtils;

/**
 * Carga inicial de dados (app.bootstrap.*). Veja o CargaInicialRunner.
 *
 * @param adminName         nome do administrador criado na primeira inicialização
 * @param adminEmail        e-mail do administrador; vazio = não cria
 * @param adminPassword     senha do administrador; vazio = não cria
 * @param demoDataEnabled   carrega contas e dados fictícios para apresentação
 * @param demoPassword      senha (pública) das contas de demonstração
 */
@ConfigurationProperties(prefix = "app.bootstrap")
public record BootstrapProperties(
        @DefaultValue("Administrador") String adminName,
        String adminEmail,
        String adminPassword,
        @DefaultValue("false") boolean demoDataEnabled,
        @DefaultValue("demo123") String demoPassword) {

    public boolean hasAdminConfigured() {
        return StringUtils.hasText(adminEmail) && StringUtils.hasText(adminPassword);
    }
}
