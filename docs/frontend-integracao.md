# Integração frontend × backend — diagnóstico

> Fotografia de 2026-10-26 (commit 2087a3c), atualizada ao fim da Fundação e da Autenticação no mesmo dia ao fim de Membros e ao fim de Eventos em 2026-10-27. Ler no início de cada sessão. Atualizar a tabela e o checklist ao concluir cada módulo.
> Fontes: `backend/src/main/java/br/com/churchhub/api/{controller,dto,service,security,exception}` e `frontend/src/{services,constants,routes,schemas,hooks}`.

## 1. Convenções do backend (valem para todos os módulos)

- Base: `/api/v1` (o frontend já usa `VITE_API_BASE_URL=/api/v1`; os services chamam caminhos relativos, ex. `/members`).
- Públicos: `/api/v1/auth/**`, Swagger, `/actuator/health`. Todo o resto exige `Authorization: Bearer <jwt>`.
- Paginação (Spring `Pageable`): `page` (base 0), `size` (máx. 2000; acima disso é reduzido **sem erro**), `sort=campo,asc|desc` (campo inexistente → 400). Resposta `Page<T>` no modo **DIRECT** (padrão de `spring.data.web.pageable.serialization-mode` no Spring Boot 4.1; o projeto não o altera): `{ content, pageable{pageNumber,pageSize,sort,offset,paged,unpaged}, last, totalElements, totalPages, size, number, sort{empty,sorted,unsorted}, first, numberOfElements, empty }` — conferido na API real em 2026-10-26. No front: query com `montarParametrosPagina`, resposta com `normalizarPagina` (`services/http/pagina.js`).
- Datas `LocalDate`: `"AAAA-MM-DD"` no corpo e na query. Horário `LocalTime`: resposta `"HH:mm:ss"` (ex. `"19:00:00"`); entrada aceita `"HH:mm"` ou `"HH:mm:ss"`.
- Dinheiro `BigDecimal`: número JSON (ex. `450.00`). Entrada: `@DecimalMin 0.01`, `@Digits(integer=10, fraction=2)` → **arredondar para 2 casas antes de enviar** (float JS como `0.30000000000000004` dá 400).
- Enums: `StatusMembro` = `ATIVO | AFASTADO | VISITANTE`; `TipoMovimentacao` = `RECEITA | DESPESA`; perfis = `ADMINISTRADOR | PASTOR | SECRETARIO | TESOUREIRO | MEMBRO`.
- Erro: `ApiError { timestamp (LocalDateTime sem fuso), status, error, message, path }`, sem lista por campo. Validação: mensagens unidas por `", "` em `message`. No front, o campo é deduzido do **texto** da mensagem (ver "Mapeamento de erros por campo" abaixo).

### Mapeamento de erros por campo (provisório)

`schemas/errosServidor.js` → `criarMapeadorDeErros({ campoPorMensagem, campoPorConflito })`. **Depende do texto exato das mensagens do backend**:
- 400: divide `message` por `", "` e procura cada parte em `campoPorMensagem` (mensagens copiadas das anotações do DTO). Se nenhuma parte for reconhecida, a mensagem inteira vai para o topo do formulário — isso evita quebrar textos que têm vírgula, como `"Corpo da requisição inválido. Confira o JSON, as datas…"`.
- 409: procura palavras-chave (`e-mail`, `CPF`) em `message`.
- Se o backend mudar uma mensagem, nada quebra: o erro só deixa de aparecer ao lado do campo e vai para o topo. Ao mudar mensagens de DTO/serviço no backend, atualizar o mapeador do formulário correspondente (hoje: `membroSchema.js`). Substituir pela lista estruturada quando a pendência 2 da seção 5 for resolvida.
- Códigos: 400 = validação, JSON/data/enum inválido, `{id}` não-UUID, parâmetro obrigatório ausente, `sort` inválido **e regra de negócio** (`BusinessException`: tipo ≠ categoria, token de reset inválido); 401 = credenciais erradas no login / token ausente, inválido ou vencido; 403 = perfil sem permissão (com corpo); 404 = registro ou rota inexistente; 405 = método errado; 409 = conflito (unicidade, RN14, **RN09 evento encerrado** — `ConflictException` desde o `fix(eventos)`, antes era 400 —, violação de constraint); 500 = genérico.
- JWT: `sub` = e-mail, `perfil` = `ROLE_<PERFIL>`, `iat`, `exp`; validade 86400 s. Sem claim `nome`, sem refresh token.
- Fuso: **`APP_TIMEZONE`** (`app.time.zone`, padrão `America/Sao_Paulo`, documentado no `.env.example`) é o fuso da igreja. Desde o `fix(eventos)`, o `EventoService` pede a hora a um `java.time.Clock` (bean de `ClockConfig`) nesse fuso, em vez do fuso da JVM; o container também usa o mesmo valor em `-Duser.timezone` (Dockerfile) e o compose o repassa do `.env`. Banco em `America/Sao_Paulo` (compose). "Hoje", "mês atual" e "evento encerrado" são calculados no servidor. Desde o `refactor(api)`, `DashboardService` (próximos eventos, aniversariantes e resumo do mês), `AuthService` (validade do link de redefinição) e `DadosDemonstracaoService` também usam esse `Clock`; os aniversariantes recebem o mês do `Clock` em vez do `CURRENT_DATE` do banco. Só o `timestamp` do `ApiError` continua no fuso da JVM (informativo; o front não usa).

## 2. Inventário de endpoints

Perfis: A = ADMINISTRADOR, P = PASTOR, S = SECRETARIO, T = TESOUREIRO, M = MEMBRO.

