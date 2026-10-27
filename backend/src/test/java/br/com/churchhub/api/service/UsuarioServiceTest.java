package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.repository.PerfilRepository;
import br.com.churchhub.api.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class UsuarioServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;
    @Mock
    private PerfilRepository perfilRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @InjectMocks
    private UsuarioService usuarioService;

    @Test
    void recusaSenhaQueNaoCabeNoBcryptAntesDeCodificar() {
        assertThatThrownBy(() -> usuarioService.criarSeNaoExistir(
                "Ana", "ana@igreja.org", "é".repeat(37), NomePerfil.ADMINISTRADOR))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("72 bytes");
        verifyNoInteractions(usuarioRepository, passwordEncoder);
    }
}
