# DevPulse

**GitHub Repository Intelligence Platform**

Plataforma Full Stack para análise de atividade, colaboração, padrões de desenvolvimento e evolução histórica de projetos hospedados no GitHub.

O DevPulse transforma dados obtidos através da GitHub REST API em métricas e indicadores que ajudam a compreender como um repositório está evoluindo ao longo do tempo.

A aplicação permite analisar repositórios públicos sem autenticação e, através do login com GitHub, acessar funcionalidades adicionais como análise de repositórios privados e armazenamento de snapshots históricos.

---

## Aplicação em produção

**Frontend**

https://gaboof.github.io/DevPulse/

**API**

https://devpulse-api-gab.onrender.com

**Repositório**

https://github.com/GabOof/DevPulse

---

## Funcionalidades

- Análise de repositórios públicos do GitHub
- Autenticação utilizando GitHub OAuth
- Suporte a repositórios privados para usuários autenticados
- Métricas de atividade de commits
- Distribuição de linguagens
- Análise de colaboração entre contribuidores
- Commit Intelligence
- Project Health Score
- Histórico de análises
- Snapshots de métricas
- Visualização da evolução do projeto
- Cache de consultas à GitHub API
- Exibição de informações de rate limit
- API com rate limiting
- Health check e readiness check
- Persistência em PostgreSQL

---

## Tecnologias

### Frontend

- React
- TypeScript
- Vite
- Recharts
- CSS

### Backend

- Node.js
- TypeScript
- Fastify

### Banco de dados

- PostgreSQL
- Prisma ORM
- `@prisma/adapter-pg`

### Autenticação e segurança

- GitHub OAuth
- PKCE
- State validation
- Sessões server-side
- Cookies HttpOnly
- Cookies Secure em produção
- AES-256-GCM para proteção dos tokens armazenados
- Rate limiting
- CORS
- Security headers

### Integração

- GitHub REST API

### Testes

- Vitest
- V8 Coverage

### Infraestrutura

- GitHub Pages — frontend
- Render — backend
- Neon — PostgreSQL de produção
- Docker
- Docker Compose
- GitHub Actions

---

## Arquitetura

```text
                    GitHub REST API
                           ▲
                           │
                           │
GitHub Pages         Render API
React + Vite  ───►  Node + Fastify
                           │
                           │ Prisma
                           ▼
                    Neon PostgreSQL
```

Em desenvolvimento, o PostgreSQL é executado localmente através de Docker Compose.

---

# Executando localmente

## 1. Clone o repositório

```bash
git clone https://github.com/GabOof/DevPulse.git
```

Entre no diretório:

```bash
cd DevPulse
```

---

## 2. Banco de dados

O PostgreSQL local pode ser iniciado através do Docker Compose:

```bash
docker compose up -d
```

Confira o container:

```bash
docker compose ps
```

A configuração local utiliza:

```text
localhost:5433
```

---

# Backend

Entre no diretório da API:

```bash
cd apps/api
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

---

## Variáveis de ambiente da API

Exemplo de configuração local:

```env
NODE_ENV=development

HOST=0.0.0.0
PORT=3333
TRUST_PROXY=false

DATABASE_URL=postgresql://devpulse:devpulse@localhost:5433/devpulse

FRONTEND_URL=http://localhost:5173

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:3333/api/auth/github/callback

SESSION_COOKIE_NAME=devpulse_session
AUTH_ENCRYPTION_KEY=your-64-character-hexadecimal-key

RATE_LIMIT_MAX=120

