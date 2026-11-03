package br.com.churchhub.api.repository;

import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Usuario;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Filtros opcionais de GET /users, combinados numa só consulta (como os do financeiro). */
public final class UsuarioFiltros {

    private UsuarioFiltros() {
    }

    public static Specification<Usuario> de(String nome, NomePerfil perfil, Boolean ativo) {
        List<Specification<Usuario>> filtros = new ArrayList<>();
        if (nome != null && !nome.isBlank()) {
            String padrao = "%" + nome.strip().toLowerCase(Locale.ROOT) + "%";
            filtros.add((raiz, consulta, cb) -> cb.like(cb.lower(raiz.get("nome")), padrao));
        }
        if (perfil != null) {
            filtros.add((raiz, consulta, cb) -> cb.equal(raiz.get("perfil").get("nome"), perfil.name()));
        }
        if (ativo != null) {
            filtros.add((raiz, consulta, cb) -> cb.equal(raiz.get("ativo"), ativo));
        }
        return Specification.allOf(filtros);
    }
}
