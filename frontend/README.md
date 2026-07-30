# ChurchHub Web

Frontend demonstrativo criado a partir dos contratos da API Spring Boot do projeto.

## Executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` e use:

- E-mail: `admin@churchhub.com`
- Senha: `123456`

Os dados de demonstração ficam no `localStorage` do navegador. Para reiniciá-los,
use a opção **Restaurar dados da demonstração** no menu do usuário.

## Integração com a API

Copie `.env.example` para `.env.local`, altere `VITE_USE_MOCK=false` e mantenha
o backend em `http://localhost:8080`. A camada em `src/services/api.ts` concentra
as chamadas de autenticação e membros.