CACHE_REPOSITORY_TTL_SECONDS=300
CACHE_ANALYTICS_TTL_SECONDS=120
```

> Nunca utilize credenciais reais do ambiente de produção no `.env.example` ou em arquivos versionados pelo Git.

---

## Gerando `AUTH_ENCRYPTION_KEY`

A chave utilizada para criptografar tokens deve possuir **32 bytes**, representados por **64 caracteres hexadecimais**.

Uma chave pode ser gerada com:

```bash
openssl rand -hex 32
```

A chave real não deve ser adicionada ao Git.

Alterar essa chave em um ambiente existente torna tokens anteriormente criptografados ilegíveis.

---

## GitHub OAuth App

Para utilizar a autenticação, crie uma OAuth App nas configurações de desenvolvedor do GitHub.

Durante o desenvolvimento local, utilize:

```text
Homepage URL:
http://localhost:5173
```

```text
Authorization callback URL:
http://localhost:3333/api/auth/github/callback
```

Depois configure no `.env`:

```env
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3333/api/auth/github/callback
```

No ambiente de produção, o callback utilizado pela aplicação é:

```text
https://devpulse-api-gab.onrender.com/api/auth/github/callback
```

e o frontend está disponível em:

```text
https://gaboof.github.io/DevPulse/
```

---

## Prisma

Gere o Prisma Client:

```bash
npx prisma generate
```

Execute as migrations no ambiente de desenvolvimento:

```bash
npx prisma migrate dev
```

Para aplicar migrations já existentes em produção:

```bash
npx prisma migrate deploy
```

---

## Iniciando a API

```bash
npm run dev
```

A API ficará disponível em:

```text
http://localhost:3333
```

### Health check

```text
GET /health
```

Exemplo:

```bash
curl http://localhost:3333/health
```

### Readiness check

```text
GET /ready
```

O readiness verifica também a disponibilidade do banco de dados.

---

# Frontend

Abra outro terminal e entre no frontend:

```bash
cd apps/web
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env
```

Configure o endereço da API:

```env
VITE_API_URL=http://localhost:3333
```

Inicie a aplicação:

```bash
npm run dev
```

O frontend ficará disponível em:

```text
http://localhost:5173
```

---

# Testes

## Backend

Entre na API:

```bash
cd apps/api
```

Execute os testes:

```bash
npm test
```

Para executar os testes uma única vez:

```bash
npm run test:run
```

Para gerar cobertura:

```bash
npm run test:coverage
```

Para executar testes e build:

```bash
npm run check
```

---

## Frontend

```bash
cd apps/web
npm run check
```

---

# Build de produção

## Backend

```bash
cd apps/api

npm install
npm run build
```

Os arquivos compilados são gerados em:

```text
apps/api/dist
```

O backend de produção é executado no Render através de:

```bash
npm start
```

---

## Frontend

```bash
cd apps/web

npm install
npm run build
```

Os arquivos de produção do Vite são gerados em:

```text
apps/web/dist
```

---

# Deploy

## Frontend — GitHub Pages

O frontend é publicado através do GitHub Actions.

A aplicação utiliza:

```text
https://gaboof.github.io/DevPulse/
```

O Vite está configurado com:

```text
base: /DevPulse/
```

e o workflow realiza automaticamente:

```text
push em main
      ↓
npm ci
      ↓
npm run build
      ↓
apps/web/dist
      ↓
GitHub Pages
```

A URL da API é fornecida durante o build através da variável:

```env
VITE_API_URL=https://devpulse-api-gab.onrender.com
```

---

## Backend — Render

A API é publicada como um Web Service no Render:

```text
https://devpulse-api-gab.onrender.com
```

Configuração principal:

```text
Root Directory:
apps/api

Build Command:
npm ci && npm run build

Start Command:
npm start
```

As credenciais e configurações de produção são armazenadas como variáveis de ambiente no Render e não são versionadas no Git.

---

## Banco de produção — Neon

O ambiente de produção utiliza PostgreSQL hospedado no Neon.

A API acessa o banco através da variável:

```env
DATABASE_URL
```

A connection string e as credenciais do banco nunca devem ser adicionadas ao repositório.

Durante o desenvolvimento local, o projeto continua utilizando PostgreSQL através do Docker Compose.

---

# Ambientes

```text
DESENVOLVIMENTO

React / Vite
localhost:5173
      │
      ▼
Fastify
localhost:3333
      │
      ▼
PostgreSQL / Docker
localhost:5433
```

```text
PRODUÇÃO

GitHub Pages
gaboof.github.io/DevPulse
      │
      ▼
Render
devpulse-api-gab.onrender.com
      │
      ▼
Neon PostgreSQL
```

---

# Segurança

O DevPulse utiliza diferentes mecanismos para proteção da aplicação:

- OAuth com PKCE
- Validação de `state` durante autenticação
- Tokens GitHub armazenados de forma criptografada
- AES-256-GCM
- Sessões mantidas no servidor
- Cookies HttpOnly
- Cookies Secure em produção
- CORS restrito ao frontend
- Rate limiting
- Security headers
- Credenciais fornecidas apenas por variáveis de ambiente
- Nenhuma chave ou senha de produção armazenada no repositório

---

# Estrutura principal

```text
devpulse/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
│
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   ├── package.json
│   │   ├── prisma7.config.ts
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   └── web/
│       ├── public/
│       ├── src/
│       ├── index.html
│       ├── package.json
│       └── vite.config.ts
│
├── docker-compose.yml
└── README.md
```

---

# Autor

Desenvolvido por **Gabrielle de Oliveira Fonseca** como projeto Full Stack de estudo e portfólio.

GitHub:

https://github.com/GabOof

Repositório:

https://github.com/GabOof/DevPulse

---

## Versão

```text
DevPulse v1.0.0
```