| # | Método e rota | Parâmetros | Entrada (validações) | Saída | Perfis | Classificação |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | — | `LoginRequest { email @NotBlank @Email, password @NotBlank @CabeNoBcrypt (≤ 72 bytes) }` (e-mail normalizado por `NormalizadorEmail`) | 200 `LoginResponse { token, type:"Bearer", expiresIn (s) }`; 401 `"E-mail ou senha inválidos"` (também usuário inativo) | público | **INTEGRADO** (`/login`) |
| 2 | `POST /auth/forgot-password` | — | `{ email @NotBlank @Email }` (normalizado; só usuário **ativo** recebe link; pedido novo invalida os links pendentes) | 200 `{ message: "Se o e-mail existir em nossa base, um link de redefinição foi enviado." }` (sempre a mesma) | público | **INTEGRADO** (`/esqueci-senha`; front envia minúsculas e mostra sempre a mensagem neutra própria) |
| 3 | `POST /auth/reset-password` | — | `{ token @NotBlank, newPassword @NotBlank @Size(6..72) @CabeNoBcrypt (≤ 72 bytes) }` | 204; 400 `"Token de redefinição inválido ou expirado"` (inexistente, já usado, substituído por um pedido mais novo, > 30 min ou usuário inativo) | público | **INTEGRADO** (`/reset-password?token=<UUID>`, caminho do link do `LoggingMailSender`) |
| — | `POST /auth/refresh` | — | — | **não existe** (conferido no `AuthController` em 2026-10-26) | — | — |
| 4 | `GET /members` | `nome` (contém, ignora maiúsc., diferencia acento), `status` opcional (inválido → 400 `"Valor inválido para o parâmetro 'status'."`; mesmo `buscarPorNomeEStatus` do lookup), `page`, `size`=20, `sort`=`nome` (ordenação do cliente respeitada) | — | 200 `Page<MembroResponse>` | A P S | **INTEGRADO** (`/membros`: `size=10`, `status` quando escolhido, `sort` repetido com desempate — ex. `sort=email,desc&sort=nome,asc&sort=id,asc`; colunas ordenáveis: nome, e-mail, telefone, status) |
| 4b | `GET /members/lookup` | `nome` (contém), `status` (inválido → 400 `"Valor inválido para o parâmetro 'status'."`), `page`, `size` (máx. **20**, acima disso reduz); `sort` do cliente é ignorado (sempre `nome`, `id`) | — | 200 `Page<MembroResumoResponse { id, nome, status }>` | A P S T | **NÃO USADO** (`membrosService.buscarResumo` e mock prontos; seletor de membro do Financeiro) |
| 5 | `GET /members/{id}` | `id` UUID | — | 200 `MembroResponse`; 404 | A P S | **INTEGRADO** (`/membros/:id` detalhes e `/membros/:id/editar`, sempre relido do servidor; id não-UUID → 400 tratado como "não encontrado") |
| 6 | `POST /members` | — | `MembroRequest { nome @NotBlank @Size150, cpf @NotBlank @Pattern \d{11}, email @NotBlank @Email @Size150, telefone @Size20, endereco @Size255, dataNascimento, dataBatismo, dataConversao (LocalDate), status (nulo→ATIVO) }` | 201 `MembroResponse`; 409 e-mail/CPF | A S | **INTEGRADO** |
| 7 | `PUT /members/{id}` | `id` | `MembroRequest` | 200; 404; 409 | A S | **INTEGRADO** |
| 8 | `DELETE /members/{id}` | `id` | — | 204; 404; 409 RN14 (tem movimentação financeira) | A | **INTEGRADO** (409 RN14 → diálogo "Não é possível excluir" com a mensagem do backend e atalho "Alterar status"; mock simula) |
| 9 | `GET /events` | `dataInicio`, `dataFim` (ISO, inclusivo; **só filtra se os dois vierem**; formato inválido → 400 `"Valor inválido para o parâmetro 'dataInicio'."`), `page`, `size`=20, `sort` padrão `data`, `horario`, `id` | — | 200 `Page<EventoResponse>` | **qualquer autenticado** (`isAuthenticated()`: A P S T M) | **INTEGRADO** (`/eventos`: lista com `size=10`, período só com as duas datas, `sort=data,dir&sort=horario,dir&sort=id,asc` ou `titulo,dir` + desempates; calendário com a grade de 6 semanas numa página de `size=2000`) |
| 10 | `GET /events/{id}` | `id` | — | 200 `EventoResponse { id, titulo, descricao, data, horario ("HH:mm:ss"), local }`; 404 `"Evento não encontrado"` | **qualquer autenticado** | **INTEGRADO** (`/eventos/:id` e `/eventos/:id/editar`, sempre relido do servidor; id não-UUID → "não encontrado") |
| 11 | `POST /events` | — | `EventoRequest { titulo @NotBlank @Size150, descricao @Size1000, data @NotNull, horario @NotNull (LocalTime), local @Size255 }` (data no passado é aceita) | 201 | A S | **INTEGRADO** (`/eventos/novo`; `?data=AAAA-MM-DD` pré-preenche a data; o front envia `horario` como `"HH:mm"`) |
| 12 | `PUT /events/{id}` | `id` | `EventoRequest` | 200; 400 de validação; **409** `"Este evento já foi encerrado e só pode ser editado por um administrador"` se o evento **gravado** já começou e o usuário não é A (RN09); 404 | A S | **INTEGRADO** (RN09 na interface: seção 4, item 4) |
| 13 | `DELETE /events/{id}` | `id` | — | 204; 404 | A | **INTEGRADO** (lista e detalhes, sempre com `ConfirmDialog`) |
| 14 | `GET /financial` | `dataInicio`, `dataFim` (só filtra se os dois vierem), `page`, `size`=20, `sort`=`data` | — | 200 `Page<MovimentacaoFinanceiraResponse { id, descricao, valor, data, tipo, categoria{id,nome,tipo}, membroId, membroNome }>` | A T P | **NÃO USADO** |
| 15 | `GET /financial/{id}` | `id` | — | 200; 404 | A T P | **NÃO USADO** |
| 16 | `GET /financial/summary` | `dataInicio`, `dataFim` **obrigatórios** (ausente → 400) | — | 200 `ResumoFinanceiroResponse { dataInicio, dataFim, totalReceitas, totalDespesas, saldo }` | A T P | **NÃO USADO** |
| 17 | `POST /financial` | — | `MovimentacaoFinanceiraRequest { descricao @NotBlank @Size255, valor @NotNull @DecimalMin0.01 @Digits(10,2), data @NotNull, tipo @NotNull, categoriaId @NotNull UUID, membroId UUID? }` | 201; 400 tipo ≠ tipo da categoria; 404 categoria/membro | A T | **NÃO USADO** |
| 18 | `PUT /financial/{id}` | `id` | idem | 200; 400; 404 | A T | **NÃO USADO** |
| 19 | `DELETE /financial/{id}` | `id` | — | 204; 404 | A | **NÃO USADO** |
| 20 | `GET /financial-categories` | `tipo` opcional (`RECEITA`/`DESPESA`) | — | 200 `List<CategoriaFinanceiraResponse { id, nome, tipo }>` (**não paginado**) | A T P | **NÃO USADO** |
| 21 | `POST /financial-categories` | — | `{ nome @NotBlank @Size100, tipo @NotNull }` | 201; 409 nome+tipo duplicado | A T | **NÃO USADO** |
| 22 | `GET /dashboard` | — | — | 200 `DashboardResponse { totalMembros, membrosAtivos, proximosEventos[≤5]{id,titulo,data,horario}, aniversariantesDoMes[{id,nome,dataNascimento}], resumoFinanceiroMesAtual (null se não for A) }` | A P | **NÃO USADO** |
| — | `GET /actuator/health` | — | — | 200 | público | NÃO USADO (útil para "acordar" o servidor) |

