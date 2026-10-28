package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.MembroResumoResponse;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.MembroMapper;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MembroServiceTest {

    @Mock
    private MembroRepository membroRepository;
    @Mock
    private MembroMapper membroMapper;
    @Mock
    private MovimentacaoFinanceiraRepository movimentacaoRepository;
    @InjectMocks
    private MembroService membroService;

    private final UUID id = UUID.randomUUID();

    @Test
    void naoExcluiMembroComHistoricoFinanceiro() {   // RN14
        when(membroRepository.findById(id)).thenReturn(Optional.of(new Membro()));
        when(movimentacaoRepository.existsByMembroId(id)).thenReturn(true);

        assertThatThrownBy(() -> membroService.excluir(id)).isInstanceOf(ConflictException.class);
        verify(membroRepository, never()).delete(any());
    }

    @Test
    void excluiMembroSemHistoricoFinanceiro() {
        Membro membro = new Membro();
        when(membroRepository.findById(id)).thenReturn(Optional.of(membro));
        when(movimentacaoRepository.existsByMembroId(id)).thenReturn(false);

        membroService.excluir(id);

        verify(membroRepository).delete(membro);
    }

    @Test
    void excluirMembroInexistenteGera404() {
        when(membroRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> membroService.excluir(id)).isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- listagem completa ----------

    @Test
    void listarFiltraPorStatusMantendoPaginacaoEOrdenacaoDoCliente() {
        Pageable pedida = PageRequest.of(2, 10, Sort.by(Sort.Order.desc("email"), Sort.Order.asc("id")));
        when(membroRepository.findByStatus(StatusMembro.VISITANTE, pedida)).thenReturn(Page.empty());

        membroService.listar(null, StatusMembro.VISITANTE, pedida);

        verify(membroRepository).findByStatus(StatusMembro.VISITANTE, pedida);
    }

    @Test
    void listarFiltraPorNomeEStatus() {
        Pageable pedida = PageRequest.of(0, 10, Sort.by("nome"));
        when(membroRepository.findByNomeContainingIgnoreCaseAndStatus("an", StatusMembro.ATIVO, pedida))
                .thenReturn(Page.empty());

        membroService.listar("an", StatusMembro.ATIVO, pedida);

        verify(membroRepository).findByNomeContainingIgnoreCaseAndStatus("an", StatusMembro.ATIVO, pedida);
    }

    @Test
    void listarSoPorNomeQuandoStatusEhNulo() {
        Pageable pedida = PageRequest.of(0, 10);
        when(membroRepository.findByNomeContainingIgnoreCase("an", pedida)).thenReturn(Page.empty());

        membroService.listar("an", null, pedida);

        verify(membroRepository).findByNomeContainingIgnoreCase("an", pedida);
    }

    @Test
    void listarSemFiltrosDevolveAFichaCompletaNaPaginaPedida() {
        Pageable pedida = PageRequest.of(1, 500, Sort.by("cpf"));
        Membro membro = new Membro();
        when(membroRepository.findAll(pedida)).thenReturn(new PageImpl<>(List.of(membro), pedida, 501));
        when(membroMapper.toResponse(membro)).thenReturn(null);

        Page<?> pagina = membroService.listar("  ", null, pedida);

        // Ao contrário do lookup, não limita o tamanho nem troca a ordenação.
        verify(membroRepository).findAll(pedida);
        verify(membroMapper).toResponse(membro);
        verify(membroMapper, never()).toResumo(any());
        assertThat(pagina.getTotalElements()).isEqualTo(501);
    }

    // ---------- busca enxuta (lookup) ----------

    private Pageable paginaPedida() {
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(membroRepository).findAll(captor.capture());
        return captor.getValue();
    }

    @Test
    void resumoLimitaOTamanhoDaPagina() {
        when(membroRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

        membroService.buscarResumo(null, null, PageRequest.of(3, 500));

        Pageable pedida = paginaPedida();
        assertThat(pedida.getPageSize()).isEqualTo(MembroService.TAMANHO_MAXIMO_PAGINA_RESUMO);
        assertThat(pedida.getPageNumber()).isEqualTo(3);
    }

    @Test
    void resumoMantemTamanhoMenorQueOLimite() {
        when(membroRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

        membroService.buscarResumo(null, null, PageRequest.of(0, 5));

        assertThat(paginaPedida().getPageSize()).isEqualTo(5);
    }

    @Test
    void resumoIgnoraAOrdenacaoDoClienteEOrdenaPorNomeEId() {
        when(membroRepository.findAll(any(Pageable.class))).thenReturn(Page.empty());

        membroService.buscarResumo(null, null, PageRequest.of(0, 10, Sort.by("cpf")));

        assertThat(paginaPedida().getSort()).isEqualTo(Sort.by("nome").and(Sort.by("id")));
    }

    @Test
    void resumoFiltraPorNomeEStatus() {
        when(membroRepository.findByNomeContainingIgnoreCaseAndStatus(eq("an"), eq(StatusMembro.AFASTADO), any()))
                .thenReturn(Page.empty());

        membroService.buscarResumo("an", StatusMembro.AFASTADO, PageRequest.of(0, 10));

        verify(membroRepository).findByNomeContainingIgnoreCaseAndStatus(eq("an"), eq(StatusMembro.AFASTADO), any());
    }

    @Test
    void resumoFiltraSoPorStatusQuandoNomeEstaEmBranco() {
        when(membroRepository.findByStatus(eq(StatusMembro.VISITANTE), any())).thenReturn(Page.empty());

        membroService.buscarResumo("  ", StatusMembro.VISITANTE, PageRequest.of(0, 10));

        verify(membroRepository).findByStatus(eq(StatusMembro.VISITANTE), any());
    }

    @Test
    void resumoFiltraSoPorNome() {
        when(membroRepository.findByNomeContainingIgnoreCase(eq("an"), any())).thenReturn(Page.empty());

        membroService.buscarResumo("an", null, PageRequest.of(0, 10));

        verify(membroRepository).findByNomeContainingIgnoreCase(eq("an"), any());
    }

    @Test
    void resumoUsaOMapperEnxuto() {
        Membro membro = new Membro();
        MembroResumoResponse resumo = new MembroResumoResponse(id, "Ana", StatusMembro.ATIVO);
        when(membroRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(membro)));
        when(membroMapper.toResumo(membro)).thenReturn(resumo);

        Page<MembroResumoResponse> pagina = membroService.buscarResumo(null, null, PageRequest.of(0, 10));

        assertThat(pagina.getContent()).containsExactly(resumo);
        verify(membroMapper, never()).toResponse(any());
    }
}
