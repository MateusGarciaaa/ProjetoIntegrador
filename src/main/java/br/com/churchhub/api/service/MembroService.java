// service/MembroService.java
package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.MembroRequest;
import br.com.churchhub.api.dto.MembroResponse;
import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.MembroMapper;
import br.com.churchhub.api.repository.MembroRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MembroService {

    private final MembroRepository membroRepository;
    private final MembroMapper membroMapper;

    public Page<MembroResponse> listar(String nome, Pageable pageable) {
        Page<Membro> pagina = StringUtils.hasText(nome)
                ? membroRepository.findByNomeContainingIgnoreCase(nome, pageable)
                : membroRepository.findAll(pageable);

        return pagina.map(membroMapper::toResponse);
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

    @Transactional
    public void excluir(UUID id) {
        Membro membro = buscarEntidadePorId(id);
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