### FALTA NO BACKEND (exigido pelas telas previstas)

| Tela | Necessidade | Situação |
|---|---|---|
| Login / topo | Nome do usuário logado (`GET /auth/me` ou claim `nome`) | Não existe; o front mostra o e-mail |
| Login | Link de redefinição apontando para o frontend | `LoggingMailSender` só registra no log `/reset-password?token=…` (caminho relativo, sem URL base, sem e-mail real) |
| Sessão | `POST /auth/refresh` (previsto em 07-API.md) | Não existe |
| Dashboard | Novos membros (período) | Impossível: `membros` não tem data de cadastro → exige migration |
| Dashboard | Dados para gráficos (receitas × despesas por mês, membros por status) | Não existe; só `totalMembros` e `membrosAtivos`. Contornável com N chamadas a `/financial/summary` (A T P) |
| Dashboard | Acesso para T e S | Endpoint é só A P |
| Financeiro | Filtro por `tipo`, `categoriaId`, `membroId` na listagem | Não existe (só período) |
| Financeiro | Fluxo de caixa / relatório por categoria / exportação | Não existe (só `summary` por período) |
| Financeiro | Editar/excluir/buscar categoria (`GET/PUT/DELETE /financial-categories/{id}`) | Não existe |
| Membros | Busca por CPF/e-mail, busca sem acento | Não existe (backlog, pendência 10). ~~Filtro por status~~ → **feito** (`feat(api)`, 2026-10-27) |
| Usuários (admin) | CRUD de usuários, perfil, ativar/desativar (RN02) | Não existe (`UsuarioService` só serve à carga inicial) |
| Meu perfil | `GET/PUT /me`, trocar senha logado | Não existe; `Usuario` não tem vínculo com `Membro` → exige migration |

## 3. Divergências mock × backend real

O mock (`services/mock/`) implementa as 3 rotas de `/auth` (login, forgot-password, reset-password), as rotas de `/members` (inclusive RN14 e `sort` repetido) e as de `/events` (inclusive RN09, com o relógio do servidor simulado lido em `America/Sao_Paulo`). Rotas públicas passam pelo mesmo `@Valid` simulado das protegidas (`corpo.validar`). O `MailSender` simulado é a "caixa de e-mail" (`mock/caixaDeSaida.js`), exibida só no modo simulado na tela "Esqueci minha senha" (bloco "E-mails simulados", com o link `/reset-password?token=…`). Qualquer outra rota no mock: em `/auth/**` → 404 sem token (como o `permitAll`); nas demais, sem token → 401, com token → 404. Cada módulo exporta suas rotas em `handlers/<modulo>.js` (`ROTAS_AUTH`, `ROTAS_MEMBROS`, `ROTAS_EVENTOS`), reunidas em `ROTAS` de `servidorSimulado.js`; paginação simulada em `mock/paginacao.js` (`lerPageable`, `paginaSpring`).

| # | Assunto | Mock | Backend real | Impacto |
|---|---|---|---|---|
| 1 | Rotas cobertas | auth (3) + members + events | 22 endpoints | Financeiro, categorias e dashboard **só funcionam com backend real** até ganharem handler |
| 2 | Rotas públicas | ~~401~~ → **corrigido na Fundação** (`/auth/**` inexistente → 404 sem token); ~~forgot/reset sem handler~~ → **corrigido na Autenticação** | 200 / 204 | Nenhum |
| 3 | E-mail no login e no forgot-password | ~~comparação exata~~ → **corrigido na Autenticação**: normaliza nos dois, como o real; forgot-password também ignora usuário inativo e invalida links pendentes | idem (`NormalizadorEmail`) | Nenhum |
| 4 | Mensagens de validação de auth | ~~padrões do Hibernate~~ → **corrigido na Autenticação**: mensagens do `LoginRequest`, `ForgotPasswordRequest` e `ResetPasswordRequest` | do DTO | Ordem das mensagens unidas: o Spring não garante a ordem dos `FieldError`; o mock usa a ordem dos campos no record |
| 4b | Envio do link de redefinição | caixa de e-mail simulada na tela | `LoggingMailSender` só registra no log | Ver pendência 3 da seção 5 |
| 5 | RN14 (excluir membro com movimentação) | ~~sempre 204~~ → **corrigido em Membros**: 409 com a mensagem exata para os 4 membros com dízimo no `DadosDemonstracaoService` (`banco.membrosComMovimentacao`; derivar das movimentações quando o mock tiver o Financeiro) | 409 com mensagem | Nenhum |
| 6 | Formato da página | ~~VIA_DTO~~ → **corrigido na Fundação**: DIRECT idêntico ao real (mesmas chaves e valores; `size` > 2000 reduzido para 2000) | DIRECT (conferido em 2026-10-26 com `GET /members?page=2&size=10&sort=nome,asc`) | Nenhum |
| 7 | Ordenação | `localeCompare('pt-BR')`; ~~só o 1º `sort`~~ → **múltiplos `sort` desde Membros** (cada um desempata o anterior; campo inválido em qualquer um → 400) | collation do Postgres; múltiplos `sort` | Ordem com acentos/maiúsculas pode diferir |
| 8 | `timestamp` do erro | ISO UTC com ms (23 chars) | `LocalDateTime` do servidor, até micros | Front não usa |
| 9 | Unicidade de e-mail do membro | exata | exata (índice sem `lower`) | Iguais; ambos aceitam `Ana@x` e `ana@x` (front grava minúsculo) |
| 10 | Dados de demo | 25 membros, 5 contas, os 7 eventos do `DadosDemonstracaoService.criarEventos` (mesmas datas relativas a hoje, inclusive o encerrado de 7 dias atrás) | idem com `DEMO_DATA_ENABLED=true` + categorias, movimentações | Mock não tem finanças |
| 11 | Desempate de eventos com mesma data e horário | `id` de `crypto.randomUUID` | UUID do Postgres | Ordem entre eventos simultâneos pode diferir (as duas são estáveis) |

