# ChurchHub — Frontend

Interface web do ChurchHub (login, recuperação de senha e cadastro de membros), escrita para consumir o backend em `../backend` **exatamente como ele é**. O backend é a fonte da verdade: nomes de campo, perfis, mensagens de erro e regras de busca foram extraídos do código Java, não de suposições.

Stack: React 18, Vite 5, JavaScript, react-router-dom 6, axios, CSS Modules e Vitest. Sem biblioteca de UI.

## Como rodar

Requer Node 18+.

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

**Sem backend (modo demonstração):** no `.env`, defina `VITE_USE_MOCK_API=true`. O app passa a conversar com um backend simulado em memória, que imita o real (veja abaixo). Recarregar a página restaura os dados iniciais.

**Com o backend real:** mantenha `VITE_USE_MOCK_API=false`, suba o banco (`docker compose up -d` na pasta `backend`) e o Spring Boot na porta 8080. O servidor do Vite encaminha `/api` para `DEV_PROXY_TARGET`, então o navegador só fala com `localhost:5173` e o CORS não interfere em desenvolvimento. Para ter usuários para entrar, suba o backend com `DEMO_DATA_ENABLED=true` (mesmas contas do modo simulado) ou defina `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` do backend.

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com proxy para a API |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm test` | Roda os testes (Vitest) uma vez |
| `npm run lint` | ESLint (inclui regras de hooks e proíbe `console`) |

## Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Base da API, já com o prefixo `/api/v1` dos controllers. Com proxy use `/api/v1`; sem proxy, `http://localhost:8080/api/v1` (exige CORS funcionando no backend). |
| `VITE_USE_MOCK_API` | `false` | `true` liga o backend simulado. |
| `VITE_MOCK_TOKEN_EXPIRES_IN` | `86400` | Só no modo simulado: validade do token em segundos. Use `60` para ver o logout automático em ação. |
| `VITE_API_TIMEOUT_MS` | `15000` | Espera máxima por resposta da API. Em hospedagem gratuita, que "dorme", use `90000`. |
| `VITE_SHOW_DEMO_ACCOUNTS` | `false` | `true` mostra os botões das contas de demonstração também com o backend real (que precisa estar com `DEMO_DATA_ENABLED=true`). |
| `DEV_PROXY_TARGET` | `http://localhost:8080` | Só para o `npm run dev`; não vai para o navegador. |

Variáveis `VITE_*` são gravadas no código durante o build: ao mudar alguma em produção, é preciso gerar um novo deploy. Em produção, aponte `VITE_API_BASE_URL` para a URL absoluta da API e libere a origem do frontend em `CORS_ALLOWED_ORIGINS` no backend.

## Contas de demonstração

Todas com a senha **`demo123`**. Existem no modo simulado e também no backend real quando ele sobe com `DEMO_DATA_ENABLED=true`. Na tela de login, o bloco "Modo demonstração" preenche cada uma com um clique.

| Perfil | E-mail | O que vê em Membros |
|---|---|---|
| Administrador | `administrador@churchhub.local` | Lista, vê detalhes, cadastra, edita e exclui |
| Secretário | `secretario@churchhub.local` | Lista, vê detalhes, cadastra e edita |
| Pastor | `pastor@churchhub.local` | Só consulta (lista e detalhes) |
| Tesoureiro | `tesoureiro@churchhub.local` | Sem acesso à ficha (só a busca enxuta `/members/lookup`, para o Financeiro) |
| Membro | `membro@churchhub.local` | Página "Sem acesso" |

São 25 membros de exemplo, todos com CPF de dígito verificador válido. Ana Beatriz Carvalho, André Luiz Fontana, João Pedro Zanella e Mateus Oliveira Cruz têm dízimo lançado (no real, pelo `DadosDemonstracaoService`; no simulado, marcados no banco em memória): excluí-los dá o 409 da RN14.

## Contrato consumido

Extraído de `AuthController`, `MembroController`, DTOs, `JwtService`, `SecurityConfig`, `GlobalExceptionHandler`, `MembroService` e migrations.

**Autenticação.** `POST /api/v1/auth/login` com `{ email, password }` (`@NotBlank @Email` / `@NotBlank`). Responde `{ token, type: "Bearer", expiresIn }`, com `expiresIn` em **segundos** (86400). Credenciais erradas ou usuário inativo: 401 `"E-mail ou senha inválidos"`. O e-mail do login não diferencia maiúsculas. Só `/api/v1/auth/**`, o Swagger e `/actuator/health` são públicos. Não existe `/auth/refresh`.

