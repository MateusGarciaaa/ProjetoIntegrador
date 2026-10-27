package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.Membro;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.exception.ResourceNotFoundException;
import br.com.churchhub.api.mapper.MembroMapper;
import br.com.churchhub.api.repository.MembroRepository;
import br.com.churchhub.api.repository.MovimentacaoFinanceiraRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
}