Sem divergência: ordem auth → `{id}` → `@Valid` → `@PreAuthorize`; 400 para `{id}` não-UUID, corpo malformado, `sort` inválido; 405/404 de rota; mensagens 401/403/404/409 de membros; `size` máx. 2000; claims do JWT; `expiresIn` em segundos.

## 4. Divergências de permissão

**Fundação concluída:** `constants/permissoes.js` espelha todos os `@PreAuthorize` (16 permissões, comentário com o endpoint em cada linha) e `permissoes.test.js` transcreve a mesma tabela de forma independente. As `ROTAS` do mock ainda só cobrem membros (cada módulo acrescenta as suas). Uso no front: `usePermissao().pode(...)`, `<PodeAcessar permissao senao>`, `RequirePermission` (rotas → `SemAcessoPage`), `itensMenuDoPerfil` (menu) e `rotaInicialDoPerfil`.

| Permissão | Backend |
|---|---|
| membros.visualizar (ficha completa) | A P S (`GET /members`, `/members/{id}`) — **TESOUREIRO removido em 2026-10-26** (ver item 5 abaixo) |
| membros.buscar | A P S T (`GET /members/lookup`: id, nome, status) |
| eventos.visualizar | **todos os perfis** (`isAuthenticated()` em `GET /events` e `/events/{id}`; desde o `fix(eventos)`, antes A P S M) |
| eventos.criar / eventos.editar | A S |
| eventos.excluir | A |
| financeiro.visualizar (lista, detalhe, summary) | A T P |
| financeiro.criar / financeiro.editar | A T |
| financeiro.excluir | A |
| categorias.visualizar | A T P |
| categorias.criar | A T |
| dashboard.visualizar | A P |
| dashboard.financeiro (bloco financeiro) | só A (regra no controller, não no `@PreAuthorize`) |

Problemas de regra:
1. ~~**MEMBRO não tem tela**~~ → **resolvido na Fundação**: rota inicial por perfil (`rotaInicialDoPerfil`): MEMBRO → `/eventos`.
2. **TESOUREIRO e SECRETARIO sem dashboard** (403). Contornado no front: T começa em `/financeiro`, S em `/membros`, e o item "Painel" não aparece no menu deles. Continua em aberto se o `@PreAuthorize` deve ser ampliado (pendência 6).
3. **PASTOR e o bloco financeiro do dashboard — regra vigente confirmada no código.** `DashboardController.obter` calcula `incluirDadosFinanceiros` só quando a autoridade é `ROLE_ADMINISTRADOR`, e `DashboardService.gerar` devolve `resumoFinanceiroMesAtual = null` nos demais casos. É intencional (está explícito no código), mas inconsistente: o PASTOR tem `financeiro.visualizar` e pode chamar `/financial/summary` diretamente. O front espelha a regra como está (`dashboard.financeiro` = só A; teste dedicado em `permissoes.test.js`). Decisão em aberto para o módulo Dashboard: mostrar o bloco ao PASTOR via `/financial/summary` ou pedir a mudança no backend.
4. **RN09 — critério conferido no código (Eventos, 2026-10-27).** `EventoService.jaEncerrado` = `LocalDateTime.of(data, horario).isBefore(LocalDateTime.now(clock))` sobre o evento **gravado**, com o `Clock` no fuso `APP_TIMEZONE`; só a autoridade `ROLE_ADMINISTRADOR` passa, os demais recebem **409**. Não há status nem hora de término: "encerrado" = **o horário de início já passou** (no instante exato do início ainda não; `EventoServiceTest` cobre o limite). O front usa o mesmo critério (`schemas/regrasEvento.js`, `isEventoEncerrado`), com o "agora" em `America/Sao_Paulo` (`FUSO_HORARIO_SERVIDOR`), não no fuso do navegador — se `APP_TIMEZONE` mudar, mude junto. Não cabe na matriz: `situacaoEdicaoEvento(perfil, evento, agora)` decide — A sempre edita; S vê "Editar" desabilitado (`aria-disabled` + `title` + `aria-describedby` com o motivo) e um aviso nos detalhes; abrindo `/eventos/:id/editar` de evento encerrado pela URL, S vê o motivo no lugar do formulário. Se o evento começar com o formulário aberto, o 409 do backend aparece no topo do formulário (nada do que foi digitado se perde).
5. **TESOUREIRO e a ficha de membros — corrigido em 2026-10-26.** O Tesoureiro estava nos `@PreAuthorize` de `GET /members` e `/members/{id}` desde a criação do controller (antes do módulo financeiro), sem justificativa registrada, e recebia CPF, contato e endereço. A única necessidade real é escolher o membro de um lançamento (`membroId` opcional); para isso existe agora `GET /members/lookup` (id, nome, status). A listagem de movimentações já traz `membroNome`, então o Tesoureiro não precisa de `/members/{id}`.
6. **Módulo Membros × pedido da sessão (2026-10-27).** Pedido e backend coincidem para A (tudo), S (lista, cadastra, edita; não exclui), P (só consulta) e M (sem acesso). O pedido não citava o **TESOUREIRO**: segue o backend — sem acesso a `/membros` (lista, detalhes, formulário), só `/members/lookup`. Nenhuma mudança em `permissoes.js`. As subpáginas usam as permissões do endpoint que chamam: `/membros/novo` → `membros.criar`, `/membros/:id` → `membros.visualizar`, `/membros/:id/editar` → `membros.editar` (P abrindo a URL de edição vê "Sem acesso").
7. **Módulo Eventos — regra vigente (2026-10-27, após o `fix(eventos)`).** Os documentos divergiam sobre o SECRETARIO (19-Permissoes: "consultar"; 04-CasosDeUso: "cadastrar eventos"). **Vale o backend**, que coincide com o 04-CasosDeUso: `POST` e `PUT /events` têm `hasAnyRole('ADMINISTRADOR','SECRETARIO')` — S cadastra e edita (respeitando a RN09) e **não exclui** (`DELETE` só A). A **consulta** (`GET /events` e `/events/{id}`) passou a `isAuthenticated()`: a agenda não é informação sensível, então todos os perfis veem, **inclusive o TESOUREIRO** (antes recebia 403). P, T e M só consultam. No front: `eventos.visualizar` inclui T em `permissoes.js` e em `permissoes.test.js`, o menu do T passou a ser "Eventos, Financeiro" (a rota inicial dele continua `/financeiro`), e as `ROTAS_EVENTOS` do mock aceitam qualquer perfil logado no `GET`. Subpáginas: `/eventos/novo` → `eventos.criar`, `/eventos/:id` → `eventos.visualizar`, `/eventos/:id/editar` → `eventos.editar`. Testes no backend: `EventoControllerSecurityTest`.

