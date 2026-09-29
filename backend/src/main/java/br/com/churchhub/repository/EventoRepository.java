// repository/EventoRepository.java
package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.Evento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EventoRepository extends JpaRepository<Evento, UUID> {
    Page<Evento> findByDataBetween(LocalDate dataInicio, LocalDate dataFim, Pageable pageable);

    List<Evento> findTop5ByDataGreaterThanEqualOrderByDataAscHorarioAsc(LocalDate data);
}