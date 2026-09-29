# ChurchHub — Frontend

Frontend em React + Vite do ChurchHub. Esta versão cobre a **tela de login** e o **CRUD de membros** (Fase 1 / Projeto Integrador).

## Como rodar

```bash
npm install
cp .env.example .env   # ajuste se necessário
npm run dev            # http://localhost:5173
npm test               # testes unitários (Vitest)
npm run build          # build de produção em dist/
```

## Modo simulado × API real

| Variável | Valor | Efeito |
|---|---|---|
| `VITE_USE_MOCK_API` | `true` | Usa dados em memória (reiniciam ao recarregar a página). Não precisa do backend. |
| `VITE_USE_MOCK_API` | `false` | Consome a API em `VITE_API_BASE_URL`. |

Contas do modo simulado (senha `demo123`): `admin@igreja.com`, `secretaria@igreja.com`, `pastor@igreja.com`.
Cada uma demonstra um nível de permissão diferente (ver 19-Permissoes.md).

## Estrutura

```
src/
  config/        variáveis de ambiente
  constants/     perfis, permissões (RBAC) e status de membro
  contexts/      AuthContext (sessão) e ToastContext (notificações)
  hooks/         useAuth, useForm, useMembers, useDebouncedValue, useToast
  services/
    http/        cliente axios, interceptors e ApiError
    auth/        login real + armazenamento da sessão
    members/     CRUD real de membros
    mock/        implementações simuladas com o mesmo contrato das reais
  routes/        rotas, guards (RequireAuth, RequirePermission) e menu
  layouts/       AppLayout (menu lateral) e AuthLayout (telas de acesso)
  pages/         telas (login, membros, erros)
  components/
    ui/          componentes genéricos reutilizáveis
    members/     componentes do domínio de membros
  utils/         formatação, validação e leitura do JWT
  styles/        tokens de design e estilos globais
```

## Contrato esperado da API

Além do que está em 07-API.md, o frontend assume:

- `GET /members?page=0&size=10&sort=name,asc&search=...` retorna uma página no formato do Spring (`content`, `totalElements`, `totalPages`, `number`, `size`).
- Corpo de membro: `name`, `cpf` (só dígitos), `email`, `phone` (só dígitos), `address`, `birthDate`, `baptismDate`, `conversionDate` (ISO `yyyy-MM-dd`), `status` (`ATIVO` | `AFASTADO` | `VISITANTE`).
- O JWT contém as claims `sub` (e-mail), `name` e `role`.
- Erros seguem `{ "status", "message", "errors": [{ "field", "message" }] }`.