**Recuperação de senha.** `POST /auth/forgot-password` com `{ email }` responde sempre 200 com a mesma mensagem; a tela `/esqueci-senha` mostra a sua própria mensagem neutra em qualquer desfecho (inclusive erro), para não revelar se o e-mail tem cadastro, e envia o e-mail em minúsculas (o backend também normaliza). Só usuário ativo recebe link, e cada pedido novo invalida os links anteriores. O backend gera um link `/reset-password?token=<UUID>` válido por 30 minutos e de uso único — hoje só registrado no log do Spring (`LoggingMailSender`); no modo simulado, ele aparece no bloco "E-mails simulados" da própria tela. `POST /auth/reset-password` com `{ token, newPassword }` (6 a 72 caracteres e no máximo 72 bytes; o login também recusa senha acima de 72 bytes com 400) responde 204, ou 400 `"Token de redefinição inválido ou expirado"`; a tela `/reset-password` lê o `?token=`, pede a confirmação da senha, também limita a 72 bytes (limite do BCrypt) e, com token inválido, oferece pedir um novo link.

**JWT.** Claims `sub` (e-mail), `perfil` (com prefixo, ex.: `ROLE_ADMINISTRADOR`), `iat` e `exp`. Não há claim de nome: o cabeçalho mostra o e-mail e passará a mostrar `nome` automaticamente se o backend começar a enviá-la.

**Membros** (`/api/v1/members`):

| Método e rota | Perfis (`@PreAuthorize`) | Resposta |
|---|---|---|
| `GET /members?nome=&status=&page=&size=&sort=` | ADMINISTRADOR, PASTOR, SECRETARIO | 200, `Page<MembroResponse>`; 400 se `status` for inválido |
| `GET /members/lookup?nome=&status=&page=&size=` | ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO | 200, `Page<{ id, nome, status }>` (máx. 20 por página, sempre por nome) |
| `GET /members/{id}` | ADMINISTRADOR, PASTOR, SECRETARIO | 200 ou 404 |
| `POST /members` | ADMINISTRADOR, SECRETARIO | 201, 400 ou 409 |
| `PUT /members/{id}` | ADMINISTRADOR, SECRETARIO | 200, 400, 404 ou 409 |
| `DELETE /members/{id}` | ADMINISTRADOR | 204, 404 ou 409 (RN14: tem movimentação financeira) |

A listagem usa `page` a partir de 0, `size=10` e `sort` repetido com desempate (ex.: `sort=status,desc&sort=nome,asc&sort=id,asc`; o axios envia chaves repetidas, como o Spring lê). A busca é **só por nome**, contendo o texto e sem diferenciar maiúsculas (`findByNomeContainingIgnoreCase`); diferencia acentos. O filtro por status vai para o servidor (`?status=ATIVO|AFASTADO|VISITANTE`).

**Telas de membros.** `/membros` (lista: busca com espera de 400 ms, filtro por status, ordenação pelo cabeçalho — ou "Ordenar por" no celular —, paginação; tudo refletido na URL, ex.: `?busca=ana&status=ATIVO&pagina=2&ordem=email,desc`), `/membros/:id` (detalhes, via `GET /members/{id}`), `/membros/novo` e `/membros/:id/editar` (o mesmo formulário; a edição sempre relê o membro). Datas são digitadas como DD/MM/AAAA e enviadas como AAAA-MM-DD. Exclusão sempre pelo `ConfirmDialog` com o nome do membro; o 409 da RN14 vira uma explicação com o atalho "Alterar status" (a etapa de confirmação administrativa da Fase 2 entra em `hooks/useExclusaoMembro.js`).

**Campos** (`MembroRequest`/`MembroResponse`, mesmos nomes em todo o frontend): `id`, `nome`, `cpf`, `email`, `telefone`, `endereco`, `dataNascimento`, `dataBatismo`, `dataConversao` (`AAAA-MM-DD`) e `status` (`ATIVO`, `AFASTADO`, `VISITANTE`; nulo vira `ATIVO`). Obrigatórios: `nome`, `cpf` (`\d{11}`) e `email`. Colunas: nome 150, cpf 11, email 150, telefone 20, endereço 255. CPF e e-mail são únicos (o e-mail é checado primeiro). O frontend envia CPF e telefone só com dígitos, e-mail em minúsculas e campos vazios como `null`.

**Eventos** (`/api/v1/events`):

