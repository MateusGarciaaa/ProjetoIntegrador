package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.MovimentacaoFinanceiraRequest;
import br.com.churchhub.api.dto.MovimentacaoFinanceiraResponse;
import br.com.churchhub.api.dto.PontoSerieFinanceiraResponse;
import br.com.churchhub.api.dto.ResumoFinanceiroResponse;
import br.com.churchhub.api.dto.TotalPorCategoriaResponse;
import br.com.churchhub.api.entity.AgrupamentoSerie;
import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.MovimentacaoFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.exception.BusinessException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.MovimentacaoFinanceiraMapper;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraFiltros;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import br.com.churchhub.api.repository.TotaisFinanceiros;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovimentacaoFinanceiraService {

    static final String MENSAGEM_PERIODO_INVERTIDO = "A data inicial não pode ser posterior à data final";

    private final MovimentacaoFinanceiraRepository movimentacaoRepository;
    private final CategoriaFinanceiraService categoriaFinanceiraService;
    private final MembroRepository membroRepository;
    private final MovimentacaoFinanceiraMapper movimentacaoMapper;

    /**
     * Leituras transacionais: o mapper acessa categoria e membro (open-in-view está desligado).
     * Categoria inexistente não é erro: é um filtro como os outros, e nenhuma movimentação a tem
     * (página vazia, sem consulta extra para conferir a categoria).
     */
    @Transactional(readOnly = true)
    public Page<MovimentacaoFinanceiraResponse> listar(LocalDate dataInicio, LocalDate dataFim,
                                                       TipoMovimentacao tipo, UUID categoriaId, Pageable pageable) {
        return movimentacaoRepository
                .findAll(MovimentacaoFinanceiraFiltros.de(dataInicio, dataFim, tipo, categoriaId), pageable)
                .map(movimentacaoMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public MovimentacaoFinanceiraResponse buscarPorId(UUID id) {
        return movimentacaoMapper.toResponse(buscarEntidadePorId(id));
    }

    @Transactional
    public MovimentacaoFinanceiraResponse cadastrar(MovimentacaoFinanceiraRequest request) {
        CategoriaFinanceira categoria = categoriaFinanceiraService.buscarEntidadePorId(request.categoriaId());
        validarTipoCompativelComCategoria(request, categoria);
        Membro membro = buscarMembroOpcional(request.membroId());

        MovimentacaoFinanceira movimentacao = movimentacaoMapper.toEntity(request, categoria, membro);
        return movimentacaoMapper.toResponse(movimentacaoRepository.save(movimentacao));
    }

    @Transactional
    public MovimentacaoFinanceiraResponse atualizar(UUID id, MovimentacaoFinanceiraRequest request) {
        MovimentacaoFinanceira movimentacao = buscarEntidadePorId(id);
        CategoriaFinanceira categoria = categoriaFinanceiraService.buscarEntidadePorId(request.categoriaId());
        validarTipoCompativelComCategoria(request, categoria);
        Membro membro = buscarMembroOpcional(request.membroId());

        movimentacaoMapper.updateEntity(movimentacao, request, categoria, membro);
        return movimentacaoMapper.toResponse(movimentacaoRepository.save(movimentacao));
    }

    @Transactional
    public void excluir(UUID id) {
        movimentacaoRepository.delete(buscarEntidadePorId(id));
    }

    /**
     * Agregações do período (summary, série e por categoria): somadas no banco, com os mesmos
     * filtros opcionais da listagem. As duas datas são obrigatórias (o controller exige) e em ordem.
     */
    @Transactional(readOnly = true)
    public ResumoFinanceiroResponse resumo(LocalDate dataInicio, LocalDate dataFim,
                                           TipoMovimentacao tipo, UUID categoriaId) {
        validarPeriodo(dataInicio, dataFim);
        TotaisFinanceiros totais = movimentacaoRepository
                .somar(MovimentacaoFinanceiraFiltros.de(dataInicio, dataFim, tipo, categoriaId));
        return new ResumoFinanceiroResponse(dataInicio, dataFim, totais.receitas(), totais.despesas(), totais.saldo());
    }

    @Transactional(readOnly = true)
    public List<PontoSerieFinanceiraResponse> serie(LocalDate dataInicio, LocalDate dataFim, AgrupamentoSerie agrupamento,
                                                    TipoMovimentacao tipo, UUID categoriaId) {
        validarPeriodo(dataInicio, dataFim);
        return movimentacaoRepository.serie(MovimentacaoFinanceiraFiltros.de(dataInicio, dataFim, tipo, categoriaId), agrupamento);
    }

    @Transactional(readOnly = true)
    public List<TotalPorCategoriaResponse> totaisPorCategoria(LocalDate dataInicio, LocalDate dataFim,
                                                              TipoMovimentacao tipo, UUID categoriaId) {
        validarPeriodo(dataInicio, dataFim);
        return movimentacaoRepository.totaisPorCategoria(MovimentacaoFinanceiraFiltros.de(dataInicio, dataFim, tipo, categoriaId));
    }

    private static void validarPeriodo(LocalDate dataInicio, LocalDate dataFim) {
        if (dataInicio.isAfter(dataFim)) {
            throw new BusinessException(MENSAGEM_PERIODO_INVERTIDO);
        }
    }

    private MovimentacaoFinanceira buscarEntidadePorId(UUID id) {
        return movimentacaoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movimentação financeira não encontrada"));
    }

    private Membro buscarMembroOpcional(UUID membroId) {
        if (membroId == null) {
            return null;
        }
        return membroRepository.findById(membroId)
                .orElseThrow(() -> new ResourceNotFoundException("Membro não encontrado"));
    }

    private void validarTipoCompativelComCategoria(MovimentacaoFinanceiraRequest request, CategoriaFinanceira categoria) {
        if (request.tipo() != categoria.getTipo()) {
            throw new BusinessException(
                    "O tipo da movimentação (%s) não é compatível com o tipo da categoria (%s)"
                            .formatted(request.tipo(), categoria.getTipo()));
        }
    }
}