# ChurchHub — Frontend

Interface web do ChurchHub (login e cadastro de membros), escrita para consumir o backend em `../backend` **exatamente como ele é**. O backend é a fonte da verdade: nomes de campo, perfis, mensagens de erro e regras de busca foram extraídos do código Java, não de suposições.

Stack: React 18, Vite 5, JavaScript, react-router-dom 6, axios, CSS Modules e Vitest. Sem biblioteca de UI.

## Como rodar

Requer Node 18+.

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

**Sem backend (modo demonstração):** no `.env`, defina `VITE_USE_MOCK_API=true`. O app passa a conversar com um backend simulado em memória, que imita o real (veja abaixo). Recarregar a página restaura os dados iniciais.

**Com o backend real:** mantenha `VITE_USE_MOCK_API=false`, suba o banco (`docker compose up -d` na pasta `backend`) e o Spring Boot na porta 8080. O servidor do Vite encaminha `/api` para `DEV_PROXY_TARGET`, então o navegador só fala com `localhost:5173` e o CORS não interfere em desenvolvimento. Antes, é preciso resolver os problemas do backend listados no fim deste arquivo (hoje ele não compila e não tem usuário para login).

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
| `DEV_PROXY_TARGET` | `http://localhost:8080` | Só para o `npm run dev`; não vai para o navegador. |

Em produção, sirva o `dist/` atrás de um proxy reverso que encaminhe `/api` para o Spring (mesma origem, sem CORS), ou aponte `VITE_API_BASE_URL` para a URL absoluta da API e configure o CORS.

## Contas de demonstração (modo simulado)

Todas com a senha **`demo123`**. Na tela de login, o bloco "Modo demonstração" preenche cada uma com um clique.

| Perfil | E-mail | O que vê em Membros |
|---|---|---|
| Administrador | `administrador@churchhub.local` | Lista, cadastra, edita e exclui |
| Secretário | `secretario@churchhub.local` | Lista, cadastra e edita |
| Pastor | `pastor@churchhub.local` | Só lista |
| Tesoureiro | `tesoureiro@churchhub.local` | Só lista |
| Membro | `membro@churchhub.local` | Página "Sem acesso" |

São 25 membros de exemplo, todos com CPF de dígito verificador válido.

## Contrato consumido

Extraído de `AuthController`, `MembroController`, DTOs, `JwtService`, `SecurityConfig`, `GlobalExceptionHandler`, `MembroService` e migrations.

**Autenticação.** `POST /api/v1/auth/login` com `{ email, password }` (`@NotBlank @Email` / `@NotBlank`). Responde `{ token, type: "Bearer", expiresIn }`, com `expiresIn` em **segundos** (86400). Credenciais erradas ou usuário inativo: 401 `"E-mail ou senha inválidos"`. Só `/api/v1/auth/**` é público.

**JWT.** Claims `sub` (e-mail), `perfil` (com prefixo, ex.: `ROLE_ADMINISTRADOR`), `iat` e `exp`. Não há claim de nome: o cabeçalho mostra o e-mail e passará a mostrar `nome` automaticamente se o backend começar a enviá-la.

**Membros** (`/api/v1/members`):

| Método e rota | Perfis (`@PreAuthorize`) | Resposta |
|---|---|---|
| `GET /members?nome=&page=&size=&sort=` | ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO | 200, `Page<MembroResponse>` |
| `GET /members/{id}` | ADMINISTRADOR, PASTOR, SECRETARIO, TESOUREIRO | 200 ou 404 |
| `POST /members` | ADMINISTRADOR, SECRETARIO | 201, 400 ou 409 |
| `PUT /members/{id}` | ADMINISTRADOR, SECRETARIO | 200, 400, 404 ou 409 |
| `DELETE /members/{id}` | ADMINISTRADOR | 204 ou 404 |

A listagem usa `page` a partir de 0, `size=10` e `sort=nome,asc` (padrão do controller: `size=20`, `sort=nome`). A busca é **só por nome**, contendo o texto e sem diferenciar maiúsculas (`findByNomeContainingIgnoreCase`); diferencia acentos.

**Campos** (`MembroRequest`/`MembroResponse`, mesmos nomes em todo o frontend): `id`, `nome`, `cpf`, `email`, `telefone`, `endereco`, `dataNascimento`, `dataBatismo`, `dataConversao` (`AAAA-MM-DD`) e `status` (`ATIVO`, `AFASTADO`, `VISITANTE`; nulo vira `ATIVO`). Obrigatórios: `nome`, `cpf` (`\d{11}`) e `email`. Colunas: nome 150, cpf 11, email 150, telefone 20, endereço 255. CPF e e-mail são únicos (o e-mail é checado primeiro). O frontend envia CPF e telefone só com dígitos, e-mail em minúsculas e campos vazios como `null`.

