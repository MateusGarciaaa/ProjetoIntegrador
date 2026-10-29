package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.CategoriaFinanceiraRequest;
import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.repository.MembroRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static java.time.temporal.TemporalAdjusters.next;

/**
 * Popula o banco com dados fictícios para apresentações (DEMO_DATA_ENABLED=true).
 *
 * <p>Passa pelos mesmos serviços usados pela API, então os dados respeitam as regras
 * de negócio. É idempotente: contas só são criadas se o e-mail não existir e o restante
 * só é carregado com a tabela de membros vazia. As datas são relativas ao dia da carga,
 * para o dashboard ter próximos eventos, aniversariantes e movimentação no mês.</p>
 *
 * <p>As senhas das contas são públicas: nunca habilite com dados reais de uma igreja.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DadosDemonstracaoService {

    private static final int QUANTIDADE_ANIVERSARIANTES_DO_MES = 3;
    /**
     * Só os últimos da lista ficam com a data de cadastro da carga (aparecem em "Novos membros"); os
     * demais fazem o papel de membros cadastrados antes da V7, com criado_em NULL.
     */
    private static final int QUANTIDADE_NOVOS_MEMBROS = 3;

    private final UsuarioService usuarioService;
    private final MembroService membroService;
    private final MembroRepository membroRepository;
    private final EventoService eventoService;
    private final CategoriaFinanceiraService categoriaService;
    private final MovimentacaoFinanceiraService movimentacaoService;
    /** O "hoje" da carga no fuso da igreja: próximos eventos e mês atual batem com o dashboard. */
    private final Clock clock;

    @Transactional
    public void carregar(String senhaDasContas) {
        int contasCriadas = criarContas(senhaDasContas);
        if (membroRepository.count() > 0) {
            log.info("Demonstração: {} conta(s) criada(s); já existem membros, demais dados mantidos.", contasCriadas);
            return;
        }

        LocalDate hoje = LocalDate.now(clock);
        List<UUID> membros = criarMembros(hoje);
        int eventos = criarEventos(hoje);
        int movimentacoes = criarMovimentacoes(hoje, garantirCategorias(), membros);
        log.info("Demonstração carregada: {} conta(s), {} membros, {} eventos, {} movimentações.",
                contasCriadas, membros.size(), eventos, movimentacoes);
    }

    private int criarContas(String senha) {
        int criadas = 0;
        for (ContaDemo conta : CONTAS) {
            if (usuarioService.criarSeNaoExistir(conta.nome(), conta.email(), senha, conta.perfil())) {
                criadas++;
            }
        }
        return criadas;
    }

    private List<UUID> criarMembros(LocalDate hoje) {
        List<UUID> ids = new ArrayList<>();
        for (int i = 0; i < MEMBROS.size(); i++) {
            boolean aniversariante = i < QUANTIDADE_ANIVERSARIANTES_DO_MES;
            ids.add(membroService.cadastrar(MEMBROS.get(i).paraRequest(hoje, aniversariante)).id());
        }
        membroRepository.apagarDataDeCadastro(ids.subList(0, ids.size() - QUANTIDADE_NOVOS_MEMBROS));
        return ids;
    }

    private int criarEventos(LocalDate hoje) {
        LocalDate domingo = hoje.with(next(DayOfWeek.SUNDAY));
        List<EventoRequest> eventos = List.of(
                evento("Escola Bíblica Dominical", "Classes para crianças, jovens e adultos.", domingo, 9, 0, "Salas de estudo"),
                evento("Culto de celebração", "Culto dominical com Santa Ceia.", domingo, 19, 0, "Templo principal"),
                evento("Reunião de oração", null, hoje.with(next(DayOfWeek.WEDNESDAY)), 20, 0, "Templo principal"),
                evento("Encontro de jovens", "Louvor, palavra e lanche.", hoje.with(next(DayOfWeek.SATURDAY)), 19, 30, "Salão social"),
                evento("Ação social no bairro", "Entrega de cestas básicas às famílias cadastradas.", hoje.plusDays(12), 8, 30, "Praça em frente ao templo"),
                evento("Conferência de famílias", "Dois dias de palestras e louvor.", hoje.plusDays(30), 19, 0, "Templo principal"),
                // Já encerrado: demonstra a RN09 (só o administrador pode editar).
                evento("Culto de ação de graças", "Evento já realizado.", hoje.minusDays(7), 19, 0, "Templo principal"));
        eventos.forEach(eventoService::cadastrar);
        return eventos.size();
    }

    private Map<String, CategoriaFinanceiraResponse> garantirCategorias() {
        Map<String, CategoriaFinanceiraResponse> porNome = new HashMap<>();
        categoriaService.listar(null).forEach(categoria -> porNome.put(categoria.nome(), categoria));
        CATEGORIAS.forEach((nome, tipo) -> porNome.computeIfAbsent(nome,
                n -> categoriaService.cadastrar(new CategoriaFinanceiraRequest(n, tipo))));
        return porNome;
    }

    /** Lança o mesmo conjunto no mês passado (mês fechado) e no mês atual (só até hoje). */
    private int criarMovimentacoes(LocalDate hoje, Map<String, CategoriaFinanceiraResponse> categorias,
                                   List<UUID> membros) {
        YearMonth mesAtual = YearMonth.from(hoje);
        List<LocalDate> referencias = List.of(mesAtual.minusMonths(1).atEndOfMonth(), hoje);
        int total = 0;
        for (LocalDate limite : referencias) {
            for (LancamentoDemo lancamento : LANCAMENTOS_DO_MES) {
                CategoriaFinanceiraResponse categoria = categorias.get(lancamento.categoria());
                UUID membroId = lancamento.indiceMembro() == null ? null : membros.get(lancamento.indiceMembro());
                LocalDate data = limite.withDayOfMonth(Math.min(lancamento.dia(), limite.getDayOfMonth()));
                movimentacaoService.cadastrar(new MovimentacaoFinanceiraRequest(lancamento.descricao(),
                        new BigDecimal(lancamento.valor()), data, categoria.tipo(), categoria.id(), membroId));
                total++;
            }
        }
        return total;
    }

    private static EventoRequest evento(String titulo, String descricao, LocalDate data,
                                        int hora, int minuto, String local) {
        return new EventoRequest(titulo, descricao, data, LocalTime.of(hora, minuto), local);
    }

    // ------------------------------------------------------------------ dados

    private record ContaDemo(String nome, String email, NomePerfil perfil) {
    }

    /** Mesmas contas do modo simulado do frontend (services/mock/contasDemo.js). */
    private static final List<ContaDemo> CONTAS = List.of(
            new ContaDemo("Helena Duarte", "administrador@churchhub.local", NomePerfil.ADMINISTRADOR),
            new ContaDemo("Marcos Tavares", "secretario@churchhub.local", NomePerfil.SECRETARIO),
            new ContaDemo("Samuel Ribeiro", "pastor@churchhub.local", NomePerfil.PASTOR),
            new ContaDemo("Débora Lins", "tesoureiro@churchhub.local", NomePerfil.TESOUREIRO),
            new ContaDemo("Tiago Moreira", "membro@churchhub.local", NomePerfil.MEMBRO));

    private record MembroDemo(String nome, String cpf, String email, String telefone, String endereco,
                              String nascimento, String conversao, String batismo, StatusMembro status) {

        MembroRequest paraRequest(LocalDate hoje, boolean aniversarianteDoMes) {
            LocalDate dataNascimento = data(nascimento);
            if (aniversarianteDoMes) {
                dataNascimento = noMesmoMesDe(dataNascimento, hoje);
            }
            return new MembroRequest(nome, cpf, email, telefone, endereco,
                    dataNascimento, data(batismo), data(conversao), status);
        }

        private static LocalDate data(String iso) {
            return iso == null ? null : LocalDate.parse(iso);
        }

        private static LocalDate noMesmoMesDe(LocalDate nascimento, LocalDate hoje) {
            YearMonth mes = YearMonth.of(nascimento.getYear(), hoje.getMonth());
            return mes.atDay(Math.min(nascimento.getDayOfMonth(), mes.lengthOfMonth()));
        }
    }

    /** Mesmos membros do modo simulado do frontend (services/mock/dadosIniciais.js). */
    private static final List<MembroDemo> MEMBROS = List.of(
            new MembroDemo("Ana Beatriz Carvalho", "52998224725", "ana.carvalho@email.com", "45999120341", "Rua Paraná, 1200 - Centro, Cascavel/PR", "1988-03-14", "2004-06-20", "2005-01-09", StatusMembro.ATIVO),
            new MembroDemo("André Luiz Fontana", "11144477735", "andre.fontana@email.com", "45998230112", "Av. Brasil, 5430 - Centro, Cascavel/PR", "1979-11-02", "1999-08-15", "2000-02-27", StatusMembro.ATIVO),
            new MembroDemo("Bruna Kessler", "24843807397", "bruna.kessler@email.com", "4532241876", "Rua Souza Naves, 88 - Country, Cascavel/PR", "1995-07-23", null, null, StatusMembro.VISITANTE),
            new MembroDemo("Caio Henrique Mendes", "39053344705", "caio.mendes@email.com", "45991874520", null, "2001-01-30", "2018-04-01", "2018-11-18", StatusMembro.ATIVO),
            new MembroDemo("Camila Rocha Prado", "15350946056", "camila.prado@email.com", "45988012233", "Rua Recife, 310 - Neva, Cascavel/PR", "1990-09-05", "2010-03-12", "2010-12-05", StatusMembro.AFASTADO),
            new MembroDemo("Daniel Schmitt", "93541134780", "daniel.schmitt@email.com", null, "Rua Minas Gerais, 77 - Cancelli, Cascavel/PR", "1984-12-19", "2002-05-26", "2003-07-13", StatusMembro.ATIVO),
            new MembroDemo("Eduarda Nogueira", "07185294649", "eduarda.nogueira@email.com", "45999553017", "Rua Carlos Gomes, 2150 - Centro, Cascavel/PR", "1999-04-11", "2015-09-06", "2016-03-20", StatusMembro.ATIVO),
            new MembroDemo("Elias Bortolini", "28674190340", "elias.bortolini@email.com", "45984442210", null, "1967-06-28", "1985-01-13", "1985-10-06", StatusMembro.ATIVO),
            new MembroDemo("Fernanda Luz Almeida", "60411582089", "fernanda.almeida@email.com", "45991002287", "Rua Rio de Janeiro, 945 - Centro, Cascavel/PR", "1993-02-17", null, null, StatusMembro.VISITANTE),
            new MembroDemo("Gabriel Antunes", "81732655936", "gabriel.antunes@email.com", "45987761134", "Rua Pernambuco, 1502 - Alto Alegre, Cascavel/PR", "2003-10-08", "2019-12-15", null, StatusMembro.ATIVO),
            new MembroDemo("Heloísa Martins", "46209371850", "heloisa.martins@email.com", "4532256641", "Rua Manaus, 430 - Canadá, Cascavel/PR", "1975-05-21", "1993-07-18", "1994-01-30", StatusMembro.AFASTADO),
            new MembroDemo("Igor Vasconcelos", "73925016406", "igor.vasconcelos@email.com", "45998870093", null, "1998-08-14", "2016-02-07", "2016-08-21", StatusMembro.ATIVO),
            new MembroDemo("Isadora Pacheco", "38561704217", "isadora.pacheco@email.com", "45999014488", "Rua Uruguai, 610 - Pioneiros Catarinenses, Cascavel/PR", "2005-12-01", null, null, StatusMembro.VISITANTE),
            new MembroDemo("João Pedro Zanella", "92047138523", "joao.zanella@email.com", "45984120976", "Av. Tancredo Neves, 3120 - Alto Alegre, Cascavel/PR", "1982-03-09", "2000-10-22", "2001-04-15", StatusMembro.ATIVO),
            new MembroDemo("Juliana Ferraz", "14682957309", "juliana.ferraz@email.com", "45991337620", "Rua Fortaleza, 225 - Periollo, Cascavel/PR", "1991-06-26", "2009-11-01", "2010-05-23", StatusMembro.ATIVO),
            new MembroDemo("Lucas Moraes Teixeira", "57390421860", "lucas.teixeira@email.com", null, null, "1996-01-12", "2013-08-18", "2014-02-09", StatusMembro.AFASTADO),
            new MembroDemo("Luíza Bernardes", "20835769186", "luiza.bernardes@email.com", "45988456710", "Rua Salgado Filho, 1777 - Centro, Cascavel/PR", "1986-10-30", "2003-04-27", "2003-12-14", StatusMembro.ATIVO),
            new MembroDemo("Mateus Oliveira Cruz", "69418305224", "mateus.cruz@email.com", "45999781203", "Rua Jorge Lacerda, 540 - Centro, Cascavel/PR", "1973-09-16", "1990-06-03", "1991-02-17", StatusMembro.ATIVO),
            new MembroDemo("Natália Guedes", "35172684026", "natalia.guedes@email.com", "45987220345", "Rua Belém, 98 - Coqueiral, Cascavel/PR", "2000-11-25", "2017-05-14", "2017-10-29", StatusMembro.ATIVO),
            new MembroDemo("Otávio Pereira", "81264537964", "otavio.pereira@email.com", "4530371190", null, "1962-02-04", "1980-09-21", "1981-03-08", StatusMembro.AFASTADO),
            new MembroDemo("Priscila Andrade", "46709213552", "priscila.andrade@email.com", "45991648832", "Rua Castro Alves, 1340 - Centro, Cascavel/PR", "1989-07-07", "2007-01-28", "2007-08-19", StatusMembro.ATIVO),
            new MembroDemo("Rafael Siqueira", "23958147682", "rafael.siqueira@email.com", "45998005521", "Rua Maranhão, 2201 - Santa Cruz, Cascavel/PR", "1994-04-19", null, null, StatusMembro.VISITANTE),
            new MembroDemo("Sabrina Toledo", "70531826490", "sabrina.toledo@email.com", "45984991067", "Rua Goiás, 815 - Maria Luiza, Cascavel/PR", "1981-08-03", "1998-03-15", "1998-11-01", StatusMembro.ATIVO),
            new MembroDemo("Thiago Lemos", "18407692549", "thiago.lemos@email.com", "45999360754", null, "1997-12-22", "2014-10-12", "2015-04-26", StatusMembro.ATIVO),
            new MembroDemo("Vitória Campos Reis", "95820361768", "vitoria.reis@email.com", "45988674419", "Rua Rui Barbosa, 460 - Centro, Cascavel/PR", "2002-05-09", "2020-07-05", "2021-01-17", StatusMembro.ATIVO));

    private static final Map<String, TipoMovimentacao> CATEGORIAS = Map.of(
            "Dízimos", TipoMovimentacao.RECEITA,
            "Ofertas", TipoMovimentacao.RECEITA,
            "Eventos", TipoMovimentacao.RECEITA,
            "Água e energia", TipoMovimentacao.DESPESA,
            "Manutenção", TipoMovimentacao.DESPESA,
            "Ação social", TipoMovimentacao.DESPESA);

    private record LancamentoDemo(String descricao, String valor, int dia, String categoria, Integer indiceMembro) {
    }

    private static final List<LancamentoDemo> LANCAMENTOS_DO_MES = List.of(
            new LancamentoDemo("Dízimo", "450.00", 2, "Dízimos", 0),
            new LancamentoDemo("Dízimo", "320.00", 3, "Dízimos", 1),
            new LancamentoDemo("Dízimo", "600.00", 5, "Dízimos", 13),
            new LancamentoDemo("Dízimo", "275.50", 6, "Dízimos", 17),
            new LancamentoDemo("Oferta do culto de domingo", "812.40", 7, "Ofertas", null),
            new LancamentoDemo("Oferta missionária", "390.00", 14, "Ofertas", null),
            new LancamentoDemo("Jantar beneficente", "1250.00", 10, "Eventos", null),
            new LancamentoDemo("Conta de energia elétrica", "486.32", 8, "Água e energia", null),
            new LancamentoDemo("Conta de água", "142.18", 8, "Água e energia", null),
            new LancamentoDemo("Reparo no telhado do salão", "980.00", 12, "Manutenção", null),
            new LancamentoDemo("Cestas básicas", "720.00", 15, "Ação social", null));
}
