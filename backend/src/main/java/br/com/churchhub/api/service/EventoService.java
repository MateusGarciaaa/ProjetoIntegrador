package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.EventoResponse;
import br.com.churchhub.api.entity.Evento;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.EventoMapper;
import br.com.churchhub.api.repository.EventoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventoService {

    private final EventoRepository eventoRepository;
    private final EventoMapper eventoMapper;
    /** Relógio no fuso da igreja (ClockConfig): a RN09 não depende do fuso da máquina. */
    private final Clock clock;

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
            throw new ConflictException(
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

    /**
     * RN09: o evento conta como encerrado a partir do horário de início (não há hora de término).
     * Olha o evento gravado, não os valores novos da requisição.
     */
    private boolean jaEncerrado(Evento evento) {
        LocalDateTime dataHoraEvento = LocalDateTime.of(evento.getData(), evento.getHorario());
        return dataHoraEvento.isBefore(LocalDateTime.now(clock));
    }
}