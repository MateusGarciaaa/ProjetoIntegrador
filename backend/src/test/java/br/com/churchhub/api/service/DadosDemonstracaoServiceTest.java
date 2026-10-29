package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.CategoriaFinanceiraRequest;
import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.repository.MembroRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Month;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * As datas da carga de demonstração são relativas ao "hoje" do Clock da aplicação. O instante
 * é 01:30 UTC de 01/11/2026 (domingo em UTC), que em São Paulo ainda é sábado, 31/10, 22:30.
 */
@ExtendWith(MockitoExtension.class)
class DadosDemonstracaoServiceTest {

    private static final Clock SABADO_31_DE_OUTUBRO_EM_SAO_PAULO =
            Clock.fixed(Instant.parse("2026-11-01T01:30:00Z"), ZoneId.of("America/Sao_Paulo"));

    @Mock
    private UsuarioService usuarioService;
    @Mock
    private MembroService membroService;
    @Mock
    private MembroRepository membroRepository;
    @Mock
    private EventoService eventoService;
    @Mock
    private CategoriaFinanceiraService categoriaService;
    @Mock
    private MovimentacaoFinanceiraService movimentacaoService;

    private DadosDemonstracaoService servico;

    @BeforeEach
    void prepararBancoVazio() {
        servico = new DadosDemonstracaoService(usuarioService, membroService, membroRepository, eventoService,
                categoriaService, movimentacaoService, SABADO_31_DE_OUTUBRO_EM_SAO_PAULO);
        when(membroRepository.count()).thenReturn(0L);
        when(membroService.cadastrar(any())).thenAnswer(chamada -> {
            MembroRequest r = chamada.getArgument(0);
            return new MembroResponse(UUID.randomUUID(), r.nome(), r.cpf(), r.email(), r.telefone(), r.endereco(),
                    r.dataNascimento(), r.dataBatismo(), r.dataConversao(), r.status());
        });
        when(categoriaService.listar(null)).thenReturn(List.of());
        when(categoriaService.cadastrar(any())).thenAnswer(chamada -> {
            CategoriaFinanceiraRequest r = chamada.getArgument(0);
            return new CategoriaFinanceiraResponse(UUID.randomUUID(), r.nome(), r.tipo());
        });
    }

    @Test
    void eventosFicamEmVoltaDoHojeDaIgreja() {
        servico.carregar("demo123");

        ArgumentCaptor<EventoRequest> eventos = ArgumentCaptor.forClass(EventoRequest.class);
        verify(eventoService, atLeastOnce()).cadastrar(eventos.capture());
        Map<String, LocalDate> dataPorTitulo = eventos.getAllValues().stream()
                .collect(Collectors.toMap(EventoRequest::titulo, EventoRequest::data));

        // next(SUNDAY) a partir de sábado, 31/10 — com o relógio em UTC seria domingo, 08/11.
        assertThat(dataPorTitulo.get("Culto de celebração")).isEqualTo(LocalDate.of(2026, 11, 1));
        assertThat(dataPorTitulo.get("Culto de ação de graças")).isEqualTo(LocalDate.of(2026, 10, 24));
        assertThat(dataPorTitulo.get("Conferência de famílias")).isEqualTo(LocalDate.of(2026, 11, 30));
    }

    /** Só os 3 últimos membros fictícios contam como "novos"; os demais ficam sem data de cadastro (NULL). */
    @Test
    @SuppressWarnings("unchecked")
    void soOsUltimosMembrosFicamComDataDeCadastro() {
        servico.carregar("demo123");

        ArgumentCaptor<MembroRequest> cadastrados = ArgumentCaptor.forClass(MembroRequest.class);
        verify(membroService, atLeastOnce()).cadastrar(cadastrados.capture());
        ArgumentCaptor<Collection<UUID>> semData = ArgumentCaptor.forClass(Collection.class);
        verify(membroRepository).apagarDataDeCadastro(semData.capture());
        assertThat(semData.getValue()).hasSize(cadastrados.getAllValues().size() - 3).doesNotHaveDuplicates();
    }

    @Test
    void aniversariantesEMovimentacoesUsamOMesAtualDaIgreja() {
        servico.carregar("demo123");

        ArgumentCaptor<MembroRequest> membros = ArgumentCaptor.forClass(MembroRequest.class);
        verify(membroService, atLeastOnce()).cadastrar(membros.capture());
        List<Month> mesesDosTresPrimeiros = membros.getAllValues().stream().limit(3)
                .map(MembroRequest::dataNascimento).filter(Objects::nonNull).map(LocalDate::getMonth).toList();
        assertThat(mesesDosTresPrimeiros).isNotEmpty().containsOnly(Month.OCTOBER);

        ArgumentCaptor<MovimentacaoFinanceiraRequest> lancamentos = ArgumentCaptor.forClass(MovimentacaoFinanceiraRequest.class);
        verify(movimentacaoService, atLeastOnce()).cadastrar(lancamentos.capture());
        assertThat(lancamentos.getAllValues()).extracting(MovimentacaoFinanceiraRequest::data)
                .allSatisfy(data -> assertThat(data).isBetween(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 10, 31)));
    }
}
