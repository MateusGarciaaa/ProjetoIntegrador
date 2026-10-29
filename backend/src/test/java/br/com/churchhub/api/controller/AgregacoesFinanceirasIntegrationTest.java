package br.com.churchhub.api.controller;

import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.repository.CategoriaFinanceiraRepository;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Somas do Financeiro no banco real (GROUP BY): summary, série por dia e por mês e totais por
 * categoria, com os mesmos filtros da listagem, cada uma numa consulta só.
 * Datas em 2098 para não se misturar com a demonstração nem com MovimentacaoFinanceiraIntegrationTest.
 *
 * Lançamentos: dízimo 100,00 e 50,25 (05/01), oferta 30,00 e energia 80,00 (20/01),
 * energia 10,10 (03/02) e dízimo 200,00 (28/02).
 */
@SpringBootTest(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@AutoConfigureMockMvc
class AgregacoesFinanceirasIntegrationTest {

    private static final String RESUMO = "/api/v1/financial/summary";
    private static final String SERIE = RESUMO + "/series";
    private static final String POR_CATEGORIA = RESUMO + "/categories";
    private static final String INICIO = "2098-01-01";
    private static final String FIM = "2098-02-28";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private MovimentacaoFinanceiraRepository movimentacaoRepository;
    @Autowired
    private CategoriaFinanceiraRepository categoriaRepository;
    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private final List<MovimentacaoFinanceira> movimentacoes = new ArrayList<>();
    private final List<CategoriaFinanceira> categorias = new ArrayList<>();
    private CategoriaFinanceira dizimos;
    private CategoriaFinanceira ofertas;
    private CategoriaFinanceira energia;

    @BeforeEach
    void criarDados() {
        String sufixo = " " + UUID.randomUUID();
        dizimos = categoria("A Dízimos" + sufixo, TipoMovimentacao.RECEITA);
        ofertas = categoria("B Ofertas" + sufixo, TipoMovimentacao.RECEITA);
        energia = categoria("C Energia" + sufixo, TipoMovimentacao.DESPESA);

        lancar(dizimos, "100.00", "2098-01-05");
        lancar(dizimos, "50.25", "2098-01-05");
        lancar(ofertas, "30.00", "2098-01-20");
        lancar(energia, "80.00", "2098-01-20");
        lancar(energia, "10.10", "2098-02-03");
        lancar(dizimos, "200.00", "2098-02-28");
    }

    @AfterEach
    void apagarDados() {
        movimentacaoRepository.deleteAll(movimentacoes);
        categoriaRepository.deleteAll(categorias);
    }

    @Test
    void summarySomaOPeriodoComOsFiltros() throws Exception {
        consultar(get(RESUMO).param("dataInicio", INICIO).param("dataFim", FIM))
                .andExpect(jsonPath("$.totalReceitas").value(380.25))
                .andExpect(jsonPath("$.totalDespesas").value(90.10))
                .andExpect(jsonPath("$.saldo").value(290.15));

        consultar(get(RESUMO).param("dataInicio", INICIO).param("dataFim", FIM).param("tipo", "DESPESA"))
                .andExpect(jsonPath("$.totalReceitas").value(0))
                .andExpect(jsonPath("$.totalDespesas").value(90.10))
                .andExpect(jsonPath("$.saldo").value(-90.10));

        consultar(get(RESUMO).param("dataInicio", INICIO).param("dataFim", FIM)
                .param("categoriaId", dizimos.getId().toString()))
                .andExpect(jsonPath("$.totalReceitas").value(350.25))
                .andExpect(jsonPath("$.totalDespesas").value(0));
    }

    @Test
    void seriePorDiaTrazSoOsDiasComLancamento() throws Exception {
        consultar(get(SERIE).param("dataInicio", INICIO).param("dataFim", FIM).param("agrupamento", "DIA"))
                .andExpect(jsonPath("$", hasSize(4)))
                .andExpect(jsonPath("$[0].periodo").value("2098-01-05"))
                .andExpect(jsonPath("$[0].totalReceitas").value(150.25))
                .andExpect(jsonPath("$[0].totalDespesas").value(0))
                .andExpect(jsonPath("$[1].periodo").value("2098-01-20"))
                .andExpect(jsonPath("$[1].totalReceitas").value(30.00))
                .andExpect(jsonPath("$[1].totalDespesas").value(80.00))
                .andExpect(jsonPath("$[1].saldo").value(-50.00))
                .andExpect(jsonPath("$[2].periodo").value("2098-02-03"))
                .andExpect(jsonPath("$[3].periodo").value("2098-02-28"))
                .andExpect(jsonPath("$[3].totalReceitas").value(200.00));
    }

    @Test
    void seriePorMesAtravessaOsMeses() throws Exception {
        consultar(get(SERIE).param("dataInicio", INICIO).param("dataFim", FIM).param("agrupamento", "MES"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].periodo").value("2098-01-01"))
                .andExpect(jsonPath("$[0].totalReceitas").value(180.25))
                .andExpect(jsonPath("$[0].totalDespesas").value(80.00))
                .andExpect(jsonPath("$[0].saldo").value(100.25))
                .andExpect(jsonPath("$[1].periodo").value("2098-02-01"))
                .andExpect(jsonPath("$[1].totalReceitas").value(200.00))
                .andExpect(jsonPath("$[1].totalDespesas").value(10.10));

        consultar(get(SERIE).param("dataInicio", INICIO).param("dataFim", FIM).param("agrupamento", "MES")
                .param("categoriaId", energia.getId().toString()))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].totalReceitas").value(0))
                .andExpect(jsonPath("$[0].totalDespesas").value(80.00))
                .andExpect(jsonPath("$[1].totalDespesas").value(10.10));

        consultar(get(SERIE).param("dataInicio", "2098-02-01").param("dataFim", FIM).param("agrupamento", "MES")
                .param("tipo", "RECEITA"))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].periodo").value("2098-02-01"))
                .andExpect(jsonPath("$[0].totalReceitas").value(200.00))
                .andExpect(jsonPath("$[0].totalDespesas").value(0));
    }

    @Test
    void totaisPorCategoriaDoMaiorParaOMenor() throws Exception {
        consultar(get(POR_CATEGORIA).param("dataInicio", INICIO).param("dataFim", FIM))
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[0].categoria.id").value(dizimos.getId().toString()))
                .andExpect(jsonPath("$[0].categoria.tipo").value("RECEITA"))
                .andExpect(jsonPath("$[0].total").value(350.25))
                .andExpect(jsonPath("$[0].quantidade").value(3))
                .andExpect(jsonPath("$[1].categoria.id").value(energia.getId().toString()))
                .andExpect(jsonPath("$[1].total").value(90.10))
                .andExpect(jsonPath("$[1].quantidade").value(2))
                .andExpect(jsonPath("$[2].categoria.nome").value(ofertas.getNome()))
                .andExpect(jsonPath("$[2].total").value(30.00));

        consultar(get(POR_CATEGORIA).param("dataInicio", INICIO).param("dataFim", "2098-01-31").param("tipo", "RECEITA"))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].total").value(150.25))
                .andExpect(jsonPath("$[1].total").value(30.00));
    }

    @Test
    void periodoSemLancamentoDevolveZerosEListasVazias() throws Exception {
        consultar(get(RESUMO).param("dataInicio", "2098-06-01").param("dataFim", "2098-06-30"))
                .andExpect(jsonPath("$.totalReceitas").value(0))
                .andExpect(jsonPath("$.totalDespesas").value(0))
                .andExpect(jsonPath("$.saldo").value(0));
        consultar(get(SERIE).param("dataInicio", "2098-06-01").param("dataFim", "2098-06-30").param("agrupamento", "DIA"))
                .andExpect(jsonPath("$", hasSize(0)));
        consultar(get(POR_CATEGORIA).param("dataInicio", "2098-06-01").param("dataFim", "2098-06-30"))
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void periodoInvertidoRecebe400() throws Exception {
        for (String rota : List.of(RESUMO, SERIE, POR_CATEGORIA)) {
            mockMvc.perform(get(rota).param("dataInicio", FIM).param("dataFim", INICIO).param("agrupamento", "MES")
                            .with(user("tesoureiro@churchhub.local").roles("TESOUREIRO")))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("A data inicial não pode ser posterior à data final"));
        }
    }

    /** Cada agregação é uma consulta só, qualquer que seja o número de lançamentos. */
    private ResultActions consultar(MockHttpServletRequestBuilder requisicao) throws Exception {
        Statistics estatisticas = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        estatisticas.clear();
        ResultActions resultado = mockMvc.perform(requisicao.with(user("pastor@churchhub.local").roles("PASTOR")))
                .andExpect(status().isOk());
        assertThat(estatisticas.getPrepareStatementCount()).isEqualTo(1);
        return resultado;
    }

    private CategoriaFinanceira categoria(String nome, TipoMovimentacao tipo) {
        CategoriaFinanceira categoria = new CategoriaFinanceira();
        categoria.setNome(nome);
        categoria.setTipo(tipo);
        categoria = categoriaRepository.save(categoria);
        categorias.add(categoria);
        return categoria;
    }

    private void lancar(CategoriaFinanceira categoria, String valor, String data) {
        MovimentacaoFinanceira movimentacao = new MovimentacaoFinanceira();
        movimentacao.setDescricao("Agregação " + categoria.getNome());
        movimentacao.setValor(new BigDecimal(valor));
        movimentacao.setData(LocalDate.parse(data));
        movimentacao.setTipo(categoria.getTipo());
        movimentacao.setCategoria(categoria);
        movimentacoes.add(movimentacaoRepository.save(movimentacao));
    }
}