| Método e rota | Perfis (`@PreAuthorize`) | Resposta |
|---|---|---|
| `GET /events?dataInicio=&dataFim=&page=&size=&sort=` | qualquer usuário autenticado (`isAuthenticated()`) | 200, `Page<EventoResponse>`; período só vale com as **duas** datas (inclusivo); data mal formada → 400; ordem padrão `data`, `horario`, `id` |
| `GET /events/{id}` | qualquer usuário autenticado | 200 ou 404 `"Evento não encontrado"` |
| `POST /events` | ADMINISTRADOR, SECRETARIO | 201 ou 400 |
| `PUT /events/{id}` | ADMINISTRADOR, SECRETARIO | 200, 400 (validação), **409** (RN09: evento já encerrado e quem edita não é ADMINISTRADOR), 404 |
| `DELETE /events/{id}` | ADMINISTRADOR | 204 ou 404 |

A agenda é de todos os perfis (o TESOUREIRO também consulta); só ADMINISTRADOR e SECRETARIO cadastram e editam, e só o ADMINISTRADOR exclui. "Encerrado" (RN09) é o critério do `EventoService`: data + horário de **início** antes de agora, no `Clock` da API no fuso `APP_TIMEZONE` (padrão `America/Sao_Paulo`); não há status nem hora de término. O frontend aplica o mesmo critério no mesmo fuso (`schemas/regrasEvento.js`) só para desabilitar "Editar" com o motivo; quem decide é o backend.

**Telas de eventos.** `/eventos` abre no calendário do mês (grade de domingo a sábado, sem biblioteca: `utils/calendario.js`; no celular, agenda por dia) ou na lista (período De/Até, ordenação por data ou título, paginação de 10). Visão, mês, período, página e ordem ficam na URL (ex.: `?mes=2026-11`, `?visao=lista&de=2026-11-01&ate=2026-11-30&pagina=2`). `/eventos/:id` (detalhes), `/eventos/novo` (`?data=AAAA-MM-DD` pré-preenche, vindo do "+" do calendário) e `/eventos/:id/editar` usam o mesmo formulário. **Campos** (`EventoRequest`/`EventoResponse`): `titulo` (obrigatório, 150), `descricao` (1000), `data` (obrigatória, RN08, `AAAA-MM-DD`), `horario` (obrigatório; resposta `"HH:mm:ss"`, o front envia `"HH:mm"`), `local` (255). Data e horário são digitados como DD/MM/AAAA e HH:MM (24 h) e enviados exatamente assim, sem passar por `Date`: o que se digita é o que aparece depois.

**Erros.** Corpo `{ timestamp, status, error, message, path }`, sem lista por campo. Em 400 de validação, as mensagens vêm juntas em `message`, separadas por `", "`. Mensagens fixas: 401 `"Sessão inválida ou expirada. Faça login novamente."` (token ausente, vencido ou adulterado), 403 (do `@PreAuthorize`) `"Você não possui permissão para acessar este recurso."`, 404 `"Membro não encontrado"`, 409 `"Já existe um membro com este e-mail"` / `"Já existe um membro com este CPF"` / membro com movimentações financeiras (RN14), 500 `"Ocorreu um erro interno no servidor."`. Entradas inválidas (JSON malformado, `{id}` que não é UUID, `sort` com campo inexistente, texto maior que a coluna) voltam como 400, nunca 500.

## Decisões de arquitetura

**Camadas com dependência em um só sentido.** `pages` → `components` → `hooks` → `services` → `utils`/`constants`. Componentes nunca chamam axios; serviços nunca importam React. Toda regra de formulário mora em `schemas/` (funções puras, testadas sem navegador).

**Um único formato de erro.** Tudo que sai de `services/` é um `ApiError` com `tipo`, `status` e `message` já prontos para a tela. É aqui que 401 ("sua sessão acabou") se separa de 403 com corpo ("seu perfil não pode"). Por segurança, um 403 sem corpo, que esta API não produz mas um proxy poderia, também encerra a sessão.

**Sessão controlada no cliente.** Além de reagir ao 401 do backend, o frontend guarda `expiresAt` (o menor entre `agora + expiresIn` e a claim `exp`, com 5 s de folga), agenda o logout automático, confere de novo ao voltar para a aba e recusa enviar uma requisição com sessão vencida. 401 fora do login, ou 403 sem corpo, também encerram a sessão. Na rota de login, 401 vira mensagem no formulário. A sessão fica em `sessionStorage` (some ao fechar o navegador); ao ser restaurada, o perfil é sempre relido do token, nunca do que foi salvo. O ideal, que depende do backend, seria cookie `httpOnly` com refresh token.

**Nada de `Authorization` em rotas públicas.** O interceptor só anexa o token fora de `/auth/`: rotas públicas não precisam dele.

