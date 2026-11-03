package br.com.churchhub.api.security;

import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.repository.UsuarioRepository;
import br.com.churchhub.api.util.NormalizadorEmail;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UsuarioDetailsServiceImpl implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public UsuarioDetailsImpl loadUserByUsername(String email) {
        Usuario usuario = usuarioRepository.findByEmail(NormalizadorEmail.normalizar(email))
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
        return new UsuarioDetailsImpl(usuario);
    }
}