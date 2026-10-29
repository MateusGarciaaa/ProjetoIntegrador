package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.repository.CategoriaFinanceiraRepository;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Leitura de movimentações com o banco real e open-in-view desligado (como em produção):
 * categoria e membro precisam chegar na resposta, sem LazyInitializationException (500)
 * e sem uma consulta extra por linha (N+1).
 *
 * Sem @Transactional no teste de propósito: uma transação aberta pelo teste manteria a
 * sessão viva durante a requisição e esconderia o erro. Os dados criados são apagados no fim.
 * Usa datas em 2099 para não se misturar com os dados de demonstração.
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
class MovimentacaoFinanceiraIntegrationTest {

    private static final String RECURSO = "/api/v1/financial";
    private static final LocalDate INICIO = LocalDate.of(2099, 1, 1);
    private static final LocalDate FIM = LocalDate.of(2099, 1, 31);
    private static final int QUANTIDADE = 3;
    /** Página menor que o size: o Spring Data dispensa o COUNT, então basta um SELECT. */
    private static final long CONSULTAS_ESPERADAS = 1;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private MovimentacaoFinanceiraRepository movimentacaoRepository;
    @Autowired
    private CategoriaFinanceiraRepository categoriaRepository;
    @Autowired
    private MembroRepository membroRepository;
    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private final List<MovimentacaoFinanceira> movimentacoes = new ArrayList<>();
    private final List<Membro> membros = new ArrayList<>();
    private CategoriaFinanceira categoria;

    @BeforeEach
    void criarDados() {
        categoria = new CategoriaFinanceira();
        categoria.setNome("Teste integração " + UUID.randomUUID());
        categoria.setTipo(TipoMovimentacao.RECEITA);
        categoria = categoriaRepository.save(categoria);

        for (int i = 0; i < QUANTIDADE; i++) {
            Membro membro = membroRepository.save(novoMembro("Membro integração " + i));
            membros.add(membro);
            movimentacoes.add(movimentacaoRepository.save(novaMovimentacao(i, membro)));
        }
    }

    @AfterEach
    void apagarDados() {
        movimentacaoRepository.deleteAll(movimentacoes);
        membroRepository.deleteAll(membros);
        categoriaRepository.delete(categoria);
    }

    @Test
    void listaComCategoriaEMembroNumaConsultaSo() throws Exception {
        Statistics estatisticas = estatisticas();
        estatisticas.clear();

        mockMvc.perform(get(RECURSO)
                        .param("dataInicio", INICIO.toString())
                        .param("dataFim", FIM.toString())
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(QUANTIDADE))
                .andExpect(jsonPath("$.content[0].categoria.nome").value(categoria.getNome()))
                .andExpect(jsonPath("$.content[0].membroNome").value("Membro integração 0"))
                .andExpect(jsonPath("$.content[2].membroNome").value("Membro integração 2"));

        assertThat(estatisticas.getPrepareStatementCount()).isEqualTo(CONSULTAS_ESPERADAS);
    }

    @Test
    void filtraPorTipoECategoriaNaMesmaConsulta() throws Exception {
        Statistics estatisticas = estatisticas();
        estatisticas.clear();

        mockMvc.perform(get(RECURSO)
                        .param("dataInicio", INICIO.toString())
                        .param("dataFim", FIM.toString())
                        .param("tipo", "RECEITA")
                        .param("categoriaId", categoria.getId().toString())
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(QUANTIDADE))
                .andExpect(jsonPath("$.content[0].categoria.nome").value(categoria.getNome()))
                .andExpect(jsonPath("$.content[0].membroNome").value("Membro integração 0"));
        assertThat(estatisticas.getPrepareStatementCount()).isEqualTo(CONSULTAS_ESPERADAS);

        mockMvc.perform(get(RECURSO)
                        .param("dataInicio", INICIO.toString())
                        .param("dataFim", FIM.toString())
                        .param("tipo", "DESPESA")
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    /** Categoria inexistente é só um filtro sem resultado (200 com página vazia), não 404. */
    @Test
    void categoriaInexistenteDevolvePaginaVazia() throws Exception {
        mockMvc.perform(get(RECURSO)
                        .param("categoriaId", UUID.randomUUID().toString())
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0))
                .andExpect(jsonPath("$.content").isEmpty());
    }

    @Test
    void listaSemFiltroDeDataTambemCarregaOsRelacionamentos() throws Exception {
        mockMvc.perform(get(RECURSO)
                        .param("size", "2000")
                        .param("sort", "data,desc")
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].categoria.nome").value(categoria.getNome()))
                .andExpect(jsonPath("$.content[0].membroNome").exists());
    }

    @Test
    void buscaPorIdComCategoriaEMembro() throws Exception {
        MovimentacaoFinanceira movimentacao = movimentacoes.getFirst();

        mockMvc.perform(get(RECURSO + "/" + movimentacao.getId())
                        .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.categoria.nome").value(categoria.getNome()))
                .andExpect(jsonPath("$.membroId").value(membros.getFirst().getId().toString()))
                .andExpect(jsonPath("$.membroNome").value("Membro integração 0"));
    }

    private Statistics estatisticas() {
        return entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
    }

    private static Membro novoMembro(String nome) {
        Membro membro = new Membro();
        membro.setNome(nome);
        membro.setCpf(digitosAleatorios());
        membro.setEmail("integracao-" + UUID.randomUUID() + "@teste.local");
        membro.setStatus(StatusMembro.ATIVO);
        return membro;
    }

    private MovimentacaoFinanceira novaMovimentacao(int indice, Membro membro) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setDescricao("Dízimo integração " + indice);
        movimentacao.setValor(new BigDecimal("100.00"));
        movimentacao.setData(INICIO.plusDays(indice));
        movimentacao.setTipo(TipoMovimentacao.RECEITA);
        movimentacao.setCategoria(categoria);
        movimentacao.setMembro(membro);
        return movimentacao;
    }

    /** CPF fictício (a entidade só exige 11 caracteres únicos). */
    private static String digitosAleatorios() {
        return String.format("%011d", ThreadLocalRandom.current().nextLong(1L, 99_999_999_999L));
    }
}