**Erros.** Corpo `{ timestamp, status, error, message, path }`, sem lista por campo. Em 400 de validação, as mensagens vêm juntas em `message`, separadas por `", "`. Mensagens fixas: 404 `"Membro não encontrado"`, 409 `"Já existe um membro com este e-mail"` / `"Já existe um membro com este CPF"`, 403 (do `@PreAuthorize`) `"Você não possui permissão para acessar este recurso."`, 500 `"Ocorreu um erro interno no servidor."`.

**O que o backend faz de diferente do esperado** (e o frontend leva em conta): sem token, ou com token vencido, a resposta **não é 401**. Sem `authenticationEntryPoint`, o Spring Security devolve **403 sem corpo**; um token vencido ou adulterado faz o filtro JWT lançar exceção, o que também termina em 403 ou 500 sem o formato `ApiError`.

## Decisões de arquitetura

**Camadas com dependência em um só sentido.** `pages` → `components` → `hooks` → `services` → `utils`/`constants`. Componentes nunca chamam axios; serviços nunca importam React. Toda regra de formulário mora em `schemas/` (funções puras, testadas sem navegador).

**Um único formato de erro.** Tudo que sai de `services/` é um `ApiError` com `tipo`, `status` e `message` já prontos para a tela. É aqui que 403 com corpo ("seu perfil não pode") se separa de 403 sem corpo ("sua sessão foi recusada"), olhando se o corpo tem o formato do `GlobalExceptionHandler`.

**Sessão controlada no cliente.** Como o backend não devolve 401 de forma confiável, o frontend guarda `expiresAt` (o menor entre `agora + expiresIn` e a claim `exp`, com 5 s de folga), agenda o logout automático, confere de novo ao voltar para a aba e recusa enviar uma requisição com sessão vencida. 401 fora do login, ou 403 sem corpo, também encerram a sessão. Na rota de login, 401 vira mensagem no formulário. A sessão fica em `sessionStorage` (some ao fechar o navegador); ao ser restaurada, o perfil é sempre relido do token, nunca do que foi salvo. O ideal, que depende do backend, seria cookie `httpOnly` com refresh token.

**Nada de `Authorization` em rotas públicas.** O `JwtAuthenticationFilter` roda até no `/auth/login`: um token vencido enviado ali derrubaria o login. O interceptor só anexa o token fora de `/auth/`.

**Backend simulado como adaptador do axios.** Em vez de duplicar os serviços em versões reais e falsas, o modo simulado troca apenas o transporte (`httpClient.defaults.adapter`). Os mesmos serviços, interceptores, normalização de página e conversão de erro rodam nos dois modos, e o resto do app não sabe qual está em uso. O servidor simulado segue a ordem do Spring (autenticação → conversão do `{id}` → `@Valid` → `@PreAuthorize` → serviço), responde 403 sem corpo para token ausente ou vencido e 500 para `sort` inválido, e tem sua própria cópia dos perfis por rota, independente da matriz do frontend. Ele é carregado por import dinâmico: fica num arquivo separado que nem é baixado quando o modo simulado está desligado.

**Página normalizada.** Dependendo da versão e da configuração do Spring Data, a página chega como `{ content, totalElements, totalPages, number, size }` ou como `{ content, page: { ... } }`. `normalizarPagina` aceita os dois e entrega sempre o primeiro formato.

**Permissões só escondem, não autorizam.** `constants/permissoes.js` espelha os `@PreAuthorize` linha a linha, e um teste transcreve a mesma tabela: se o backend mudar, o teste obriga a revisar.

**Acessibilidade.** Rótulos ligados aos campos, `aria-invalid` e `aria-describedby` nos erros, foco no primeiro campo inválido, foco preso nas modais e no menu do celular, Esc fecha, o foco volta a quem abriu, link "Pular para o conteúdo", foco visível e `prefers-reduced-motion` respeitado. Botões em carregamento usam `aria-disabled` em vez de `disabled`, porque um botão desabilitado joga o foco para fora da modal.

## Estrutura

```
src/
  config/        leitura única das variáveis de ambiente
  constants/     perfis, permissões, status, rotas, limites de campo, menu
  contexts/      AuthProvider (sessão) e ToastProvider (notificações)
  hooks/         useAuth, usePermissao, useMembros, useMembroForm, useFocusTrap...
  schemas/       validação, máscaras, montagem do payload e leitura de erros do servidor
  services/
    http/        cliente axios, ApiError, normalização de página
    auth/        sessão (regras puras + armazenamento) e login
    members/     chamadas de /members
    mock/        backend simulado (adaptador, rotas, dados, JWT falso)
  routes/        rotas e guards (visitante, autenticado, permissão)
  layouts/       tela dividida do login e estrutura autenticada
  pages/         Login, Membros, Sem acesso, 404
  components/    ui (genéricos), members, auth, brand
  styles/        tokens (cores, tipos, espaçamentos) e estilos globais
  utils/         CPF, telefone, datas, JWT, strings
  test-utils/    apoio usado só pelos testes
```

## Testes

`npm test` roda 111 testes em 10 arquivos: validação e máscara de CPF, máscara de telefone, schema do formulário de membro (validação, montagem do payload e tradução de erros 400/409 para campos), matriz de permissões, leitura do perfil a partir do JWT, sessão e expiração, normalização da página nos dois formatos, conversão de erros da API, redirecionamento seguro após login e fidelidade do backend simulado ao real.

