# ChurchHub

Sistema web de gestão administrativa, financeira e organizacional para igrejas evangélicas de pequeno e médio porte. Nasceu como MVP do Projeto Integrador e foi estruturado para evoluir até o TCC: arquitetura em camadas, API REST documentada, controle de acesso por perfil e banco versionado por migrations.

## Status do MVP (Fase 1)

| Módulo | API | Tela |
|---|---|---|
| Login com JWT e permissões por perfil (RBAC) | ✅ | ✅ |
| Membros: cadastro, edição, exclusão, busca e paginação | ✅ | ✅ |
| Eventos (inclui a regra de evento encerrado, RN09) | ✅ | Próxima etapa |
| Financeiro: categorias, receitas, despesas e resumo por período | ✅ | Próxima etapa |
| Dashboard (indicadores filtrados por perfil, RN12) | ✅ | Próxima etapa |
| Recuperação de senha (o "e-mail" ainda é registrado no log) | ✅ | Próxima etapa |

Os módulos sem tela podem ser demonstrados pelo Swagger (veja abaixo).

## Stack

**Backend:** Java 21, Spring Boot 4, Spring Security com JWT, Spring Data JPA, PostgreSQL, Flyway, springdoc-openapi (Swagger), JUnit e Mockito.
**Frontend:** React 18, Vite, React Router, axios, CSS Modules e Vitest.
**Infra:** Docker (imagem multi-stage da API) e Docker Compose para desenvolvimento.

```
backend/    API Spring Boot (controller → service → repository)
frontend/   SPA React (pages → components → hooks → services)
DEPLOY.md   passo a passo para publicar na web
```

## Como rodar localmente

Requisitos: Java 21, Node 18+ e Docker.

**1. Banco de dados**

```bash
cd backend
cp .env.example .env
```

No `.env`, preencha `JWT_SECRET` (obrigatório, 32+ caracteres; o próprio arquivo mostra como gerar) e, para ter usuários e dados de exemplo, `DEMO_DATA_ENABLED=true`. Depois:

```bash
docker compose up -d
```

**2. API** (ainda na pasta `backend`)

```bash
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

Na primeira subida o Flyway cria as tabelas e a carga inicial cria as contas. Swagger: <http://localhost:8080/swagger-ui.html>.

**3. Frontend**

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

**Só o frontend, sem backend:** defina `VITE_USE_MOCK_API=true` no `.env` do frontend. Ele passa a usar um backend simulado em memória, com as mesmas contas e membros.

## Contas de demonstração

Disponíveis no modo simulado e no backend com `DEMO_DATA_ENABLED=true`. Senha de todas: `demo123`.

| Perfil | E-mail | Em Membros |
|---|---|---|
| Administrador | `administrador@churchhub.local` | Lista, cadastra, edita e exclui |
| Secretário | `secretario@churchhub.local` | Lista, cadastra e edita |
| Pastor | `pastor@churchhub.local` | Só lista |
| Tesoureiro | `tesoureiro@churchhub.local` | Só lista |
| Membro | `membro@churchhub.local` | Sem acesso |

As senhas são públicas: nunca habilite `DEMO_DATA_ENABLED` com dados reais de uma igreja. Para um ambiente real, deixe-o `false` e crie o primeiro administrador com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

## Testando a API pelo Swagger

1. Abra `/swagger-ui.html` e execute `POST /api/v1/auth/login` com uma das contas acima.
2. Copie o valor de `token` da resposta, clique em **Authorize** e cole só o token (sem `Bearer`).
3. Agora os endpoints protegidos funcionam, por exemplo `GET /api/v1/dashboard` e `GET /api/v1/financial/summary`.

## Testes

```bash
cd frontend && npm test       # Vitest, sem dependências externas
cd backend && ./mvnw test     # precisa do banco no ar (docker compose up -d) por causa do teste de contexto
```

## Publicar na web

Banco no Neon, API no Render e frontend na Vercel, todos com plano gratuito: veja [`DEPLOY.md`](DEPLOY.md).

## Próximos passos (rumo ao TCC)

1. Telas de dashboard, eventos e financeiro, consumindo a API que já existe.
2. Cadastro de usuários pelo administrador (RN02); o `UsuarioService` já é a base.
3. Testes de integração com Testcontainers, para o `./mvnw test` não depender de banco local.
4. Pipeline de CI no GitHub Actions rodando os testes a cada push.
5. Envio real de e-mail na recuperação de senha, refresh token e auditoria de operações críticas (RN13).
