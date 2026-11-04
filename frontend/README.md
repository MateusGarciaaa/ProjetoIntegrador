# ChurchHub — Frontend

Interface web do ChurchHub: login e recuperação de senha, Painel, Membros, Eventos (calendário e lista), Financeiro (movimentações, fluxo de caixa e relatório), Usuários e Minha conta. Foi escrita para consumir o backend em `../backend` **exatamente como ele é**: nomes de campo, perfis, mensagens de erro e regras foram extraídos do código Java, não de suposições.

Stack: React 18, Vite 5, JavaScript, react-router-dom 6, axios, CSS Modules e Vitest. Sem biblioteca de UI nem de gráficos.

O contrato completo (endpoint por endpoint), as divergências entre o backend real e o simulado, as pendências do backend e o backlog do TCC estão em [`docs/frontend-integracao.md`](../docs/frontend-integracao.md).

## Como rodar

Requer Node 18+ (para o backend real: Docker, ou Java 21 + Docker só para o banco).

### Modo simulado (sem backend)

```bash
cd frontend
cp .env.example .env        # e troque para VITE_USE_MOCK_API=true
npm install
npm run dev                 # http://localhost:5173
```

O app passa a conversar com um backend simulado em memória, que imita o real: mesmas rotas, perfis, validações, mensagens, paginação e regras de negócio (RN09, RN12, RN14, convite de usuário…). Os e-mails que o backend "enviaria" (redefinição de senha e convites) aparecem no bloco **E-mails simulados**, na tela "Esqueci minha senha" e na tela de Usuários. Recarregar a página volta aos dados iniciais.

### Com o backend real

1. Backend (pasta `backend/`):

   ```bash
   cp .env.example .env
   # no .env: JWT_SECRET (32+ caracteres, ex.: openssl rand -base64 48) e DEMO_DATA_ENABLED=true
   docker compose --profile app up -d --build   # banco + API em http://localhost:8080
   ```

   Alternativa para desenvolver no backend: `docker compose up -d` (só o banco) e `./mvnw spring-boot:run`.

2. Frontend (pasta `frontend/`): `cp .env.example .env` (deixe `VITE_USE_MOCK_API=false`), `npm install` e `npm run dev`. O Vite encaminha `/api` para `DEV_PROXY_TARGET` (padrão `http://localhost:8080`), então o navegador só fala com `localhost:5173` e o CORS não interfere em desenvolvimento.

Sem `DEMO_DATA_ENABLED=true`, não há contas de demonstração: defina `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` do backend para criar o primeiro administrador.

**E-mails no backend real.** O backend ainda não envia e-mail: o `LoggingMailSender` registra o link no log da API. Para abrir um convite ou uma redefinição, procure a linha e cole o caminho depois de `http://localhost:5173`:

```bash
docker compose logs api | grep "\[DEV\]"
# [DEV] Convite para joana@churchhub.local: /reset-password?token=…&convite=1
```

### Recriar o banco com os dados de demonstração limpos

> **Apaga todos os dados do banco local** (membros, eventos, lançamentos, usuários criados).

```bash
cd backend
docker compose --profile app down -v            # para tudo e apaga o volume do banco
docker compose --profile app up -d --build      # sobe de novo; o Flyway recria as tabelas
docker compose logs api | grep "Demonstração"   # "Demonstração carregada: 5 conta(s), 25 membros, 7 eventos, 22 movimentações."
```

