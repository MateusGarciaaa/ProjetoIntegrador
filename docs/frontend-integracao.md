# Integração frontend × backend — diagnóstico

> Fotografia de 2026-10-26 (commit 2087a3c), atualizada ao fim da Fundação no mesmo dia. Ler no início de cada sessão. Atualizar a tabela e o checklist ao concluir cada módulo.
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
- Códigos: 400 = validação, JSON/data/enum inválido, `{id}` não-UUID, parâmetro obrigatório ausente, `sort` inválido **e regra de negócio** (`BusinessException`: evento encerrado, tipo ≠ categoria, token de reset inválido); 401 = credenciais erradas no login / token ausente, inválido ou vencido; 403 = perfil sem permissão (com corpo); 404 = registro ou rota inexistente; 405 = método errado; 409 = conflito (unicidade, RN14, violação de constraint); 500 = genérico.
- JWT: `sub` = e-mail, `perfil` = `ROLE_<PERFIL>`, `iat`, `exp`; validade 86400 s. Sem claim `nome`, sem refresh token.
- Fuso: container e banco em `America/Sao_Paulo` (Dockerfile/compose). "Hoje", "mês atual" e "evento encerrado" são calculados no servidor.

## 2. Inventário de endpoints

Perfis: A = ADMINISTRADOR, P = PASTOR, S = SECRETARIO, T = TESOUREIRO, M = MEMBRO.

| # | Método e rota | Parâmetros | Entrada (validações) | Saída | Perfis | Classificação |
|---|---|---|---|---|---|---|
| 1 | `POST /auth/login` | — | `LoginRequest { email @NotBlank @Email, password @NotBlank }` | 200 `LoginResponse { token, type:"Bearer", expiresIn (s) }`; 401 `"E-mail ou senha inválidos"` | público | **INTEGRADO** |
| 2 | `POST /auth/forgot-password` | — | `{ email @NotBlank @Email }` | 200 `{ message }` (sempre a mesma, exista ou não o e-mail) | público | **NÃO USADO** |
| 3 | `POST /auth/reset-password` | — | `{ token @NotBlank, newPassword @NotBlank @Size(6..72) }` | 204; 400 `"Token de redefinição inválido ou expirado"` | público | **NÃO USADO** |
| 4 | `GET /members` | `nome` (contém, ignora maiúsc., diferencia acento), `page`, `size`=20, `sort`=`nome` | — | 200 `Page<MembroResponse>` | A P S T | **INTEGRADO** (front: `size=10`, `sort=nome,asc`) |
| 5 | `GET /members/{id}` | `id` UUID | — | 200 `MembroResponse`; 404 | A P S T | **NÃO USADO** (mock implementa; front edita a partir da linha da lista) |
| 6 | `POST /members` | — | `MembroRequest { nome @NotBlank @Size150, cpf @NotBlank @Pattern \d{11}, email @NotBlank @Email @Size150, telefone @Size20, endereco @Size255, dataNascimento, dataBatismo, dataConversao (LocalDate), status (nulo→ATIVO) }` | 201 `MembroResponse`; 409 e-mail/CPF | A S | **INTEGRADO** |
| 7 | `PUT /members/{id}` | `id` | `MembroRequest` | 200; 404; 409 | A S | **INTEGRADO** |
| 8 | `DELETE /members/{id}` | `id` | — | 204; 404; 409 RN14 (tem movimentação financeira) | A | **INTEGRADO** (409 RN14 só existe no real; mock não simula) |
| 9 | `GET /events` | `dataInicio`, `dataFim` (ISO; **só filtra se os dois vierem**), `page`, `size`=20, `sort`=`data` | — | 200 `Page<EventoResponse>` | A P S M | **NÃO USADO** |
| 10 | `GET /events/{id}` | `id` | — | 200 `EventoResponse { id, titulo, descricao, data, horario, local }`; 404 | A P S M | **NÃO USADO** |
| 11 | `POST /events` | — | `EventoRequest { titulo @NotBlank @Size150, descricao @Size1000, data @NotNull, horario @NotNull (LocalTime), local @Size255 }` | 201 | A S | **NÃO USADO** |
| 12 | `PUT /events/{id}` | `id` | `EventoRequest` | 200; 400 se evento já encerrado e usuário não é A (RN09); 404 | A S | **NÃO USADO** |
| 13 | `DELETE /events/{id}` | `id` | — | 204; 404 | A | **NÃO USADO** |
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
| Membros | Filtro por status, busca por CPF/e-mail, busca sem acento | Não existe |
| Usuários (admin) | CRUD de usuários, perfil, ativar/desativar (RN02) | Não existe (`UsuarioService` só serve à carga inicial) |
| Meu perfil | `GET/PUT /me`, trocar senha logado | Não existe; `Usuario` não tem vínculo com `Membro` → exige migration |

