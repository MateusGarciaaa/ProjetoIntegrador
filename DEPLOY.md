# Publicando o ChurchHub na web

Este guia coloca o sistema no ar com três serviços de plano gratuito:

```
Navegador ──► Vercel (frontend React) ──► Render (API Spring Boot) ──► Neon (PostgreSQL)
```

| Serviço | Papel | Por que este |
|---|---|---|
| **Neon** | Banco PostgreSQL | Plano gratuito permanente, sem cartão e sem data de expiração. |
| **Render** | API (roda o `backend/Dockerfile`) | Aceita Docker direto do GitHub, com deploy automático a cada push. |
| **Vercel** | Frontend (arquivos estáticos do `npm run build`) | Hospedagem estática rápida, com deploy automático a cada push. |

**Limitação que você precisa conhecer:** a API gratuita do Render "dorme" após 15 minutos sem acesso e leva cerca de 1 minuto para acordar. Não é defeito do sistema; é o preço do plano gratuito. A seção [Dia da apresentação](#dia-da-apresentação) mostra como contornar.

Limites dos planos conferidos em outubro de 2026. Eles mudam com frequência, então confira as páginas de preço antes de depender deles.

## Antes de começar

1. Envie as alterações para o GitHub (`git push`). Os três serviços leem o código de lá.
2. Crie contas em [neon.com](https://neon.com), [render.com](https://render.com) e [vercel.com](https://vercel.com). Entrar com a conta do GitHub agiliza.
3. Tenha à mão um bloco de notas para anotar endereços e senhas durante o processo.

## Passo 1: banco de dados no Neon

1. Crie um projeto chamado `churchhub`, com **PostgreSQL 17** e região **AWS US East (N. Virginia)**. A API vai ficar na mesma região: cada tela faz várias consultas ao banco, e a distância entre os dois é o que mais pesa na velocidade.
2. Clique em **Connect** e **desligue a opção "Connection pooling"**. O Flyway usa travas de sessão que não funcionam através do pooler; com ele ligado, o deploy pode travar durante as migrations.
3. Anote os dados da conexão direta. O host tem o formato `ep-nome-aleatorio.us-east-1.aws.neon.tech` e **não** contém `-pooler`. Anote também o nome do banco (o padrão é `neondb`), o usuário e a senha.

Não crie tabelas: o Flyway faz isso sozinho na primeira subida da API.

## Passo 2: API no Render

1. **New → Web Service** e escolha o repositório do projeto.
2. Preencha:

   | Campo | Valor |
   |---|---|
   | Name | `churchhub-api` (vira parte da URL; se já existir, o Render acrescenta um sufixo) |
   | Region | **Virginia (US East)**, a mesma do Neon |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Language | **Docker** |
   | Instance Type | **Free** |

3. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `DB_HOST` | host do Neon, só o endereço (sem `postgresql://` e sem `/neondb`) |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | `neondb` (ou o nome que você deu) |
   | `DB_USERNAME` | usuário do Neon |
   | `DB_PASSWORD` | senha do Neon |
   | `DB_SSL_MODE` | `require` |
   | `JWT_SECRET` | valor aleatório com 32+ caracteres: use o botão **Generate** do Render, se aparecer, ou rode `openssl rand -base64 48` no Git Bash |
   | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` por enquanto; você troca no passo 4 |
   | `DEMO_DATA_ENABLED` | `true` |
   | `JAVA_OPTS` | `-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Duser.timezone=America/Sao_Paulo` |

   O `JAVA_OPTS` ajusta a JVM para os 512 MB de memória e o processador fraco do plano gratuito: sobe mais rápido e gasta menos memória, ao custo de um pouco de desempenho, o que não faz diferença numa demonstração.

4. Em **Advanced → Health Check Path**, informe `/actuator/health/liveness`.
5. Clique em **Create Web Service**. O primeiro build leva de 5 a 10 minutos, porque o Maven baixa todas as dependências.
6. Acompanhe a aba **Logs**. Deu certo quando aparecerem estas linhas:

   ```
   Started ChurchhubApiApplication ...
   Demonstração carregada: 5 conta(s), 25 membros, 7 eventos, 22 movimentações.
   ```

7. Teste no navegador, trocando pelo seu endereço:
   * `https://churchhub-api.onrender.com/actuator/health` deve mostrar `{"status":"UP"}`
   * `https://churchhub-api.onrender.com/swagger-ui.html` deve abrir a documentação da API

## Passo 3: frontend na Vercel

1. **Add New → Project** e importe o mesmo repositório.
2. Em **Root Directory**, clique em **Edit** e escolha `frontend`. A Vercel detecta o Vite e preenche o build (`npm run build`) e a saída (`dist`).
3. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `VITE_API_BASE_URL` | `https://churchhub-api.onrender.com/api/v1` (o endereço do passo 2, terminando em `/api/v1`) |
   | `VITE_API_TIMEOUT_MS` | `90000` (espera até 90 s enquanto a API acorda) |
   | `VITE_SHOW_DEMO_ACCOUNTS` | `true` (botões das contas de demonstração na tela de login) |
   | `VITE_USE_MOCK_API` | `false` |

4. Clique em **Deploy**. Ao terminar, anote o **domínio de produção** do projeto, no formato `https://nome-do-projeto.vercel.app`. Não use os endereços com códigos aleatórios gerados para cada deploy.

As variáveis `VITE_*` são gravadas no código durante o build. Se mudar alguma depois, faça um novo deploy (**Deployments → Redeploy**) para ela valer.

## Passo 4: liberar o frontend no CORS

O navegador só deixa o site da Vercel chamar a API se a API autorizar aquela origem.

1. No Render, abra o serviço e vá em **Environment**.
2. Troque `CORS_ALLOWED_ORIGINS` pelo domínio de produção da Vercel, por exemplo `https://churchhub.vercel.app`: com `https`, sem barra no final e sem caminho. Para usar a API da nuvem também no desenvolvimento local, separe por vírgula: `https://churchhub.vercel.app,http://localhost:5173`.
3. Salve. O Render reinicia o serviço sozinho.

## Passo 5: conferir de ponta a ponta

* [ ] A tela de login abre e mostra o bloco "Modo demonstração".
* [ ] Entrar como Administrador leva à lista com 25 membros.
* [ ] Apertar F5 na página de membros mantém você na mesma página (sem erro 404).
* [ ] Entrar como Pastor mostra a lista sem o botão "Novo membro".
* [ ] Entrar como Membro mostra a página "Sem acesso".
* [ ] Tentar excluir **Ana Beatriz Carvalho** mostra que ela tem movimentações financeiras (RN14).

## Dia da apresentação

**Na véspera:** percorra o roteiro abaixo inteiro no endereço publicado, não no seu computador.

**10 minutos antes:**

1. Abra `https://SUA-API.onrender.com/actuator/health/liveness` e espere aparecer `{"status":"UP"}`. Isso acorda a API, o que leva cerca de 1 minuto.
2. Abra o frontend e faça um login de teste.
3. Deixe uma aba do Swagger já autorizada (veja "Testando a API pelo Swagger" no [README](README.md)) para mostrar os módulos que ainda não têm tela.

A API volta a dormir após 15 minutos sem uso. Se a apresentação tiver pausas longas, cadastre o endereço `/actuator/health/liveness` num serviço gratuito de "ping", como o cron-job.org, a cada 10 minutos, só naquele dia. Use o `liveness`, e não o `/actuator/health`: o `liveness` não consulta o banco e por isso não consome as horas gratuitas do Neon.

### Roteiro sugerido (cerca de 10 minutos)

1. **Problema e proposta** (1 min): igrejas que controlam tudo em planilhas e cadernos; o ChurchHub centraliza.
2. **Membros como Administrador:** buscar por nome, cadastrar um membro (mostre a validação de CPF inválido), editar, tentar excluir Ana Beatriz Carvalho (bloqueado pela RN14) e excluir Bruna Kessler, que não tem histórico financeiro.
3. **Permissões por perfil:** saia e entre como Pastor (só consulta) e depois como Membro (sem acesso). Ressalte que a tela só esconde os botões; quem realmente bloqueia é o backend.
4. **Módulos da API pelo Swagger:**
   * `GET /api/v1/dashboard` como Administrador mostra o resumo financeiro do mês, os aniversariantes e os próximos eventos. Como Pastor, o resumo financeiro não aparece (RN12).
   * `PUT /api/v1/events/{id}` no evento "Culto de ação de graças", que já passou: o Secretário recebe erro (RN09) e o Administrador consegue editar.
5. **Arquitetura e próximos passos:** camadas, JWT, Flyway, Docker e os itens de "Próximos passos" do README.

### Plano B: frontend simulado

Crie um **segundo projeto na Vercel**, a partir do mesmo repositório e também com Root Directory `frontend`, com uma única variável: `VITE_USE_MOCK_API=true`. Ele funciona sem API e sem banco, porque tudo roda no navegador, com as mesmas contas e os mesmos membros. Se o Render ou a internet da sala falharem, abra este endereço. Os dados voltam ao estado inicial quando a página é recarregada.

## Recomeçar os dados de demonstração

Qualquer pessoa com as senhas públicas pode alterar os dados. Para voltar ao estado inicial:

1. No Neon, abra o **SQL Editor** e execute:

   ```sql
   TRUNCATE movimentacoes_financeiras, categorias_financeiras, eventos,
            membros, password_reset_tokens, usuarios CASCADE;
   ```

   Não apague as tabelas `perfis` e `flyway_schema_history`.

2. No Render, use **Manual Deploy → Restart service**. Na subida, a carga inicial recria as contas e os dados.

## Problemas comuns

**O login fica carregando e depois diz que o servidor demorou.** A API estava dormindo. Espere um minuto e tente de novo. Se acontecer sempre, confira se `VITE_API_TIMEOUT_MS=90000` está na Vercel e se você fez um novo deploy depois de criá-la.

**"Não foi possível conectar ao servidor", e o console do navegador (F12) fala em CORS.** O `CORS_ALLOWED_ORIGINS` do Render não bate exatamente com o endereço do frontend. Confira `https`, a ausência de barra no final e se é o domínio de produção da Vercel.

**O deploy no Render falha com "JWT_SECRET ausente ou curto demais".** A variável não foi criada ou tem menos de 32 caracteres. A API recusa subir sem ela de propósito, para que ninguém consiga forjar um token.

**Os logs mostram erro de conexão ou de SSL com o banco.** Confira se `DB_HOST` tem só o endereço (sem `postgresql://`) e se `DB_SSL_MODE=require`.

**O deploy trava durante as migrations do Flyway.** Provavelmente o host usado é o do pooler (com `-pooler` no nome). Troque pelo da conexão direta (passo 1).

**As contas de demonstração dão "E-mail ou senha inválidos".** A API subiu sem `DEMO_DATA_ENABLED=true`. Corrija a variável e reinicie o serviço; nos logs deve aparecer a linha "Demonstração carregada".

**Apertar F5 em `/membros` dá erro 404 na Vercel.** O Root Directory do projeto não é `frontend`, então a Vercel não encontra o `vercel.json` que redireciona as rotas para o React.

**O Render reinicia sozinho ou mostra falta de memória.** Confira se o `JAVA_OPTS` do passo 2 foi aplicado.

**O Neon avisa que acabaram as horas de computação.** O plano gratuito tem 100 horas por mês, contadas só enquanto o banco está acordado. Algo está consultando o banco o tempo todo; por exemplo, um ping em `/actuator/health` em vez de `/actuator/health/liveness`.

## Segurança deste ambiente

* As contas de demonstração têm senha pública: use só dados fictícios.
* O `JWT_SECRET` e a senha do banco existem apenas nas variáveis do Render. Nunca os coloque no código nem faça commit do `.env`.
* Para um ambiente com dados reais, use `DEMO_DATA_ENABLED=false` e crie o primeiro administrador com `ADMIN_EMAIL` e `ADMIN_PASSWORD` (8+ caracteres).
