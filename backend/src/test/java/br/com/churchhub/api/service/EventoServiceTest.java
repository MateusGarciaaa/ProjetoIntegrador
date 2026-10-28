package br.com.churchhub.api.service;

import br.com.churchhub.api.dto.EventoRequest;
import br.com.churchhub.api.entity.Evento;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.mapper.EventoMapper;
import br.com.churchhub.api.repository.EventoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * RN09 com relógio fixo: evento encerrado (horário de início já passou, no fuso da igreja)
 * só pode ser editado pelo administrador.
 */
@ExtendWith(MockitoExtension.class)
class EventoServiceTest {

    private static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");
    private static final LocalDate HOJE = LocalDate.of(2026, 10, 27);
    /** 27/10/2026, 19:00:00 em São Paulo (22:00 UTC). */
    private static final Instant AGORA = Instant.parse("2026-10-27T22:00:00Z");
    private static final String MENSAGEM_RN09 = "Este evento já foi encerrado e só pode ser editado por um administrador";

    private static final boolean ADMINISTRADOR = true;
    private static final boolean SECRETARIO = false;

    @Mock
    private EventoRepository eventoRepository;

    private final UUID id = UUID.randomUUID();
    private final EventoRequest alteracao = new EventoRequest("Culto (editado)", null, HOJE.plusDays(1), LocalTime.of(19, 0), "Templo");

    private EventoService servicoNoInstante(Instant instante) {
        return new EventoService(eventoRepository, new EventoMapper(), Clock.fixed(instante, SAO_PAULO));
    }

    private Evento gravado(LocalDate data, LocalTime horario) {
        Evento evento = new Evento();
        evento.setId(id);
        evento.setTitulo("Culto");
        evento.setData(data);
        evento.setHorario(horario);
        when(eventoRepository.findById(id)).thenReturn(Optional.of(evento));
        return evento;
    }

    private void salvarDevolveOProprioEvento() {
        when(eventoRepository.save(any(Evento.class))).thenAnswer(invocacao -> invocacao.getArgument(0));
    }

    @Test
    void secretarioEditaEventoQueAindaNaoComecou() {
        gravado(HOJE, LocalTime.of(20, 0));
        salvarDevolveOProprioEvento();

        var salvo = servicoNoInstante(AGORA).atualizar(id, alteracao, SECRETARIO);

        assertThat(salvo.titulo()).isEqualTo("Culto (editado)");
    }

    @Test
    void secretarioNaoEditaEventoJaIniciado() {
        gravado(HOJE, LocalTime.of(18, 59));

        assertThatThrownBy(() -> servicoNoInstante(AGORA).atualizar(id, alteracao, SECRETARIO))
                .isInstanceOf(ConflictException.class)
                .hasMessage(MENSAGEM_RN09);
        verify(eventoRepository, never()).save(any());
    }

    @Test
    void secretarioNaoEditaEventoDeDiasAnteriores() {
        gravado(HOJE.minusDays(7), LocalTime.of(19, 0));

        assertThatThrownBy(() -> servicoNoInstante(AGORA).atualizar(id, alteracao, SECRETARIO))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void administradorEditaEventoJaIniciado() {
        Evento evento = gravado(HOJE.minusDays(7), LocalTime.of(19, 0));
        salvarDevolveOProprioEvento();

        servicoNoInstante(AGORA).atualizar(id, alteracao, ADMINISTRADOR);

        verify(eventoRepository).save(evento);
        assertThat(evento.getTitulo()).isEqualTo("Culto (editado)");
    }

    @Test
    void noInstanteExatoDoInicioAindaNaoEstaEncerrado() {   // isBefore: o próprio instante não conta
        gravado(HOJE, LocalTime.of(19, 0));
        salvarDevolveOProprioEvento();

        servicoNoInstante(AGORA).atualizar(id, alteracao, SECRETARIO);

        verify(eventoRepository).save(any(Evento.class));
    }

    @Test
    void umNanossegundoDepoisDoInicioJaEstaEncerrado() {
        gravado(HOJE, LocalTime.of(19, 0));

        assertThatThrownBy(() -> servicoNoInstante(AGORA.plusNanos(1)).atualizar(id, alteracao, SECRETARIO))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void decideNoFusoDaIgrejaENaoEmUtc() {
        // 01:30 UTC de 28/10 ainda é 27/10, 22:30, em São Paulo: o evento das 23:00 não começou.
        gravado(HOJE, LocalTime.of(23, 0));
        salvarDevolveOProprioEvento();

        servicoNoInstante(Instant.parse("2026-10-28T01:30:00Z")).atualizar(id, alteracao, SECRETARIO);

        verify(eventoRepository).save(any(Evento.class));
    }

    @Test
    void olhaOEventoGravadoENaoOsValoresNovos() {
        // Evento futuro movido para o passado: a RN09 só avalia o estado gravado.
        gravado(HOJE.plusDays(3), LocalTime.of(19, 0));
        salvarDevolveOProprioEvento();
        EventoRequest paraOPassado = new EventoRequest("Culto", null, HOJE.minusDays(1), LocalTime.of(19, 0), null);

        var salvo = servicoNoInstante(AGORA).atualizar(id, paraOPassado, SECRETARIO);

        assertThat(salvo.data()).isEqualTo(HOJE.minusDays(1));
    }
}
