# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ChurchHub: church management system (members, events, finances, dashboard, password reset). Monorepo with two independent apps:

- `backend/` — Spring Boot 4.1, Java 21, PostgreSQL 17, Flyway, Spring Security + JWT (jjwt), springdoc OpenAPI, Lombok. Package root `br.com.churchhub.api`.
- `frontend/` — React 18 + Vite 5, plain JavaScript (no TypeScript), react-router-dom 6, axios, CSS Modules, Vitest. No UI library. Deployed on Vercel (`vercel.json` has SPA rewrites).

Code, identifiers, messages and docs are in Brazilian Portuguese — keep new code consistent (e.g. `nome`, `buscarPorId`, `MembroService`). Comments reference requirement IDs from the project spec (`RN14`, `RNF23`, `06-Database.md`, `07-API.md`); those spec docs are not in the repo.

`frontend/README.md` is the most detailed doc (API contract, demo accounts, architecture decisions) — read it before non-trivial frontend or integration work.

## Commands

### Backend (run from `backend/`)

```bash
cp .env.example .env            # JWT_SECRET is required (min 32 chars) or the app won't start
docker compose up -d            # Postgres only (run API from IDE / mvnw)
./mvnw spring-boot:run          # API on :8080 (reads backend/.env via spring.config.import)
./mvnw test                     # all tests
./mvnw test -Dtest=MembroServiceTest              # single test class
./mvnw test -Dtest=MembroServiceTest#naoExcluiMembroComHistoricoFinanceiro  # single method
docker compose --profile app up -d --build        # DB + API in containers
docker compose --profile tools up -d              # DB + pgAdmin (:5050)
```

`ChurchhubApiApplicationTests` is a full `@SpringBootTest` and needs a reachable database + env vars; the other tests are plain Mockito unit tests.

Swagger UI is public, as is `/actuator/health`. Set `DEMO_DATA_ENABLED=true` to seed demo accounts (`administrador@`, `secretario@`, `pastor@`, `tesoureiro@`, `membro@churchhub.local`, password `demo123`) and 25 sample members, or set `ADMIN_EMAIL`/`ADMIN_PASSWORD` for a first admin (`CargaInicialRunner`).

### Frontend (run from `frontend/`)

```bash
cp .env.example .env
npm install
npm run dev                     # :5173, proxies /api to DEV_PROXY_TARGET (default :8080)
npm test                        # vitest run (node env, src/**/*.test.js only)
npx vitest run src/utils/cpf.test.js   # single file
npx vitest run -t "nome do teste"      # by test name
npm run lint                    # ESLint (forbids console)
npm run build
```

`VITE_USE_MOCK_API=true` runs the frontend against an in-memory simulated backend — no Spring Boot needed.

## Backend architecture

Layered: `controller` → `service` → `repository`, with `dto` (Java records, `*Request`/`*Response`), `mapper` (hand-written `@Component` mappers, no MapStruct), `entity` (JPA).

- All routes live under `/api/v1/...` (e.g. `/members`, `/financial`). Authorization is per-method via `@PreAuthorize("hasAnyRole(...)")`; profiles are `ADMINISTRADOR`, `PASTOR`, `SECRETARIO`, `TESOUREIRO`, `MEMBRO` (`NomePerfil`). Only `/api/v1/auth/**`, Swagger and health are public (`SecurityConfig`).
- JWT claims: `sub` = email, `perfil` = `ROLE_<PERFIL>`. Stateless; `JwtAuthenticationFilter` + `SecurityErrorHandler` produce JSON 401/403.
- Errors: services throw `ResourceNotFoundException` / `ConflictException` / `BusinessException` etc.; `GlobalExceptionHandler` maps them to `ApiError { timestamp, status, error, message, path }`. Bad input (malformed JSON, non-UUID id, bad `sort`, oversized fields) must return 400, never 500. Validation messages are joined in `message` with `", "`.
- Schema is owned by Flyway (`src/main/resources/db/migration/V<n>__*.sql`); Hibernate is `ddl-auto: validate`. Any entity change needs a new migration — never edit existing ones.
- All environment-specific config comes from env vars (`application.yml`, typed via `config/properties/*`). `JWT_SECRET` intentionally has no default.
- Email sending is abstracted behind `MailSender`; the current impl `LoggingMailSender` only logs.

## Frontend architecture

- One-way dependency layering: `pages` → `components` → `hooks` → `services` → `utils`/`constants`. Components never call axios; services never import React. Form rules (validation, masks, payload building, mapping 400/409 server errors to fields) live in `schemas/` as pure, tested functions.
- Everything leaving `services/` is an `ApiError` (`services/http/apiError.js`) with `tipo`, `status`, `message`. 401 outside login (or 403 with no body) ends the session; 403 with body means "profile not allowed".
- Session (`services/auth/`, `contexts/AuthProvider.jsx`): stored in `sessionStorage`; `expiresAt` = min(now + `expiresIn`, JWT `exp`) minus 5 s; auto-logout is scheduled; profile is always re-read from the token. The axios interceptor attaches `Authorization` only outside `/auth/`.
- Mock mode swaps only the axios transport (`httpClient.defaults.adapter` → `services/mock/mockAdapter.js`), loaded by dynamic import. The simulated server mirrors Spring's order (auth → `{id}` parsing → `@Valid` → `@PreAuthorize` → service) and keeps its own copy of per-route permissions. When backend behavior changes, update the mock too (`servidorSimulado.test.js` checks fidelity).
- `normalizarPagina` (`services/http/pagina.js`) accepts both Spring `Page` JSON shapes (`{content, totalElements, ...}` and `{content, page: {...}}`).
- `constants/permissoes.js` mirrors the backend `@PreAuthorize` rules line by line and only hides UI; `permissoes.test.js` duplicates the table so a backend change forces review.
- Config/env is read only through `src/config/env.js`. `VITE_*` vars are baked in at build time.
- Field names match backend DTOs exactly. Frontend sends CPF/phone as digits only, email lowercased, empty fields as `null`.

Implemented in the frontend: login and password reset, members, events (calendar + list), finances (movements, cash flow, printable monthly report; money handled in integer cents via `utils/moeda.js`; totals, series and per-category sums come from the backend aggregation endpoints `/financial/summary/**`, never summed in the browser) and the dashboard (`/dashboard`, home page of every profile; RN12: each block only with the permission and a non-null field from the backend; each block loads and fails on its own). Adding a frontend module: permissions in `constants/permissoes.js` (mirroring the controller) → `services/<modulo>/` → `schemas/` → `components/<modulo>/` → page → protected route with `RequirePermission` in `routes/AppRoutes.jsx` → menu item in `constants/navegacao.js`.
