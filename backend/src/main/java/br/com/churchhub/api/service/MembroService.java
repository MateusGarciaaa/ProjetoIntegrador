package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.dto.MembroResumoResponse;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.entity.StatusMembro;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.MembroMapper;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MembroService {

    /** Seletores mostram poucos itens por vez; o cliente refina pelo nome. */
    public static final int TAMANHO_MAXIMO_PAGINA_RESUMO = 20;

    /** O id desempata nomes iguais, para a paginação não repetir nem pular membros. */
    private static final Sort ORDENACAO_RESUMO = Sort.by("nome").and(Sort.by("id"));

    private final MembroRepository membroRepository;
    private final MembroMapper membroMapper;
    private final MovimentacaoFinanceiraRepository movimentacaoRepository;

    public Page<MembroResponse> listar(String nome, Pageable pageable) {
        Page<Membro> pagina = StringUtils.hasText(nome)
                ? membroRepository.findByNomeContainingIgnoreCase(nome, pageable)
                : membroRepository.findAll(pageable);

        return pagina.map(membroMapper::toResponse);
    }

    /**
     * Busca enxuta (id, nome, status) para seletores de outros módulos. Sempre ordenada por
     * nome — a ordenação pedida pelo cliente é ignorada para não permitir ordenar por CPF,
     * e-mail etc. — e com no máximo {@value #TAMANHO_MAXIMO_PAGINA_RESUMO} itens por página.
     */
    public Page<MembroResumoResponse> buscarResumo(String nome, StatusMembro status, Pageable pageable) {
        Pageable limitado = PageRequest.of(
                pageable.getPageNumber(),
                Math.min(pageable.getPageSize(), TAMANHO_MAXIMO_PAGINA_RESUMO),
                ORDENACAO_RESUMO);

        return buscarPorNomeEStatus(nome, status, limitado).map(membroMapper::toResumo);
    }

    private Page<Membro> buscarPorNomeEStatus(String nome, StatusMembro status, Pageable pageable) {
        boolean temNome = StringUtils.hasText(nome);
        if (temNome && status != null) {
            return membroRepository.findByNomeContainingIgnoreCaseAndStatus(nome, status, pageable);
        }
        if (temNome) {
            return membroRepository.findByNomeContainingIgnoreCase(nome, pageable);
        }
        if (status != null) {
            return membroRepository.findByStatus(status, pageable);
        }
        return membroRepository.findAll(pageable);
    }

    public MembroResponse buscarPorId(UUID id) {
        return membroMapper.toResponse(buscarEntidadePorId(id));
    }

    @Transactional
    public MembroResponse cadastrar(MembroRequest request) {
        validarUnicidade(request.email(), request.cpf(), null);

        Membro membro = membroMapper.toEntity(request);
        Membro salvo = membroRepository.save(membro);
        return membroMapper.toResponse(salvo);
    }

    @Transactional
    public MembroResponse atualizar(UUID id, MembroRequest request) {
        Membro membro = buscarEntidadePorId(id);
        validarUnicidade(request.email(), request.cpf(), id);

        membroMapper.updateEntity(membro, request);
        Membro atualizado = membroRepository.save(membro);
        return membroMapper.toResponse(atualizado);
    }

    /**
     * RN14 (versão MVP): membro com histórico financeiro não é excluído, para não
     * apagar a origem de dízimos e ofertas. A confirmação administrativa fica para a Fase 2.
     */
    @Transactional
    public void excluir(UUID id) {
        Membro membro = buscarEntidadePorId(id);
        if (movimentacaoRepository.existsByMembroId(id)) {
            throw new ConflictException(
                    "Este membro possui movimentações financeiras vinculadas e não pode ser excluído. "
                            + "Altere o status para Afastado.");
        }
        membroRepository.delete(membro);
    }

    private Membro buscarEntidadePorId(UUID id) {
        return membroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Membro não encontrado"));
    }

    private void validarUnicidade(String email, String cpf, UUID idIgnorado) {
        membroRepository.findByEmail(email)
                .filter(m -> !m.getId().equals(idIgnorado))
                .ifPresent(m -> { throw new ConflictException("Já existe um membro com este e-mail"); });

        membroRepository.findByCpf(cpf)
                .filter(m -> !m.getId().equals(idIgnorado))
                .ifPresent(m -> { throw new ConflictException("Já existe um membro com este CPF"); });
    }
}