## 5. Pendências do backend

Por prioridade para o frontend (cada item que mude schema exige migration nova; nunca editar V1–V6):

1. **Fixar o formato da página explicitamente.** Hoje é o DIRECT por padrão do Spring Boot 4.1 (o Spring Data registra aviso recomendando VIA_DTO); uma atualização de versão poderia mudá-lo em silêncio. Sugestão: `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)` ou `spring.data.web.pageable.serialization-mode` no `application.yml`. O front aceita os dois formatos, mas o mock precisa acompanhar (`mock/paginacao.js`).
2. **Erros de validação estruturados por campo.** Hoje o front deduz o campo pelo texto da mensagem (seção 1, "Mapeamento de erros por campo"). Proposta, compatível com o formato atual (só acrescenta um campo opcional ao record `ApiError`):
   ```json
   {
     "timestamp": "2026-10-26T10:00:00",
     "status": 400,
     "error": "Bad Request",
     "message": "O CPF é obrigatório, E-mail inválido",
     "path": "/api/v1/members",
     "errors": [
       { "campo": "cpf", "mensagem": "O CPF é obrigatório" },
       { "campo": "email", "mensagem": "E-mail inválido" }
     ]
   }
   ```
   - `GlobalExceptionHandler.handleValidation`: montar `errors` a partir de `getFieldErrors()` (`FieldError::getField`, `FieldError::getDefaultMessage`); manter `message` como está.
   - 409 de unicidade (`MembroService.validarUnicidade` e futuros): `ConflictException` com o campo (ex.: `new ConflictException("email", "Já existe um membro com este e-mail")`) e o handler devolvendo `errors: [{ campo: "email", ... }]`.
   - Demais erros: `errors` ausente ou `[]`.
3. **Reset de senha utilizável**: URL base do frontend configurável (`FRONTEND_URL`) no link; envio real de e-mail (ou manter log e documentar para a demo). Hoje o link do log é relativo (`/reset-password?token=…`): na demo, abrir `http://localhost:5173` + o caminho do log.
3b. **Recuperação de senha — achados do módulo Autenticação (2026-10-26)**:
   1. ~~**BCrypt × `@Size(max = 72)`**~~ → **corrigido (fix(auth))**. Confirmado em teste: o `BCryptPasswordEncoder` lança `IllegalArgumentException` acima de 72 **bytes** (37 × "é" = 74 bytes), o que virava 500. Agora `@CabeNoBcrypt` (`validation/`) valida bytes UTF-8 no `ResetPasswordRequest` e no `LoginRequest` → 400 `"A nova senha é longa demais: o limite é de 72 bytes (letras acentuadas e símbolos ocupam 2 ou mais)"` (no login, `"A senha é longa demais…"`). `UsuarioService.criarSeNaoExistir` e `ADMIN_PASSWORD` (`CargaInicialRunner`) também recusam. O `@Size(6, 72)` continua, então uma senha ASCII com 73+ caracteres recebe as duas mensagens.
   2. **Reset não encerra sessões** — **backlog do TCC**. JWTs emitidos antes da troca continuam válidos até o `exp` (24 h): quem roubou a sessão continua dentro. Exige versão de credencial no token (ex.: coluna `senha_alterada_em` em nova migration, comparada ao `iat` no `JwtAuthenticationFilter`).
   3. ~~**`forgot-password` não normaliza o e-mail**~~ → **corrigido**: `util/NormalizadorEmail` (trim + minúsculas) usado no login, no forgot-password e no `UsuarioService`. Observação: espaços nas pontas nunca chegam ao serviço, porque o `@Email` já recusa (400); o front continua enviando sem espaços.
   4. **Enumeração por tempo e sem limite de tentativas** — **backlog do TCC**. Com e-mail existente e ativo o backend invalida tokens, grava um novo e "envia" o e-mail; sem ele, responde direto — a diferença de tempo pode revelar o cadastro (com SMTP real, ainda mais). Não há rate limit em `/auth/login` nem em `/auth/forgot-password`. Sugestão: envio assíncrono (`@Async`/fila) + limite por IP/e-mail (ex.: Bucket4j).
   5. ~~**Tokens anteriores continuam válidos**~~ → **corrigido**: `PasswordResetTokenRepository.invalidarPendentes` marca `usado = true` nos tokens pendentes do usuário antes de gerar o novo (sem migration: reaproveita a coluna `usado`).
   6. ~~**Usuário inativo recebe link**~~ → **corrigido**: `forgotPassword` filtra `ativo` (mesma resposta 200 e mesma mensagem), e `resetPassword` recusa token de usuário desativado depois do pedido (400 de token inválido).
4. **Filtros de data com um só limite** em `/events` e `/financial` (hoje um só parâmetro é ignorado em silêncio) e validação `dataInicio <= dataFim` (inclusive em `summary`). Hoje um período invertido devolve lista vazia, sem erro. O front de Eventos contorna: exige as duas datas, em ordem, antes de consultar.
5. **Financeiro**: filtros `tipo`/`categoriaId` na listagem; endpoint de série mensal (fluxo de caixa/gráfico); totais por categoria (relatório); `GET/PUT/DELETE` de categoria.
6. **Dashboard**: definir quem acessa (T, S?); PASTOR e o bloco financeiro (seção 4, item 3); série para gráficos; "novos membros" (exige `data_cadastro` em `membros`).
7. **Usuários**: CRUD `/users` (A), ativar/desativar, trocar perfil.
8. **Meu perfil**: vínculo `usuarios.membro_id`, `GET/PUT /me`, `PUT /me/password`.
9. **Nome do usuário**: claim `nome` no JWT ou `GET /auth/me` (o front já lê `payload.nome` se vier).
10. **Membros** — backlog do TCC. (O filtro por status saiu daqui: feito no commit `feat(api)` de 2026-10-27, `GET /members?status=` com o mesmo `buscarPorNomeEStatus` do lookup.)
    - Busca por e-mail e CPF (o pedido da tela previa nome/e-mail/CPF; a tela só busca por nome).
    - Busca sem acento (`unaccent`); unicidade de e-mail case-insensitive (`lower(email)`).
    - RN14 Fase 2 (confirmação administrativa para excluir membro com histórico): endpoint ou parâmetro a definir; no front entra como etapa nova em `hooks/useExclusaoMembro.js`.