## 3. Divergências mock × backend real

O mock (`services/mock/`) só implementa `POST /auth/login` e as 5 rotas de `/members`. Qualquer outra rota no mock: em `/auth/**` → 404 sem token (como o `permitAll`); nas demais, sem token → 401, com token → 404. Cada módulo exporta suas rotas em `handlers/<modulo>.js` (`ROTAS_AUTH`, `ROTAS_MEMBROS`), reunidas em `ROTAS` de `servidorSimulado.js`; paginação simulada em `mock/paginacao.js` (`lerPageable`, `paginaSpring`).

| # | Assunto | Mock | Backend real | Impacto |
|---|---|---|---|---|
| 1 | Rotas cobertas | login + members | 22 endpoints | Eventos, financeiro, categorias, dashboard e reset de senha **só funcionam com backend real** até ganharem handler |
| 2 | Rotas públicas desconhecidas | ~~401~~ → **corrigido na Fundação**: `/auth/**` inexistente responde 404 sem token. `forgot-password`/`reset-password` ainda sem handler (404 no mock) | 200 / 204 | Handlers entram no módulo Autenticação |
| 3 | E-mail no login | comparação exata (`handlers/auth.js`) | normaliza `trim().toLowerCase()` (`UsuarioDetailsServiceImpl`) | `Admin@…` entra no real e falha no mock. Comentário em `authService.js` ("diferenciando maiúsculas") está desatualizado |
| 4 | Mensagens de validação do login | padrões do Hibernate (`"não deve estar em branco"`, `"deve ser um endereço de e-mail bem formado"`) | do DTO: `"O e-mail é obrigatório"`, `"E-mail inválido"`, `"A senha é obrigatória"` | Texto diferente no erro; o front valida antes, então raro |
| 5 | RN14 (excluir membro com movimentação) | sempre 204 | 409 com mensagem | Caminho de erro do `ExcluirMembroDialog` não é exercitado no mock |
| 6 | Formato da página | ~~VIA_DTO~~ → **corrigido na Fundação**: DIRECT idêntico ao real (mesmas chaves e valores; `size` > 2000 reduzido para 2000) | DIRECT (conferido em 2026-10-26 com `GET /members?page=2&size=10&sort=nome,asc`) | Nenhum |
| 7 | Ordenação | `localeCompare('pt-BR')`; só o 1º `sort` | collation do Postgres; múltiplos `sort` | Ordem com acentos/maiúsculas pode diferir |
| 8 | `timestamp` do erro | ISO UTC com ms (23 chars) | `LocalDateTime` do servidor, até micros | Front não usa |
| 9 | Unicidade de e-mail do membro | exata | exata (índice sem `lower`) | Iguais; ambos aceitam `Ana@x` e `ana@x` (front grava minúsculo) |
| 10 | Dados de demo | 25 membros, 5 contas | idem com `DEMO_DATA_ENABLED=true` + eventos, categorias, movimentações | Mock não tem eventos/finanças |

Sem divergência: ordem auth → `{id}` → `@Valid` → `@PreAuthorize`; 400 para `{id}` não-UUID, corpo malformado, `sort` inválido; 405/404 de rota; mensagens 401/403/404/409 de membros; `size` máx. 2000; claims do JWT; `expiresIn` em segundos.

## 4. Divergências de permissão

**Fundação concluída:** `constants/permissoes.js` espelha todos os `@PreAuthorize` (16 permissões, comentário com o endpoint em cada linha) e `permissoes.test.js` transcreve a mesma tabela de forma independente. As `ROTAS` do mock ainda só cobrem membros (cada módulo acrescenta as suas). Uso no front: `usePermissao().pode(...)`, `<PodeAcessar permissao senao>`, `RequirePermission` (rotas → `SemAcessoPage`), `itensMenuDoPerfil` (menu) e `rotaInicialDoPerfil`.

