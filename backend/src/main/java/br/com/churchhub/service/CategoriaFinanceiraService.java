// service/CategoriaFinanceiraService.java
package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.CategoriaFinanceiraRequest;
import br.com.churchhub.api.dto.CategoriaFinanceiraResponse;
import br.com.churchhub.api.entity.CategoriaFinanceira;
import br.com.churchhub.api.entity.TipoMovimentacao;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.CategoriaFinanceiraMapper;
import br.com.churchhub.api.repository.CategoriaFinanceiraRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoriaFinanceiraService {

    private final CategoriaFinanceiraRepository categoriaRepository;
    private final CategoriaFinanceiraMapper categoriaMapper;

    public List<CategoriaFinanceiraResponse> listar(TipoMovimentacao tipo) {
        List<CategoriaFinanceira> categorias = tipo != null
                ? categoriaRepository.findByTipo(tipo)
                : categoriaRepository.findAll();

        return categorias.stream().map(categoriaMapper::toResponse).toList();
    }

    @Transactional
    public CategoriaFinanceiraResponse cadastrar(CategoriaFinanceiraRequest request) {
        if (categoriaRepository.existsByNomeAndTipo(request.nome(), request.tipo())) {
            throw new ConflictException("Já existe uma categoria com este nome para este tipo");
        }

        CategoriaFinanceira categoria = categoriaMapper.toEntity(request);
        return categoriaMapper.toResponse(categoriaRepository.save(categoria));
    }

    CategoriaFinanceira buscarEntidadePorId(UUID id) {
        return categoriaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria financeira não encontrada"));
    }
}