11. **Eventos** — achados do módulo Eventos (2026-10-27):
    1. ~~**Fuso da JVM**~~ → **corrigido (`fix(eventos)`)**: `APP_TIMEZONE` (`app.time.zone`, `TimeProperties`) + bean `Clock` (`ClockConfig`) injetado no `EventoService`; o Dockerfile usa o mesmo valor em `-Duser.timezone` e o compose o repassa. Observação: a imagem já fixava `TZ`/`-Duser.timezone=America/Sao_Paulo`, então no container a RN09 já estava certa; o erro aparecia fora do Docker (`./mvnw`, IDE ou nuvem em UTC sem o Dockerfile). Depois, no `refactor(api)`, o `Clock` chegou ao `DashboardService` ("hoje", aniversariantes — o mês agora é parâmetro da consulta, não `CURRENT_DATE` — e resumo do mês), ao `AuthService` (validade do link de redefinição) e ao `DadosDemonstracaoService`, sem mudar comportamento; testes em `DashboardServiceTest`, `AuthServiceTest` e `DadosDemonstracaoServiceTest`.
    2. ~~**RN09 devolvia 400**~~ → **corrigido (`fix(eventos)`)**: `ConflictException` → 409. Front e mock atualizados.
    3. ~~**`@PageableDefault(sort = "data")` sem desempate**~~ → **corrigido (`fix(eventos)`)**: padrão `data`, `horario`, `id`.
    4. ~~**Sem teste do `EventoService`**~~ → **corrigido (`fix(eventos)`)**: `EventoServiceTest` (Clock fixo: futuro editável por S, já iniciado bloqueado para S e liberado para A, limite exato do início, fuso de São Paulo × UTC, RN09 olha o evento gravado) e `EventoControllerSecurityTest` (consulta por todos, escrita por A/S, exclusão só A, 409, ordenação padrão).
    5. **RN09 só olha o evento gravado — decisão (2026-10-27): mantido.** O Secretário **pode cadastrar evento com início no passado** (cadastro atrasado, implantação do sistema com a agenda já em andamento), e o `EventoRequest` não recusa data/hora passada. Ele também pode mover um evento futuro para uma data passada. O efeito colateral é que, depois de gravado, esse evento já está encerrado e o Secretário não consegue mais corrigi-lo (só o Administrador). Comportamento coberto por teste (`EventoServiceTest.olhaOEventoGravadoENaoOsValoresNovos`); o front valida igual ao backend (aceita). A janela de correção para o Secretário está no backlog do TCC (seção 6, "Backlog do TCC (eventos)").
    6. **Hora de término e busca por título** → backlog do TCC (seção 6, "Backlog do TCC (eventos)").
12. **Sessão**: `POST /auth/refresh` (opcional para o TCC). O front não tenta renovar; o ponto de extensão é `tratarErroResposta` em `services/http/httpClient.js`.

## 6. Checklist por módulo

### Fundação (concluída em 2026-10-26)
- [x] Rota inicial por perfil (MEMBRO → eventos; T → financeiro; A/P → dashboard; S → membros): `rotaInicialDoPerfil` em `constants/rotas.js`, usada por `RedirecionamentoInicial`, `GuestRoute` (`destinoAposLogin`) e 404.
- [x] Menu (`constants/navegacao.js`) filtrado por permissão (`itensMenuDoPerfil`) + breadcrumb (`trilhaDoCaminho` + `components/ui/Breadcrumb`).
- [x] Rotas `/dashboard`, `/eventos`, `/financeiro` protegidas por `RequirePermission`, com `EmConstrucaoPage` até cada módulo existir.
- [x] `React.lazy` nas páginas (`routes/AppRoutes.jsx`) com `Suspense` → `CarregandoPagina`.
- [x] Utils compartilhados: `utils/datas.js` (`formatarData`, `dataBrParaIso`, `formatarHorario`, `formatarDataHora` — por texto, sem "voltar um dia") e `utils/moeda.js` (`formatarMoeda` BRL, `arredondarValor`, `lerValorBr`).
- [x] Corrigir o split de erro 400 em `", "`: mapeador genérico `schemas/errosServidor.js` (provisório, depende do texto — pendência 2); `membroSchema` também reconhece as mensagens de `@Size`.
- [x] Paginação: `montarParametrosPagina` + `useConsultaPaginada` (genérico; `useMembros` usa).
- [x] RBAC: matriz completa (seção 4), `<PodeAcessar>`, testes da matriz, do menu, da rota inicial e das rotas por perfil.
- [x] Cliente HTTP: interceptores extraídos (`anexarToken`, `tratarErroResposta`) e testados (Bearer, 401, 403, 400, 409, tempo esgotado, rede). Sem refresh (pendência 12).
- [x] Componentes: `Card`, `Table` (tabela/cartões; `MembrosLista` migrada), `Breadcrumb`, `CarregandoPagina`. Os demais (Button, campos, Modal, ConfirmDialog, Pagination, Alert, Toast, Skeleton, EmptyState) já existiam.
- [x] Testes de componente: `jsdom` + `@testing-library/react`; arquivos `*.test.jsx` com `// @vitest-environment jsdom` e `test-utils/componentes.jsx` (`renderizarComPerfil`).
- [x] Mock: estrutura para novos handlers (`handlers/<modulo>.js` exporta suas rotas; validação de corpo por rota) e `/auth/**` inexistente → 404. As coleções (eventos, categorias, movimentações) entram com cada módulo, junto dos handlers.
- [x] Confirmar o formato real da `Page`: DIRECT (código: padrão do Spring Boot 4.1; API real conferida em 2026-10-26); mock alinhado.