| Permissão | Backend |
|---|---|
| eventos.visualizar | A P S M (`GET /events`, `/events/{id}`) |
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
4. **RN09**: SECRETARIO pode `PUT /events/{id}`, mas recebe **400** (não 403) se o evento já passou. Não cabe na matriz; o front deve desabilitar "Editar" em evento passado para não-admin e tratar o 400.

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
3. **Reset de senha utilizável**: URL base do frontend configurável (`FRONTEND_URL`) no link; envio real de e-mail (ou manter log e documentar para a demo).
4. **Filtros de data com um só limite** em `/events` e `/financial` (hoje um só parâmetro é ignorado em silêncio) e validação `dataInicio <= dataFim` (inclusive em `summary`).
5. **Financeiro**: filtros `tipo`/`categoriaId` na listagem; endpoint de série mensal (fluxo de caixa/gráfico); totais por categoria (relatório); `GET/PUT/DELETE` de categoria.
6. **Dashboard**: definir quem acessa (T, S?); PASTOR e o bloco financeiro (seção 4, item 3); série para gráficos; "novos membros" (exige `data_cadastro` em `membros`).
7. **Usuários**: CRUD `/users` (A), ativar/desativar, trocar perfil.
8. **Meu perfil**: vínculo `usuarios.membro_id`, `GET/PUT /me`, `PUT /me/password`.
9. **Nome do usuário**: claim `nome` no JWT ou `GET /auth/me` (o front já lê `payload.nome` se vier).
10. **Membros**: filtro por status; busca sem acento (`unaccent`); unicidade de e-mail case-insensitive (`lower(email)`).
11. **Sessão**: `POST /auth/refresh` (opcional para o TCC). O front não tenta renovar; o ponto de extensão é `tratarErroResposta` em `services/http/httpClient.js`.

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
- [x] Cliente HTTP: interceptores extraídos (`anexarToken`, `tratarErroResposta`) e testados (Bearer, 401, 403, 400, 409, tempo esgotado, rede). Sem refresh (pendência 11).
- [x] Componentes: `Card`, `Table` (tabela/cartões; `MembrosLista` migrada), `Breadcrumb`, `CarregandoPagina`. Os demais (Button, campos, Modal, ConfirmDialog, Pagination, Alert, Toast, Skeleton, EmptyState) já existiam.
- [x] Testes de componente: `jsdom` + `@testing-library/react`; arquivos `*.test.jsx` com `// @vitest-environment jsdom` e `test-utils/componentes.jsx` (`renderizarComPerfil`).
- [x] Mock: estrutura para novos handlers (`handlers/<modulo>.js` exporta suas rotas; validação de corpo por rota) e `/auth/**` inexistente → 404. As coleções (eventos, categorias, movimentações) entram com cada módulo, junto dos handlers.
- [x] Confirmar o formato real da `Page`: DIRECT (código: padrão do Spring Boot 4.1; API real conferida em 2026-10-26); mock alinhado.

### Autenticação
- [ ] Telas "Esqueci minha senha" (`POST /auth/forgot-password`) e "Redefinir senha" (`POST /auth/reset-password`, lendo `?token=`), dentro do `AuthLayout`/`GuestRoute`. Rota `/reset-password` casa com o link do log.
- [ ] Schemas: e-mail; nova senha 6–72 + confirmação.
- [ ] Mock: handlers de forgot/reset (rotas públicas) e login com e-mail normalizado + mensagens do `LoginRequest`.
- [ ] Atualizar comentário de `authService.js` sobre maiúsculas.
- [ ] Testes de schema e do mock.

### Membros
- [ ] Mock: simular 409 RN14 (ex.: membros com flag de movimentação, ou derivar das movimentações quando existirem).
- [ ] Decidir se usa `GET /members/{id}` (detalhe/edição) ou mantém dados da lista.
- [x] Checar mensagens de `@Size` (nome, e-mail, telefone, endereço) no `mapearErroDoServidor` (feito na Fundação).
- [ ] (Se backend ganhar) filtro por status.

### Eventos
- [ ] Permissões (seção 4) + `permissoes.test.js` + `ROTAS` do mock.
- [ ] `services/events/eventosService.js` (listar com período, buscarPorId, cadastrar, atualizar, excluir).
- [ ] `schemas/eventoSchema.js` (limites 150/1000/255, data, horário `HH:mm`, payload com `null`).
- [ ] Lista paginada + calendário mensal (`dataInicio`/`dataFim` = 1º e último dia; sempre os dois; `size` alto, ≤ 2000).
- [ ] Detalhes, cadastro/edição em modal, exclusão (só A).
- [ ] RN09: bloquear edição de evento passado para S e tratar 400.
- [ ] Mock: handlers + dados iniciais (espelhar `DadosDemonstracaoService.criarEventos`).

### Financeiro
- [ ] Permissões (financeiro + categorias) + teste + mock.
- [ ] `services/financial/` (movimentações, summary, categorias).
- [ ] Schema de movimentação: valor > 0, 2 casas, ≤ 10 dígitos inteiros; tipo; categoria filtrada pelo tipo (`GET /financial-categories?tipo=`); membro opcional (busca em `/members` — T pode listar membros).
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
