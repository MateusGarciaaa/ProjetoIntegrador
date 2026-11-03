package br.com.churchhub.api.mapper;

import br.com.churchhub.api.dto.UsuarioResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Usuario;
import org.springframework.stereotype.Component;

@Component
public class UsuarioMapper {

    public UsuarioResponse toResponse(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                NomePerfil.valueOf(usuario.getPerfil().getNome()),
                usuario.isAtivo(),
                usuario.isConvitePendente());
    }
}