### Autenticação (concluída em 2026-10-26)
- [x] Contrato conferido no `AuthController`/DTOs/`AuthService`: login, forgot-password, reset-password; **sem** `/auth/refresh` (sessão segue a Fundação: expiração por timer, aba e 401).
- [x] Login: validação no cliente (e-mail, senha `@NotBlank`), guarda de envio duplo (`hooks/useEnvioUnico.js`, por ref) + botão em carregamento, 401 com mensagem fixa "E-mail ou senha inválidos" sem marcar campo (`loginSchema.mensagemErroLogin`), e-mail em minúsculas, link "Esqueci minha senha". Pós-login: rota de origem, senão `rotaInicialDoPerfil` (Painel para A/P; S/T/M não têm acesso ao `/dashboard` no backend).
- [x] Tela "Esqueci minha senha" (`/esqueci-senha`, dentro de `AuthLayout` + `GuestRoute`): mensagem neutra **fixa do front** para qualquer desfecho (200, 4xx, 5xx, rede, tempo esgotado) — `hooks/useRecuperacaoSenha.useEsqueciSenha`.
- [x] Tela "Redefinir senha" (`/reset-password?token=`, dentro de `AuthLayout` **sem** `GuestRoute`, para quem está logado não perder o token num redirecionamento): nova senha + confirmação (6–72 caracteres, `@NotBlank`, ≤ 72 bytes), token ausente/inválido/expirado → mensagem e link "Pedir um novo link".
- [x] Schemas: `schemas/senhaSchema.js` (validações, mensagens, `isTokenInvalido`, `mapearErroRedefinicao`) e `MENSAGEM_CREDENCIAIS_INVALIDAS` em `loginSchema.js`.
- [x] Sessão: `useAuth()` expõe `usuario { email, nome, perfil }` (nome `null` até a pendência 9); "Sair" apaga o `sessionStorage` e o estado — não há cache de dados em módulo (os dados vivem nos componentes, desmontados no logout). Senha nunca é guardada (teste confere o `sessionStorage`); nenhum token vai para o console (ESLint proíbe `console`).
- [x] Mock: 3 handlers com as mensagens dos DTOs (inclusive `@CabeNoBcrypt`), e-mail normalizado no login e no forgot-password, só usuário ativo recebe link, pedido novo invalida os anteriores, token de 30 min de uso único, caixa de e-mail simulada; rotas públicas passam pelo `@Valid` simulado.
- [x] Comentário de `authService.js` sobre maiúsculas atualizado.
- [x] Testes: componentes (`LoginForm`, `EsqueciSenhaForm`, `RedefinirSenhaForm` — sucesso, credenciais erradas, envio duplo, logout, mensagem neutra em 5 desfechos, token inválido/ausente, 400 de senha), `senhaSchema.test.js` e fluxo forgot → reset → login no `servidorSimulado.test.js`. `test-utils/transporte.js` troca só o adaptador do axios (interceptores e `ApiError` reais).
- [x] Pendências novas do backend: seção 5, item 3b. Itens 1, 3, 5 e 6 corrigidos no backend (commit `fix(auth)`, testes em `AuthServiceTest`, `AuthControllerTest`, `SenhaBcryptTest`, `UsuarioServiceTest` e `RecuperacaoSenhaIntegrationTest`).

### Backlog do TCC (segurança da autenticação)
- [ ] Encerrar as sessões abertas ao redefinir a senha (seção 5, item 3b.2): migration com `senha_alterada_em` em `usuarios` + recusa no `JwtAuthenticationFilter` de token com `iat` anterior.
- [ ] Mitigar enumeração por tempo e força bruta (seção 5, item 3b.4): envio de e-mail assíncrono no forgot-password e rate limit em `/auth/login` e `/auth/forgot-password`.

### Membros (concluído em 2026-10-27)
- [x] Contrato conferido no `MembroController`/`MembroRequest`/`MembroService` (seção 2, linhas 4–8); permissões conferidas (seção 4, item 6).
- [x] Listagem `/membros`: tabela paginada, ordenação por coluna (`aria-sort`; "Ordenar por" no modo cartões), busca por nome com espera de 400 ms, filtro por status, estados vazio (com e sem filtro), carregando e erro. Busca, status, página e ordem na URL (`schemas/consultaMembros.js`, `hooks/useConsultaMembrosUrl.js`); valores inválidos na URL voltam ao padrão (sem 400).
- [x] `sort` com desempate (`nome,asc`, `id,asc`) para paginação estável; axios com `paramsSerializer: { indexes: null }` (`sort=a&sort=b`).
- [x] Filtro por status no servidor: backend ganhou `status` no `GET /members` (`feat(api)`; testes em `MembroServiceTest` e `MembroControllerSecurityTest`); o front envia `?status=` e o mock filtra igual (400 para status inválido).
- [x] Usa `GET /members/{id}` em detalhes e edição (decidido: rotas próprias, dados sempre frescos).
- [x] Cadastro/edição: um só `MembroForm` (`MembroEditor` em `/membros/novo` e `/membros/:id/editar`); validação espelhando o `MembroRequest`; máscaras de CPF, telefone e data (DD/MM/AAAA → AAAA-MM-DD); RN03/RN04: 409 no campo e-mail/CPF; 400 por mensagem do DTO.
- [x] RN11: status obrigatório com os valores do enum e rótulos Ativo/Afastado/Visitante.
- [x] Detalhes `/membros/:id` com todos os campos.
- [x] Exclusão sempre pelo `ConfirmDialog` com o nome; RN14 (409) com explicação e atalho "Alterar status"; extensível para a Fase 2 (`useExclusaoMembro`, `schemas/exclusaoMembro.js`).
- [x] Checar mensagens de `@Size` (nome, e-mail, telefone, endereço) no `mapearErroDoServidor` (feito na Fundação).
- [x] Mock: RN14 simulado, `sort` repetido, `?status=` filtrado como no real (mesma função para `/members` e `/lookup`); testes em `servidorSimulado.test.js`.
- [x] Testes: `MembrosPage.test.jsx` (paginação, busca, filtro, ordenação, URL, vazio, carregando, botões por perfil, exclusão e RN14), `MembroFormPage.test.jsx` (validação, máscaras, 409 e-mail/CPF, 400, payload, edição, 404), `MembroDetalhesPage.test.jsx` (dados e botões por perfil, exclusão), `AppRoutes.test.jsx` (subpáginas por perfil) e puros (`consultaMembros`, `exclusaoMembro`, `ordenacao`, `pagina`, `datas`, `membroSchema`, `Table`, `navegacao`).
- [x] Erros do servidor: no máximo uma mensagem por campo (a primeira), regra genérica de `criarMapeadorDeErros`; testes no mapeador, no formulário de membro e na redefinição de senha.
- [ ] Rodar o roteiro manual com o backend real (`DEMO_DATA_ENABLED=true`).