**Backend simulado como adaptador do axios.** Em vez de duplicar os serviços em versões reais e falsas, o modo simulado troca apenas o transporte (`httpClient.defaults.adapter`). Os mesmos serviços, interceptores, normalização de página e conversão de erro rodam nos dois modos, e o resto do app não sabe qual está em uso. O servidor simulado segue a ordem do Spring (autenticação → conversão do `{id}` → `@Valid` → `@PreAuthorize` → serviço), responde 401 para token ausente ou vencido e 400 para entradas inválidas (inclusive `sort`), e tem sua própria cópia dos perfis por rota, independente da matriz do frontend. Ele é carregado por import dinâmico: fica num arquivo separado que nem é baixado quando o modo simulado está desligado.

**Página normalizada.** O backend (Spring Boot 4.1, sem configuração própria) serializa o `PageImpl` no modo padrão DIRECT: `{ content, pageable, totalElements, totalPages, last, size, number, sort, numberOfElements, first, empty }` (conferido na API real em 2026-10-26). O backend simulado responde exatamente nesse formato. `normalizarPagina` entrega sempre `{ content, number, size, totalElements, totalPages }` e também aceita o VIA_DTO (`{ content, page: { ... } }`), caso o backend venha a fixá-lo. `montarParametrosPagina` monta a query (`page`, `size` limitado a 2000, `sort` e filtros, descartando os vazios) e `useConsultaPaginada` busca a página, cancelando a anterior.

**Erro ao lado do campo, por enquanto pelo texto.** O backend não diz a que campo pertence cada erro. `schemas/errosServidor.js` (`criarMapeadorDeErros`) deduz o campo pela mensagem exata do DTO (400) ou por palavra-chave (409: e-mail, CPF). É provisório: se o backend mudar o texto, o erro só passa para o topo do formulário. O formato estruturado proposto está em `docs/frontend-integracao.md`.

**Permissões só escondem, não autorizam.** `constants/permissoes.js` espelha os `@PreAuthorize` de todos os controllers linha a linha, e um teste transcreve a mesma tabela: se o backend mudar, o teste obriga a revisar. `usePermissao().pode(...)` e `<PodeAcessar permissao senao>` escondem botões e blocos; `RequirePermission` protege rotas (mostra "Sem acesso", sem deslogar); o menu (`itensMenuDoPerfil`) só lista áreas permitidas; e cada perfil começa na sua área (`rotaInicialDoPerfil`: A/P → Painel, S → Membros, T → Financeiro, M → Eventos). O Painel ainda é uma página "Em construção".

**Datas como texto.** `LocalDate`, `LocalTime` e `LocalDateTime` chegam sem fuso. `utils/datas.js` os formata fatiando a string, nunca com `new Date("AAAA-MM-DD")` (que no Brasil mostraria o dia anterior). Moeda: `utils/moeda.js` (`Intl.NumberFormat` BRL, arredondamento para 2 casas antes de enviar).

**Acessibilidade.** Rótulos ligados aos campos, `aria-invalid` e `aria-describedby` nos erros, foco no primeiro campo inválido, foco preso nas modais e no menu do celular, Esc fecha, o foco volta a quem abriu, link "Pular para o conteúdo", foco visível e `prefers-reduced-motion` respeitado. Botões em carregamento usam `aria-disabled` em vez de `disabled`, porque um botão desabilitado joga o foco para fora da modal.

## Estrutura

```
src/
  config/        leitura única das variáveis de ambiente
  constants/     perfis, permissões, status, rotas, limites de campo, menu
  contexts/      AuthProvider (sessão) e ToastProvider (notificações)
  hooks/         useAuth, usePermissao, useConsultaPaginada, useMembros, useMembroForm, useFocusTrap...
  schemas/       validação, máscaras, montagem do payload e mapeamento de erros do servidor para campos
  services/
    http/        cliente axios, ApiError, página (normalização e query)
    auth/        sessão (regras puras + armazenamento) e login
    members/     chamadas de /members
    mock/        backend simulado (núcleo, handlers/<módulo> com as próprias rotas, página DIRECT, dados, JWT falso)
  routes/        rotas (páginas com React.lazy) e guards (visitante, autenticado, permissão)
  layouts/       tela dividida do login e estrutura autenticada (menu por perfil, breadcrumb)
  pages/         Login, Esqueci a senha, Redefinir senha, Membros e Eventos (lista/calendário, detalhes, formulário), Financeiro (movimentações, fluxo de caixa, relatório, formulário), Em construção, Sem acesso, 404
  components/    ui (genéricos: Button, campos, Card, Table, Modal, ConfirmDialog, Pagination, Breadcrumb...), members, events, auth, brand
  styles/        tokens (cores, tipos, espaçamentos) e estilos globais
  utils/         CPF, telefone, datas (e agora no fuso do servidor), calendário, moeda, JWT, strings
  test-utils/    apoio usado só pelos testes (tokens, render com perfil, app inteiro numa rota, transporte HTTP falso ou pelo servidor simulado)
```

