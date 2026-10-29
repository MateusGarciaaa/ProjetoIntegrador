package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.repository.MembroRepository;
import com.jayway.jsonpath.DocumentContext;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * criado_em (V7) com o banco real: a auditoria do JPA grava a hora do Clock da aplicação (aqui
 * fixo em 15/06/2099 12:00, São Paulo — longe de qualquer dado de demonstração) no cadastro e
 * não muda na edição; o dashboard lista os cadastrados nos últimos 30 dias e ignora NULL.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(NovosMembrosIntegrationTest.RelogioFixo.class)
class NovosMembrosIntegrationTest {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final LocalDateTime AGORA = LocalDateTime.of(2099, 6, 15, 12, 0);

    @TestConfiguration
    static class RelogioFixo {
        @Bean
        @Primary
        Clock relogioFixo() {
            return Clock.fixed(AGORA.atZone(SAO_PAULO).toInstant(), SAO_PAULO);
        }
    }

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private MembroRepository membroRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final List<UUID> criados = new ArrayList<>();

    @AfterEach
    void apagarDados() {
        membroRepository.deleteAllById(criados);
    }

    @Test
    void cadastroGravaAHoraDoClockENaoMudaNaEdicao() throws Exception {
        UUID id = cadastrar("Cadastro com data");
        assertThat(membroRepository.findById(id).orElseThrow().getCriadoEm()).isEqualTo(AGORA);

        mockMvc.perform(put("/api/v1/members/" + id)
                        .with(user("secretario@churchhub.local").roles("SECRETARIO"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Cadastro com data (editado)")))
                .andExpect(status().isOk());
        assertThat(membroRepository.findById(id).orElseThrow().getCriadoEm()).isEqualTo(AGORA);
    }

    @Test
    void dashboardListaSoOsCadastradosNosUltimos30Dias() throws Exception {
        UUID hoje = cadastrar("Novo de hoje");
        UUID ha29Dias = cadastrar("Novo de 29 dias");
        UUID ha31Dias = cadastrar("Antigo de 31 dias");
        UUID semData = cadastrar("Anterior à V7");
        definirCriadoEm(ha29Dias, AGORA.minusDays(29));
        definirCriadoEm(ha31Dias, AGORA.minusDays(31));
        definirCriadoEm(semData, null);

        DocumentContext pastor = dashboard("PASTOR");
        assertThat(pastor.read("$.totalNovosMembros", Long.class)).isEqualTo(2);
        assertThat(pastor.read("$.novosMembros[*].id", List.class)).containsExactly(hoje.toString(), ha29Dias.toString());
        assertThat(pastor.read("$.novosMembros[0].criadoEm", String.class)).isEqualTo("2099-06-15T12:00:00");
        assertThat(pastor.read("$.novosMembros[0].status", String.class)).isEqualTo("ATIVO");
        assertThat(pastor.read("$.membrosAtivos", Long.class) + pastor.read("$.membrosAfastados", Long.class)
                + pastor.read("$.membrosVisitantes", Long.class)).isEqualTo(pastor.read("$.totalMembros", Long.class));

        assertThat(dashboard("SECRETARIO").read("$.totalNovosMembros", Long.class)).isEqualTo(2);
        DocumentContext tesoureiro = dashboard("TESOUREIRO");
        assertThat((Object) tesoureiro.read("$.novosMembros")).isNull();
        assertThat((Object) tesoureiro.read("$.membrosAfastados")).isNull();
    }

    @Test
    void membroComCriadoEmNuloNuncaEhNovo() {
        UUID id = cadastrar("Sem data");
        definirCriadoEm(id, null);
        assertThat(membroRepository.findTop10ByCriadoEmGreaterThanEqualOrderByCriadoEmDescNomeAsc(AGORA.minusDays(30)))
                .extracting(Membro::getId)
                .doesNotContain(id);
    }

    private UUID cadastrar(String nome) {
        try {
            String resposta = mockMvc.perform(post("/api/v1/members")
                            .with(user("secretario@churchhub.local").roles("SECRETARIO"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(corpo(nome)))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString();
            UUID id = UUID.fromString(JsonPath.read(resposta, "$.id"));
            criados.add(id);
            return id;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    /** A auditoria sempre grava a hora do cadastro; para datas no passado (ou NULL), só direto no banco. */
    private void definirCriadoEm(UUID id, LocalDateTime criadoEm) {
        jdbcTemplate.update("UPDATE membros SET criado_em = ? WHERE id = ?",
                criadoEm == null ? null : Timestamp.valueOf(criadoEm), id);
    }

    private DocumentContext dashboard(String perfil) throws Exception {
        String resposta = mockMvc.perform(get("/api/v1/dashboard")
                        .with(user(perfil.toLowerCase() + "@churchhub.local").roles(perfil)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.parse(resposta);
    }

    private static String corpo(String nome) {
        String cpf = String.format("%011d", ThreadLocalRandom.current().nextLong(1L, 99_999_999_999L));
        return """
                {"nome":"%s","cpf":"%s","email":"novos-%s@teste.local","status":"%s"}"""
                .formatted(nome, cpf, UUID.randomUUID(), StatusMembro.ATIVO);
    }
}