A carga só roda com o banco vazio (sem membros) e usa a data do dia: eventos, lançamentos do mês e os 3 "novos membros" ficam em volta de hoje. Por isso, recrie no dia da apresentação.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com proxy para a API |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm test` | Roda os testes (Vitest) uma vez |
| `npm run lint` | ESLint (inclui regras de hooks e proíbe `console`) |

## Variáveis de ambiente

Lidas só em `src/config/env.js`.

| Variável | Padrão | Para quê |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Base da API, já com o prefixo `/api/v1`. Com o proxy do Vite, `/api/v1`; em produção, a URL absoluta (`https://SUA-API/api/v1`). |
| `VITE_USE_MOCK_API` | `false` | `true` liga o backend simulado. |
| `VITE_MOCK_TOKEN_EXPIRES_IN` | `86400` | Só no modo simulado: validade do token em segundos. Use `60` para ver o logout automático. |
| `VITE_API_TIMEOUT_MS` | `15000` | Espera máxima por resposta. Em hospedagem gratuita, que "dorme", use `90000`. |
| `VITE_SHOW_DEMO_ACCOUNTS` | `false` | `true` mostra na tela de login os botões das contas de demonstração também com o backend real. No modo simulado aparecem sempre. |
| `DEV_PROXY_TARGET` | `http://localhost:8080` | Só para o `npm run dev`; não vai para o navegador. |

Variáveis `VITE_*` são gravadas no código durante o build: ao mudar alguma em produção, faça um novo deploy.

## Contas de demonstração

Todas com a senha **`demo123`**, no modo simulado e no backend real com `DEMO_DATA_ENABLED=true`. Na tela de login, o bloco "Modo demonstração" preenche cada uma com um clique. Todos os perfis começam no **Painel**.

| Perfil | E-mail | O que pode fazer |
|---|---|---|
| Administrador | `administrador@churchhub.local` | Tudo: Painel completo; membros (inclusive excluir); eventos (inclusive editar encerrados e excluir); financeiro (inclusive excluir); **Usuários** (convidar, editar perfil, ativar/desativar, reenviar convite) |
| Pastor | `pastor@churchhub.local` | Painel completo; consulta membros, eventos e financeiro (lista, fluxo de caixa, relatório), sem alterar nada |
| Secretário | `secretario@churchhub.local` | Painel sem financeiro; cadastra e edita membros (não exclui); cadastra e edita eventos ainda não encerrados (RN09) |
| Tesoureiro | `tesoureiro@churchhub.local` | Painel sem membros; consulta eventos; lança e edita movimentações e cria categorias (não exclui); não vê a ficha dos membros, só a busca por nome no lançamento |
| Membro | `membro@churchhub.local` | Painel com os próximos eventos; consulta a agenda |

Todos têm **Minha conta** (dados e troca de senha). A matriz completa, permissão por permissão, está em `src/constants/permissoes.js` e na seção 4 de `docs/frontend-integracao.md`.

Dados: 25 membros (CPF com dígito verificador válido; os 3 últimos aparecem em "Novos membros"), 7 eventos em volta de hoje (um já encerrado, "Culto de ação de graças") e 6 categorias com 11 lançamentos por mês (mês passado e mês atual). Ana Beatriz Carvalho, André Luiz Fontana, João Pedro Zanella e Mateus Oliveira Cruz têm dízimo lançado: excluí-los dá o 409 da RN14.

## Deploy

O frontend é estático (`npm run build` → `dist/`) e está preparado para a **Vercel**; a API roda o `backend/Dockerfile` em qualquer serviço que aceite Docker (ex.: Render) com um PostgreSQL 17 (ex.: Neon).

**Frontend (Vercel).** Novo projeto a partir do repositório, com **Root Directory `frontend`** (a Vercel detecta o Vite: build `npm run build`, saída `dist`). Variáveis:

| Variável | Valor |
|---|---|
| `VITE_API_BASE_URL` | `https://SUA-API/api/v1` |
| `VITE_API_TIMEOUT_MS` | `90000` (a API gratuita leva ~1 min para acordar) |
| `VITE_USE_MOCK_API` | `false` |
| `VITE_SHOW_DEMO_ACCOUNTS` | `true` só em ambiente de apresentação |