## Testes

`npm test` roda 430 testes em 35 arquivos: telas de eventos (lista, paginação, ordenação, período, alternância calendário/lista na URL, calendário e agenda, RN09 por perfil, formulário com data obrigatória, detalhes e exclusão), telas de membros (paginação, busca com espera, filtro por status, ordenação, estado na URL, vazio e carregando; formulário com validação, máscaras e 409 de e-mail/CPF no campo; detalhes; exclusão e RN14; botões por perfil), login (sucesso, credenciais erradas, envio duplo, logout), esqueci a senha (mensagem neutra em qualquer desfecho), redefinição (token inválido, regras da senha), validação e máscara de CPF, máscara de telefone, schema do formulário de membro, mapeamento de erros 400/409 para campos (uma mensagem por campo, a primeira), matriz de permissões de todos os controllers, menu, breadcrumb e rota inicial por perfil, formatadores de data/hora e moeda, leitura do perfil a partir do JWT, sessão e expiração, normalização e montagem da página, conversão de erros da API, cliente HTTP (Bearer, 401, 403, 400, 409, tempo esgotado e rede), redirecionamento seguro após login e fidelidade do backend simulado ao real.

O ambiente padrão é `node` (funções puras, `*.test.js`). Testes de componente usam `*.test.jsx` com `// @vitest-environment jsdom` na primeira linha e `renderizarComPerfil` (`test-utils/componentes.jsx`), que simula o usuário logado e desmonta entre os testes. Exemplos: `PodeAcessar.test.jsx`, `Table.test.jsx` e `AppRoutes.test.jsx` (rotas por perfil). Para uma tela inteira com dados, `abrirAppComServidor(caminho, perfil)` (`test-utils/app.jsx`) abre o app logado e responde com o servidor simulado, expondo a URL atual (ex.: `MembrosPage.test.jsx`). Para testar uma tela com o HTTP de verdade, `instalarTransporte` (`test-utils/transporte.js`) troca só o adaptador do axios: serviços, interceptores e `ApiError` continuam os reais (ex.: `LoginForm.test.jsx`).

## Como crescer (TCC)

O backend já tem finanças e dashboard (eventos já está integrado e serve de segundo exemplo, junto de membros). Permissões, rotas, itens de menu e páginas provisórias desses módulos já existem. Para cada um, falta: criar o serviço em `services/<modulo>/` (com `montarParametrosPagina` + `normalizarPagina`), o schema em `schemas/` (com `criarMapeadorDeErros`), os componentes em `components/<modulo>/`, trocar o `EmConstrucaoPage` da rota em `routes/AppRoutes.jsx` pela página real e acrescentar `handlers/<modulo>.js` ao backend simulado (as rotas entram em `ROTAS` de `servidorSimulado.js`).

## Integração com o backend

Os problemas de integração apontados na primeira versão deste README foram corrigidos no backend: pacote do CORS fora do component scan, falta de usuário para login (agora há carga inicial por variável de ambiente), 403/500 no lugar de 401, erros de entrada virando 500, falta de `@Size` nos DTOs, e-mail do login diferenciando maiúsculas, pastas que não batiam com os pacotes, segredo JWT padrão e `printStackTrace`.

Ficam para as próximas fases:

1. **E-mail único de membro diferencia maiúsculas** no banco (`Ana@x.com` e `ana@x.com` passam). O frontend já grava em minúsculas; o ideal é um índice único em `lower(email)` numa nova migration.
2. **Unicidade checada antes de gravar.** Dois cadastros simultâneos com o mesmo CPF: o segundo esbarra na constraint e recebe 409 genérico, em vez da mensagem específica.
3. **Formato da página implícito.** Hoje é o DIRECT, padrão do Spring Boot 4.1 (o próprio Spring Data registra aviso recomendando VIA_DTO). Fixar com `@EnableSpringDataWebSupport(pageSerializationMode = ...)` evita mudança silenciosa numa atualização. O frontend aceita os dois formatos.
4. **Busca por nome diferencia acentos** ("Jose" não encontra "José"); a extensão `unaccent` do PostgreSQL resolveria.
5. **Sessão em `sessionStorage` sem refresh token.** O ideal é cookie `httpOnly` com refresh token (`POST /auth/refresh`, já previsto em 07-API.md).