### Eventos (concluído em 2026-10-27)
- [x] Contrato conferido no `EventoController`/`EventoRequest`/`EventoService` (seção 2, linhas 9–13). Permissões (seção 4, itens 4 e 7): após o `fix(eventos)`, `eventos.visualizar` inclui o TESOUREIRO em `permissoes.js`, `permissoes.test.js`, menu e `ROTAS_EVENTOS` do mock.
- [x] `services/events/eventosService.js` (listar com período — só envia os dois limites juntos —, buscarPorId, cadastrar, atualizar, excluir).
- [x] `schemas/eventoSchema.js`: limites 150/1000/255, **RN08 (data obrigatória e válida)**, horário obrigatório `HH:mm` 24 h, payload com `null` e textos aparados; `mapearErroDoServidor` com as mensagens do `EventoRequest`.
- [x] Data e hora sem fuso: máscaras DD/MM/AAAA e HH:MM; payload `"AAAA-MM-DD"`/`"HH:mm"` exatamente como digitado; volta `"19:00:00"` → `19:00`; nada passa por `new Date("AAAA-MM-DD")`.
- [x] Calendário mensal (RF10) **sem biblioteca** (`utils/calendario.js`, aritmética sobre texto ISO): navegação mês anterior/Hoje/próximo, grade de 6 semanas (`dataInicio`/`dataFim` = 1º e último dia da grade, sempre os dois, `size=2000`, aviso se vier incompleto), clique no evento → detalhes, "+" no dia → cadastro com a data, "+N mais" → lista do dia. No celular (< 720 px), agenda do mês por dia.
- [x] Lista paginada (10), ordenação por data ou título (com desempate), filtro por período (as duas datas, em ordem), estados vazio/carregando/erro.
- [x] Visão (calendário/lista), mês, período, página e ordem na URL (`schemas/consultaEventos.js`, `hooks/useConsultaEventosUrl.js`); inválidos voltam ao padrão.
- [x] Detalhes, cadastro/edição em **rotas próprias** (`/eventos/novo`, `/eventos/:id`, `/eventos/:id/editar`, como em Membros, no lugar da modal prevista), exclusão com confirmação (só A).
- [x] RN09: mesmo critério do backend, no fuso do servidor; "Editar" desabilitado com o motivo para S; edição pela URL bloqueada para S; **409** tratado no topo do formulário.
- [x] Mock: handlers (`@Valid`, corpo ilegível, 400 de parâmetro de data, filtro só com os dois limites, ordenação padrão `data`/`horario`/`id`, `GET` para qualquer perfil logado, RN09 com 409 e o relógio simulado) + os 7 eventos do `DadosDemonstracaoService.criarEventos`.
- [x] Testes: `eventoSchema` (data obrigatória), `regrasEvento` (encerrado × perfil, fuso), `consultaEventos`, `calendario`, `datas`, `EventosPage.test.jsx` (renderização da lista, paginação, ordenação, período, alternância na URL, calendário, agenda, ações por perfil, exclusão), `EventoFormPage.test.jsx`, `EventoDetalhesPage.test.jsx`, `AppRoutes.test.jsx` e `servidorSimulado.test.js`.
- [x] Backend (`fix(eventos)`, antes do commit do front): fuso configurável + `Clock`, RN09 → 409, consulta para qualquer autenticado, ordenação padrão `data`/`horario`/`id`, `EventoServiceTest` e `EventoControllerSecurityTest`. Conferido na API real em container: T consulta (200) e não cadastra (403), PUT de S em evento encerrado → 409, JVM com `-Duser.timezone=$APP_TIMEZONE`.
- [ ] Rodar o roteiro manual com o backend real (`DEMO_DATA_ENABLED=true`).

### Backlog do TCC (eventos)
- [ ] **Hora de término** do evento: migration com `horario_fim` (ou `duracao_minutos`) em `eventos`, campo no `EventoRequest`/`EventoResponse` e no formulário. Com ela, decidir se a RN09 passa a considerar o fim (hoje um culto em andamento já está "encerrado" e o Secretário não consegue corrigir nem o local).
- [ ] **Janela de correção para o Secretário**: hoje um evento cadastrado com início no passado (decisão da seção 5, item 11.5) nasce encerrado, e só o Administrador corrige. Proposta: a RN09 libera o Secretário durante um prazo após o **cadastro** (ex.: 24 h), o que exige migration com `criado_em` em `eventos`, o prazo configurável e a mesma regra em `EventoService.jaEncerrado` e em `situacaoEdicaoEvento` (front). Definir o prazo com a igreja.
- [ ] **Busca por título** (e talvez local) no `GET /events` (`?titulo=`, contendo e sem diferenciar maiúsculas, como o `nome` de membros); no front, campo de busca na lista com a espera de 400 ms e o termo na URL.

### Financeiro
- [ ] Permissões (financeiro + categorias) + teste + mock.
- [ ] `services/financial/` (movimentações, summary, categorias).
- [ ] Schema de movimentação: valor > 0, 2 casas, ≤ 10 dígitos inteiros; tipo; categoria filtrada pelo tipo (`GET /financial-categories?tipo=`); membro opcional (seletor com `membrosService.buscarResumo` → `GET /members/lookup`, permissão `membros.buscar`; T **não** usa `/members`).
- [ ] Telas: receitas, despesas (filtragem no cliente por `tipo` enquanto o backend não filtra — atenção: paginação mistura os dois tipos), fluxo de caixa (summary por mês), relatórios (o que der com summary).
- [ ] Cadastro de categoria (A T); tratar 409.
- [ ] Tratar 400 "tipo incompatível com categoria" e 404 de categoria/membro.
- [ ] Mock: handlers + dados (espelhar categorias e lançamentos do `DadosDemonstracaoService`).

### Dashboard
- [ ] Permissões `dashboard.visualizar` (A P) e bloco financeiro (só A, ou via summary para P — decidir).
- [ ] Cards: total de membros, ativos, próximos eventos (≤5), aniversariantes do mês, receitas/despesas/saldo do mês.
- [ ] Gráficos: só com dados disponíveis (N × `/financial/summary`) ou após pendência 5/6.
- [ ] "Novos membros": fora até existir `data_cadastro`.
- [ ] Mock: handler `GET /dashboard` derivado do banco simulado (respeitando `null` para não-A).

### Usuários/Perfil
- [ ] Bloqueado pelo backend (pendências 7–9). Só iniciar depois que os endpoints existirem; até lá, nada de tela.

### Revisão final
- [ ] `permissoes.js` × todos os `@PreAuthorize` (linha a linha) e `permissoes.test.js`.
- [ ] `servidorSimulado.test.js` cobrindo todas as rotas novas.
- [ ] Rodar todos os fluxos com backend real (`DEMO_DATA_ENABLED=true`) com os 5 perfis.
- [ ] `npm test`, `npm run lint`, `npm run build`.
- [ ] Atualizar `frontend/README.md` (contrato consumido) e este arquivo.
- [ ] Produção: `VITE_API_BASE_URL` absoluto, `CORS_ALLOWED_ORIGINS` com o domínio da Vercel, `VITE_API_TIMEOUT_MS=90000`.