O `vercel.json` já traz:
- o redirecionamento de todas as rotas para o `index.html` (F5 em `/membros` não dá 404);
- cabeçalhos de segurança: `Content-Security-Policy` (scripts só da própria origem, Google Fonts, `data:` nas imagens do CSS, `connect-src 'self' https:`, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: no-referrer`. Com o endereço da API definido, troque `https:` do `connect-src` pela origem dela (ex.: `https://churchhub-api.onrender.com`) para restringir ainda mais.

**API.** Variáveis do backend em produção: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSL_MODE=require` (bancos na nuvem), `JWT_SECRET` (32+ caracteres; sem ele a API não sobe), `CORS_ALLOWED_ORIGINS` com o domínio de produção da Vercel (`https://nome.vercel.app`, sem barra no final), `APP_TIMEZONE=America/Sao_Paulo` e `DEMO_DATA_ENABLED=true` só para apresentação (com dados reais, `false` + `ADMIN_EMAIL`/`ADMIN_PASSWORD`). Health check: `/actuator/health/liveness` (não consulta o banco). No Neon, use a conexão direta, sem o pooler: o Flyway usa travas de sessão.

**Plano B para a apresentação.** Um segundo projeto na Vercel com `VITE_USE_MOCK_API=true` funciona sem API e sem banco (tudo no navegador, mesmas contas e dados).

**Recomeçar os dados na nuvem.** No editor SQL do banco: `TRUNCATE movimentacoes_financeiras, categorias_financeiras, eventos, membros, password_reset_tokens, usuarios CASCADE;` (nunca `perfis` nem `flyway_schema_history`) e reinicie a API: a carga recria tudo.

## Contrato consumido (resumo)

- Todas as rotas em `/api/v1`; só `/auth/**`, Swagger e `/actuator/health` são públicos. O interceptor só anexa `Authorization: Bearer` fora de `/auth/`.
- JWT com `sub` (e-mail), `perfil` (`ROLE_<PERFIL>`), `nome`, `iat`, `exp`; 86400 s; sem refresh. O backend relê o usuário a cada requisição: desativado, senha trocada depois do `iat` ou perfil diferente da claim → 401 (os dois últimos com o motivo, que o login mostra).
- Página do Spring no formato DIRECT (`{ content, totalElements, totalPages, number, size, … }`); `normalizarPagina` também aceita o VIA_DTO. `page` base 0, `size` até 2000, `sort` repetido com desempate.
- Erro: `{ timestamp, status, error, message, path }`, sem lista por campo; 400 de validação junta as mensagens com `", "`. 400 = entrada inválida (inclusive `{id}` não-UUID e `sort` inválido) ou regra de negócio; 401 = sessão; 403 = perfil sem permissão; 404; 409 = conflito (unicidade, RN09, RN14, último Administrador ativo).
- Datas `AAAA-MM-DD`, horário `HH:mm:ss` na resposta (`HH:mm` no envio), dinheiro como número com 2 casas. O frontend envia CPF e telefone só com dígitos, e-mail em minúsculas e campos vazios como `null`.

Inventário completo dos 34 endpoints: seção 2 de `docs/frontend-integracao.md`.

## Decisões de arquitetura

**Camadas com dependência em um só sentido.** `pages` → `components` → `hooks` → `services` → `utils`/`constants`. Componentes nunca chamam axios; serviços nunca importam React. Toda regra de formulário mora em `schemas/` (funções puras, testadas sem navegador).

**Um único formato de erro.** Tudo que sai de `services/` é um `ApiError` com `tipo`, `status` e `message` prontos para a tela. É aqui que 401 ("sua sessão acabou") se separa de 403 com corpo ("seu perfil não pode"). Um 403 sem corpo, que esta API não produz mas um proxy poderia, também encerra a sessão.

**Sessão controlada no cliente.** Além de reagir ao 401, o frontend guarda `expiresAt` (o menor entre `agora + expiresIn` e a claim `exp`, com 5 s de folga), agenda o logout automático, confere de novo ao voltar para a aba e recusa enviar requisição com sessão vencida. A sessão fica em `sessionStorage` (some ao fechar o navegador; a senha nunca é guardada); ao ser restaurada, o perfil é sempre relido do token. O `AuthProvider` relê `GET /me` ao abrir o app e a cada token novo (nome atual no topo). O ideal, que depende do backend, seria cookie `httpOnly` com refresh token.

**Backend simulado como adaptador do axios.** O modo simulado troca apenas o transporte (`httpClient.defaults.adapter`): serviços, interceptores, normalização de página e conversão de erro são os mesmos nos dois modos. O servidor simulado segue a ordem do Spring (autenticação → `{id}` → `@Valid` → `@PreAuthorize` → serviço) e tem sua própria cópia dos perfis por rota, independente da matriz do frontend. É carregado por import dinâmico (nem é baixado com o modo desligado). Ao mudar o backend, mude o mock junto (`servidorSimulado.test.js` confere a fidelidade).

**Permissões só escondem, não autorizam.** `constants/permissoes.js` espelha os `@PreAuthorize` de todos os controllers linha a linha, e `permissoes.test.js` transcreve a mesma tabela: se o backend mudar, o teste obriga a revisar. `usePermissao().pode(...)` esconde botões e blocos; `RequirePermission` protege rotas (mostra "Sem acesso", sem deslogar); o menu (`itensMenuDoPerfil`) só lista áreas permitidas.

**Painel (RN12).** `GET /dashboard` é aberto a qualquer perfil e devolve `null` nos blocos que o perfil não vê. Um bloco só aparece com `pode(...)` **e** o dado não nulo. Cada bloco tem o próprio carregando, erro e "Tentar novamente", e um `LimiteDeErro`. Os blocos financeiros usam as agregações `/financial/summary/**` (somadas no banco), as mesmas do fluxo de caixa e do relatório: o navegador nunca soma lançamentos.

**Erro ao lado do campo, pelo texto.** O backend não diz a que campo pertence cada erro; `schemas/errosServidor.js` deduz pela mensagem exata do DTO (400) ou por palavra-chave (409). Se o texto mudar, o erro só passa para o topo do formulário. O formato estruturado proposto está nas pendências do backend.

**Datas e dinheiro.** `LocalDate`/`LocalTime` são formatados fatiando a string, nunca com `new Date("AAAA-MM-DD")` (que no Brasil mostraria o dia anterior). "Hoje" e "agora" são calculados no fuso do servidor (`America/Sao_Paulo`), não no do navegador. Dinheiro em centavos inteiros (`utils/moeda.js`), enviado com 2 casas.

**Envio único.** Todo formulário que envia à API usa `useEnvioUnico` (guarda por ref, não por estado): dois cliques no mesmo instante fazem uma só requisição.

**Segurança no navegador.** Nenhum `console` (o ESLint proíbe), nenhum segredo no código (só `.env.example` é versionado), redirecionamento pós-login só para caminhos internos (sem `//` nem `\`), token de `/reset-password` tirado da URL depois de lido, cabeçalhos HTTP no `vercel.json`.

**Acessibilidade.** Rótulos ligados aos campos, `aria-invalid`/`aria-describedby` nos erros, foco no primeiro campo inválido, foco preso nas modais e no menu do celular (que vira `role="dialog"`), Esc fecha, o foco volta a quem abriu, "Pular para o conteúdo", foco visível, `prefers-reduced-motion`, gráficos com tabela equivalente, valores com sinal escrito além da cor. Contraste conferido por teste (`styles/contraste.test.js`): texto ≥ 4,5:1 e borda de campo ≥ 3:1. Botões em carregamento usam `aria-disabled`, porque um botão desabilitado joga o foco para fora da modal.

**Responsividade.** Menu lateral fixo a partir de 960 px e painel recolhível abaixo disso; abaixo de 720 px, as tabelas viram cartões (com "Ordenar por") e o calendário vira agenda por dia.

## Estrutura

```
src/
  config/        leitura única das variáveis de ambiente
  constants/     perfis, permissões, rotas, menu, consultas (tamanhos e esperas), limites e rótulos por módulo
  contexts/      AuthProvider (sessão) e ToastProvider (notificações)
  hooks/         useAuth, usePermissao, useEnvioUnico, useConsultaPaginada, use<Módulo>, use<Módulo>Form, useFocusTrap...
  schemas/       validação, máscaras, payload, estado na URL e mapeamento de erros do servidor para campos
  services/
    http/        cliente axios, ApiError, página (normalização e query)
    auth/ conta/ dashboard/ events/ financial/ members/ usuarios/   chamadas por recurso
    mock/        backend simulado (núcleo, handlers/<módulo>, página DIRECT, dados, JWT falso, caixa de e-mail)
  routes/        rotas (páginas com React.lazy) e guards (visitante, autenticado, permissão)
  layouts/       tela do login e estrutura autenticada (menu por perfil, topo, breadcrumb)
  pages/         uma por rota (Login, Esqueci/Redefinir senha, Painel, Membros, Eventos, Financeiro, Usuários, Minha conta, Sem acesso, 404)
  components/    ui (Button, campos, Card, Table, Modal, ConfirmDialog, Pagination, ListaSkeleton...) e um diretório por módulo
  styles/        tokens (cores, tipos, espaçamentos) e estilos globais
  utils/         CPF, telefone, datas, calendário, moeda, fluxo de caixa, JWT, ordenação, strings
  test-utils/    apoio só dos testes (relógio fixo, app inteiro numa rota, transporte HTTP falso ou pelo servidor simulado)
```

## Testes

`npm test` roda 640 testes em 50 arquivos, sem nenhuma saída de erro no console. Cobrem: matriz de permissões de todos os controllers, menu, rotas e rota inicial por perfil; sessão (expiração, 401 com motivo, nome do `/me`, token novo após trocar a senha); login, esqueci a senha, redefinição e convite; as telas de cada módulo com o servidor simulado (listas, filtros e ordenação na URL, paginação, estados vazio/carregando/erro, formulários com validação, máscaras e erros 400/409 no campo, ações por perfil, RN09, RN12, RN14, gestão de usuários); fluxo de caixa e relatório pelas agregações; envio duplo; teclado do Modal e do menu do celular; contraste dos tokens; schemas e utils puros; e a fidelidade do backend simulado ao real.

- **Data fixa.** `test-utils/relogio.js` (em `setupFiles`) faz todo teste rodar em 20/10/2026, 12:00 de São Paulo, falsificando só o `Date` (timers reais). Para outro dia, `fixarAgora('2026-11-03T15:00:00Z')` no próprio teste. Constantes calculadas no topo do arquivo usam `AGORA_DOS_TESTES`.
- **Ambiente.** Padrão `node` (`*.test.js`). Testes de componente usam `*.test.jsx` com `// @vitest-environment jsdom` na primeira linha.
- **Tela inteira com dados.** `abrirAppComServidor(caminho, perfil)` (`test-utils/app.jsx`) abre o app logado respondendo com o servidor simulado e expõe a URL atual (ex.: `MembrosPage.test.jsx`).
- **HTTP controlado.** `instalarTransporte` (`test-utils/transporte.js`) troca só o adaptador do axios; com `transporteDoServidor(criarServidorSimulado(...))` cada rota responde pelo contrato (ex.: `LoginForm.test.jsx`).
- **Foco no jsdom.** O jsdom não calcula layout; `simularElementosVisiveis()` (`test-utils/layout.js`) permite testar o foco preso (ex.: `Modal.test.jsx`).

## Como crescer (TCC)

Para um módulo novo: permissões em `constants/permissoes.js` (espelhando o controller) e em `permissoes.test.js` → `services/<modulo>/` (com `montarParametrosPagina` + `normalizarPagina`) → `schemas/` (com `criarMapeadorDeErros`) → `components/<modulo>/` → página → rota protegida com `RequirePermission` em `routes/AppRoutes.jsx` → item em `constants/navegacao.js` → `handlers/<modulo>.js` no backend simulado (rotas em `ROTAS` de `servidorSimulado.js`). O backlog priorizado (segurança, membros, eventos, financeiro, usuários e dependências) está em `docs/frontend-integracao.md`, seção 7.
