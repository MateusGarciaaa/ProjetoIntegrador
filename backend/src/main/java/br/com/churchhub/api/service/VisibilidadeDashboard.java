package br.com.churchhub.api.service;

import br.com.churchhub.api.entity.NomePerfil;

import java.util.Collection;
import java.util.EnumSet;
import java.util.Set;

/**
 * RN12: o dashboard mostra só o que o perfil já pode ver nos módulos de origem.
 * - membros (contagens por status, aniversariantes e novos membros): quem consulta GET /members (A, P, S);
 * - financeiro (resumo do mês): quem consulta GET /financial (A, T, P);
 * - próximos eventos: todos (GET /events é isAuthenticated()).
 * Se um @PreAuthorize desses módulos mudar, mude aqui também.
 */
public record VisibilidadeDashboard(boolean membros, boolean financeiro) {

    private static final Set<NomePerfil> VEEM_MEMBROS =
            EnumSet.of(NomePerfil.ADMINISTRADOR, NomePerfil.PASTOR, NomePerfil.SECRETARIO);
    private static final Set<NomePerfil> VEEM_FINANCEIRO =
            EnumSet.of(NomePerfil.ADMINISTRADOR, NomePerfil.PASTOR, NomePerfil.TESOUREIRO);

    /** autoridades: "ROLE_<PERFIL>", como no JWT e no UsuarioDetailsImpl. Autoridade desconhecida não libera nada. */
    public static VisibilidadeDashboard dasAutoridades(Collection<String> autoridades) {
        Set<NomePerfil> perfis = EnumSet.noneOf(NomePerfil.class);
        for (NomePerfil perfil : NomePerfil.values()) {
            if (autoridades.contains("ROLE_" + perfil.name())) {
                perfis.add(perfil);
            }
        }
        return new VisibilidadeDashboard(
                perfis.stream().anyMatch(VEEM_MEMBROS::contains),
                perfis.stream().anyMatch(VEEM_FINANCEIRO::contains));
    }
}
