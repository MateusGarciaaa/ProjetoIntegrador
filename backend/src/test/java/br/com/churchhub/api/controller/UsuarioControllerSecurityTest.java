package br.com.churchhub.api.controller;

import br.com.churchhub.api.dto.UsuarioResponse;
import br.com.churchhub.api.entity.NomePerfil;
import br.com.churchhub.api.entity.Perfil;
import br.com.churchhub.api.entity.Usuario;
import br.com.churchhub.api.exception.ConflictException;
import br.com.churchhub.api.security.JwtService;
import br.com.churchhub.api.security.SecurityConfig;
import br.com.churchhub.api.security.SecurityErrorHandler;
import br.com.churchhub.api.security.UsuarioDetailsImpl;
import br.com.churchhub.api.security.UsuarioDetailsServiceImpl;
import br.com.churchhub.api.service.Ator;
import br.com.churchhub.api.service.UsuarioService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** RN02: gestão de usuários só para o ADMINISTRADOR; os demais perfis recebem 403 e o anônimo 401. */
@WebMvcTest(UsuarioController.class)
@Import({SecurityConfig.class, SecurityErrorHandler.class})
class UsuarioControllerSecurityTest {

    private static final String USERS = "/api/v1/users";
    private static final UUID ADMIN_ID = UUID.randomUUID();
    private static final UUID ALVO = UUID.randomUUID();
    private static final String CADASTRO = "{\"nome\": \"Paula\", \"email\": \"paula@igreja.org\", \"perfil\": \"PASTOR\"}";
    private static final String EDICAO = "{\"nome\": \"Paula\", \"perfil\": \"SECRETARIO\"}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioService usuarioService;
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private UsuarioDetailsServiceImpl usuarioDetailsService;

    private static RequestPostProcessor logadoComo(NomePerfil nomePerfil) {
        Perfil perfil = new Perfil();
        perfil.setNome(nomePerfil.name());
        Usuario usuario = new Usuario();
        usuario.setId(ADMIN_ID);
        usuario.setEmail(nomePerfil.name().toLowerCase() + "@churchhub.local");
        usuario.setPerfil(perfil);
        return user(new UsuarioDetailsImpl(usuario));
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder requisicao, String corpo) {
        return requisicao.contentType(MediaType.APPLICATION_JSON).characterEncoding("UTF-8").content(corpo);
    }

    static Stream<MockHttpServletRequestBuilder> rotas() {
        return Stream.of(
                get(USERS),
                get(USERS + "/" + ALVO),
                json(post(USERS), CADASTRO),
                json(put(USERS + "/" + ALVO), EDICAO),
                post(USERS + "/" + ALVO + "/deactivate"),
                post(USERS + "/" + ALVO + "/activate"),
                post(USERS + "/" + ALVO + "/invite"));
    }

    private static UsuarioResponse resposta() {
        return new UsuarioResponse(ALVO, "Paula", "paula@igreja.org", NomePerfil.PASTOR, true, true);
    }

    @ParameterizedTest
    @MethodSource("rotas")
    void administradorAcessaTodasAsRotas(MockHttpServletRequestBuilder requisicao) throws Exception {
        when(usuarioService.listar(any(), any(), any(), any())).thenReturn(new PageImpl<>(List.of(resposta())));
        when(usuarioService.buscarPorId(ALVO)).thenReturn(resposta());
        when(usuarioService.cadastrar(any(), any())).thenReturn(resposta());
        when(usuarioService.atualizar(eq(ALVO), any(), any())).thenReturn(resposta());
        when(usuarioService.desativar(eq(ALVO), any())).thenReturn(resposta());
        when(usuarioService.ativar(eq(ALVO), any())).thenReturn(resposta());

        int status = mockMvc.perform(requisicao.with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andReturn().getResponse().getStatus();
        assertThat(status).isIn(200, 201, 204);
    }

    @ParameterizedTest
    @EnumSource(value = NomePerfil.class, names = "ADMINISTRADOR", mode = EnumSource.Mode.EXCLUDE)
    void demaisPerfisRecebem403EmTodasAsRotas(NomePerfil perfil) throws Exception {
        for (MockHttpServletRequestBuilder requisicao : rotas().toList()) {
            mockMvc.perform(requisicao.with(logadoComo(perfil)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Você não possui permissão para acessar este recurso."));
        }
        verifyNoInteractions(usuarioService);
    }

    @Test
    void anonimoRecebe401EmTodasAsRotas() throws Exception {
        for (MockHttpServletRequestBuilder requisicao : rotas().toList()) {
            mockMvc.perform(requisicao).andExpect(status().isUnauthorized());
        }
        verifyNoInteractions(usuarioService);
    }

    @Test
    void cadastroResponde201EPassaOAdministradorComoAtor() throws Exception {
        when(usuarioService.cadastrar(any(), any())).thenReturn(resposta());

        mockMvc.perform(json(post(USERS), CADASTRO).with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.convitePendente").value(true))
                .andExpect(jsonPath("$.senha").doesNotExist());
        verify(usuarioService).cadastrar(any(), eq(new Ator(ADMIN_ID, "administrador@churchhub.local")));
    }

    @Test
    void listaComFiltrosEOrdenacaoPadraoPorNomeEId() throws Exception {
        when(usuarioService.listar(any(), any(), any(), any())).thenReturn(Page.empty());

        mockMvc.perform(get(USERS).param("perfil", "TESOUREIRO").param("ativo", "false")
                        .with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isOk());

        var pageable = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        verify(usuarioService).listar(isNull(), eq(NomePerfil.TESOUREIRO), eq(false), pageable.capture());
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by("nome", "id"));
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
    }

    @Test
    void perfilInexistenteComoLiderEh400NaQueryENoCorpo() throws Exception {
        mockMvc.perform(get(USERS).param("perfil", "LIDER").with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Valor inválido para o parâmetro 'perfil'."));
        mockMvc.perform(json(post(USERS), "{\"nome\": \"A\", \"email\": \"a@b.org\", \"perfil\": \"LIDER\"}")
                        .with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(usuarioService);
    }

    @Test
    void cadastroInvalidoEh400ComAsMensagensDosCampos() throws Exception {
        mockMvc.perform(json(post(USERS), "{\"nome\": \"\", \"email\": \"nao-eh-email\"}")
                        .with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(allOf(
                        containsString("O nome é obrigatório"),
                        containsString("E-mail inválido"),
                        containsString("O perfil é obrigatório"))));
        verifyNoInteractions(usuarioService);
    }

    @Test
    void idQueNaoEhUuidEh400() throws Exception {
        mockMvc.perform(post(USERS + "/abc/deactivate").with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void conflitoDeRegraEh409ComAMensagem() throws Exception {
        when(usuarioService.desativar(eq(ALVO), any()))
                .thenThrow(new ConflictException("Você não pode desativar a sua própria conta"));

        mockMvc.perform(post(USERS + "/" + ALVO + "/deactivate").with(logadoComo(NomePerfil.ADMINISTRADOR)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Você não pode desativar a sua própria conta"));
    }
}