## Como crescer (TCC)

O backend já tem eventos, finanças, dashboard e recuperação de senha. Para um módulo novo, o caminho é sempre o mesmo: acrescentar as permissões em `constants/permissoes.js` espelhando o controller, criar o serviço em `services/<modulo>/`, o schema em `schemas/`, os componentes em `components/<modulo>/`, a página, a rota protegida com `RequirePermission` e o item em `constants/navegacao.js`. As rotas de esqueci/redefinir senha cabem no `AuthLayout`, que já é um layout de rotas. Quando houver várias páginas, vale carregar cada uma com `React.lazy`. Os componentes de `ui/` (campos, modal, confirmação, paginação, estados vazios, toasts) já são genéricos.

## Problemas encontrados no backend

Apenas relatados; nenhum arquivo do backend foi alterado. A análise foi feita lendo o código (o ambiente onde este frontend foi gerado não tinha acesso ao repositório Maven para compilar), mas os itens 1 e 2 são erros de compilação certos pelas regras do Java.

**Impedem a integração:**

1. **`config/CorsConfig.java` não compila:** não tem `package` nem nenhum `import` (`@Configuration`, `@Bean`, `@Value`, `CorsConfiguration`, `List`...). Mesmo com os imports, sem `package br.com.churchhub.api.config` a classe ficaria fora do component scan e o bean não seria registrado. O proxy do Vite contorna isso em desenvolvimento.
2. **`security/SecurityConfig.java` não compila:** usa `Customizer.withDefaults()` sem importar `org.springframework.security.config.Customizer`.
3. **Não existe usuário para login:** a migration V1 só cadastra perfis. Até existir um seed ou tela de cadastro, dá para criar um administrador manualmente (senha `demo123`, hash BCrypt compatível com o `BCryptPasswordEncoder`):

   ```sql
   INSERT INTO usuarios (nome, email, senha, perfil_id)
   SELECT 'Administrador', 'admin@churchhub.local',
          '$2a$10$zfpSuFlgtGS04S4MmBDInuVvmNwFOBPPxkeWxqWIEt4LKpb12jTVC', id
   FROM perfis WHERE nome = 'ADMINISTRADOR';
   ```

**Atrapalham a integração:**

4. **Sessão inválida não gera 401.** Sem `authenticationEntryPoint`, requisição sem token recebe 403 sem corpo. Com token vencido, adulterado, ou de usuário que foi apagado, o `JwtAuthenticationFilter` chama `extractUsername` (e `loadUserByUsername`) fora de `try/catch`; a exceção escapa do filtro, onde o `@ControllerAdvice` não alcança, e a resposta sai como 403 ou 500 sem o formato `ApiError`. O frontend compensa controlando a expiração localmente.
5. **O filtro JWT roda também nas rotas públicas.** Um cliente que envie um token vencido junto com o login recebe erro em vez de conseguir entrar.
6. **Erros de entrada viram 500.** JSON malformado, data inválida, `status` fora do enum, `{id}` que não é UUID e `sort` com campo inexistente caem no handler genérico. O esperado seria 400 (`HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException`, `PropertyReferenceException`).
7. **Sem `@Size` no `MembroRequest`.** Valores maiores que as colunas (nome 150, e-mail 150, telefone 20, endereço 255) estouram no banco e voltam como 500 genérico. O frontend limita os tamanhos, mas outros clientes não.
8. **E-mail único diferencia maiúsculas.** `findByEmail` e a constraint `UNIQUE` aceitam `Ana@x.com` e `ana@x.com` como membros diferentes; o login também diferencia. O frontend grava membros em minúsculas.
9. **Unicidade verificada antes de gravar, sem tratar a constraint.** Dois cadastros simultâneos com o mesmo CPF passam pela checagem e o segundo recebe 500 em vez de 409.
10. **Formato da página não fixado.** Sem `@EnableSpringDataWebSupport(pageSerializationMode = VIA_DTO)`, o JSON do `Page` depende da versão do Spring Data. O frontend aceita os dois formatos.

**Menores:**

11. Usuário desativado continua acessando até o token expirar (24 h): `isTokenValid` não confere `isEnabled`.
12. `LoginRequest` não tem mensagens próprias: os erros saem com o texto padrão do Hibernate ("não deve estar em branco"), sem dizer qual campo.
13. As pastas (`br/com/churchhub/...`) não batem com os pacotes declarados (`br.com.churchhub.api...`). O `javac` aceita, mas IDEs e ferramentas de análise reclamam.
14. O `.env` está dentro do zip, embora o próprio arquivo diga que não deve ser versionado; o segredo JWT padrão do `application.yml` é fraco; `show-sql: true` e `ex.printStackTrace()` convém ficarem só em desenvolvimento.
15. A busca por nome diferencia acentos ("Jose" não encontra "José"); a extensão `unaccent` do PostgreSQL resolveria.
