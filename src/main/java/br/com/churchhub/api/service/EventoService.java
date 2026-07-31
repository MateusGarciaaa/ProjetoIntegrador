// service/EventoService.java
package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.EventoResponse;
import br.com.churchhub.api.entity.Evento;
import br.com.churchhub.api.exception.BusinessException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.EventoMapper;
import br.com.churchhub.api.repository.EventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventoService {

    private final EventoRepository eventoRepository;
    private final EventoMapper eventoMapper;

    public Page<EventoResponse> listar(LocalDate dataInicio, LocalDate dataFim, Pageable pageable) {
        Page<Evento> pagina = (dataInicio != null && dataFim != null)
                ? eventoRepository.findByDataBetween(dataInicio, dataFim, pageable)
                : eventoRepository.findAll(pageable);

        return pagina.map(eventoMapper::toResponse);
    }

    public EventoResponse buscarPorId(UUID id) {
        return eventoMapper.toResponse(buscarEntidadePorId(id));
    }

    @Transactional
    public EventoResponse cadastrar(EventoRequest request) {
        Evento evento = eventoMapper.toEntity(request);
        return eventoMapper.toResponse(eventoRepository.save(evento));
    }

    @Transactional
    public EventoResponse atualizar(UUID id, EventoRequest request, boolean isAdministrador) {
        Evento evento = buscarEntidadePorId(id);

        if (!isAdministrador && jaEncerrado(evento)) {
            throw new BusinessException(
                    "Este evento já foi encerrado e só pode ser editado por um administrador");
        }

        eventoMapper.updateEntity(evento, request);
        return eventoMapper.toResponse(eventoRepository.save(evento));
    }

    @Transactional
    public void excluir(UUID id) {
        eventoRepository.delete(buscarEntidadePorId(id));
    }

    private Evento buscarEntidadePorId(UUID id) {
        return eventoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Evento não encontrado"));
    }

    private boolean jaEncerrado(Evento evento) {
        LocalDateTime dataHoraEvento = LocalDateTime.of(evento.getData(), evento.getHorario());
        return dataHoraEvento.isBefore(LocalDateTime.now());
    }
}