package br.com.churchhub.api.config;

import br.com.churchhub.api.config.properties.BootstrapProperties;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.service.DadosDemonstracaoService;
import br.com.churchhub.api.service.UsuarioService;
import br.com.churchhub.api.validation.SenhaBcrypt;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Executa depois das migrations do Flyway, na subida da aplicação.
 *
 * <p>Sem isso, um banco recém-criado não tem nenhum usuário e ninguém consegue entrar,
 * já que só o administrador cadastra usuários (RN02). O primeiro administrador vem de
 * variáveis de ambiente, nunca de uma migration: assim a senha não fica no repositório.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CargaInicialRunner implements ApplicationRunner {

    private static final int TAMANHO_MINIMO_SENHA_ADMIN = 8;

    private final BootstrapProperties properties;
    private final UsuarioService usuarioService;
    private final DadosDemonstracaoService dadosDemonstracaoService;

    @Override
    public void run(ApplicationArguments args) {
        criarAdministradorInicial();
        carregarDemonstracao();
        avisarSeNinguemPodeEntrar();
    }

    private void criarAdministradorInicial() {
        if (!properties.hasAdminConfigured()) {
            return;
        }
        if (properties.adminPassword().length() < TAMANHO_MINIMO_SENHA_ADMIN) {
            throw new IllegalStateException(
                    "ADMIN_PASSWORD deve ter pelo menos %d caracteres.".formatted(TAMANHO_MINIMO_SENHA_ADMIN));
        }
        if (!SenhaBcrypt.cabe(properties.adminPassword())) {
            throw new IllegalStateException(
                    "ADMIN_PASSWORD deve ter no máximo %d bytes em UTF-8 (letras acentuadas ocupam 2)."
                            .formatted(SenhaBcrypt.MAX_BYTES));
        }
        boolean criado = usuarioService.criarSeNaoExistir(properties.adminName(), properties.adminEmail(),
                properties.adminPassword(), NomePerfil.ADMINISTRADOR);
        if (criado) {
            log.info("Administrador inicial criado: {}", properties.adminEmail());
        }
    }

    private void carregarDemonstracao() {
        if (!properties.demoDataEnabled()) {
            return;
        }
        log.warn("DEMO_DATA_ENABLED=true: contas de demonstração com senha pública. Não use com dados reais.");
        dadosDemonstracaoService.carregar(properties.demoPassword());
    }

    private void avisarSeNinguemPodeEntrar() {
        if (!usuarioService.existeAlgumUsuario()) {
            log.warn("Nenhum usuário cadastrado: defina ADMIN_EMAIL e ADMIN_PASSWORD "
                    + "(ou DEMO_DATA_ENABLED=true) e reinicie a aplicação.");
        }
    }
}
