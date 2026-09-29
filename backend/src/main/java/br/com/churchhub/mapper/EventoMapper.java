// mapper/EventoMapper.java
package br.com.churchhub.api.mapper;

import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.dto.EventoResponse;
import br.com.churchhub.api.entity.Evento;
import org.springframework.stereotype.Component;

@Component
public class EventoMapper {

    public Evento toEntity(EventoRequest request) {
        Evento evento = new Evento();
        applyRequest(evento, request);
        return evento;
    }

    public void updateEntity(Evento evento, EventoRequest request) {
        applyRequest(evento, request);
    }

    private void applyRequest(Evento evento, EventoRequest request) {
        evento.setTitulo(request.titulo());
        evento.setDescricao(request.descricao());
        evento.setData(request.data());
        evento.setHorario(request.horario());
        evento.setLocal(request.local());
    }

    public EventoResponse toResponse(Evento evento) {
        return new EventoResponse(
                evento.getId(),
                evento.getTitulo(),
                evento.getDescricao(),
                evento.getData(),
                evento.getHorario(),
                evento.getLocal()
        );
    }
}