# ChurchHub

Sistema de gestão para igrejas: membros, eventos (calendário), financeiro (movimentações, fluxo de caixa e relatório mensal), painel por perfil, usuários com convite e recuperação de senha. Cada perfil (Administrador, Pastor, Secretário, Tesoureiro e Membro) vê e faz só o que lhe cabe; quem autoriza é o backend.

Projeto Integrador — IFPR.

## Stack

| Parte | Tecnologias |
|---|---|
| `backend/` | Java 21, Spring Boot 4.1, Spring Security + JWT, PostgreSQL 17, Flyway, springdoc OpenAPI (Swagger), Docker |
| `frontend/` | React 18, Vite 5, JavaScript, react-router-dom 6, axios, CSS Modules, Vitest; deploy na Vercel |

## Como rodar

### Só o frontend, sem backend (modo simulado)

```bash
cd frontend
cp .env.example .env            # troque para VITE_USE_MOCK_API=true
npm install
npm run dev                     # http://localhost:5173
```

Um backend simulado em memória, com as mesmas regras do real, roda no navegador.

### Backend real com Docker + frontend

```bash
cd backend
cp .env.example .env            # preencha JWT_SECRET (32+ caracteres) e DEMO_DATA_ENABLED=true
docker compose --profile app up -d --build    # PostgreSQL + API em http://localhost:8080

cd ../frontend
cp .env.example .env            # VITE_USE_MOCK_API=false
npm install
npm run dev                     # http://localhost:5173 (o Vite encaminha /api para a API)
```

Swagger: http://localhost:8080/swagger-ui.html. Para recriar o banco com os dados de demonstração limpos (**apaga os dados atuais**): `docker compose --profile app down -v` e suba de novo.

## Contas de demonstração

Com `DEMO_DATA_ENABLED=true` no backend, ou sempre no modo simulado. Senha **`demo123`** para todas.

| Perfil | E-mail |
|---|---|
| Administrador | `administrador@churchhub.local` |
| Pastor | `pastor@churchhub.local` |
| Secretário | `secretario@churchhub.local` |
| Tesoureiro | `tesoureiro@churchhub.local` |
| Membro | `membro@churchhub.local` |

## Documentação

- [`frontend/README.md`](frontend/README.md): como rodar em cada modo, variáveis de ambiente, o que cada perfil pode fazer, deploy, arquitetura e testes.
- [`docs/frontend-integracao.md`](docs/frontend-integracao.md): contrato frontend × backend endpoint por endpoint, permissões, divergências do modo simulado, pendências do backend e backlog do TCC.
- `backend/.env.example` e `backend/docker-compose.yml`: variáveis e serviços do backend, comentados.
