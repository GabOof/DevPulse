# DevPulse

**GitHub Repository Intelligence Platform**

Plataforma Full Stack para análise de atividade, colaboração, padrões de desenvolvimento e evolução histórica de projetos hospedados no GitHub.

O DevPulse transforma dados obtidos através da GitHub REST API em métricas e indicadores que ajudam a compreender como um repositório está evoluindo ao longo do tempo.

A aplicação permite analisar repositórios públicos sem autenticação e, através do login com GitHub, acessar funcionalidades adicionais como análise de repositórios privados e armazenamento de snapshots históricos.

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

### Autenticação

- GitHub OAuth
- PKCE
- sessões server-side
- cookies HttpOnly
- AES-256-GCM para proteção de tokens armazenados

### Integração

- GitHub REST API

### Testes

- Vitest
- V8 Coverage

### Infraestrutura

- Docker
- Docker Compose

---

## Requisitos

Para executar o projeto localmente é necessário possuir:

- Node.js
- npm
- Docker
- Docker Compose
- Git

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

O PostgreSQL pode ser iniciado através do Docker Compose:

```bash
docker compose up -d
```

Confira os containers:

```bash
docker compose ps
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

DATABASE_URL=postgresql://devpulse:devpulse@localhost:5432/devpulse

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

> Nunca utilize as credenciais reais do ambiente de produção no `.env.example` ou em arquivos versionados pelo Git.

---

## Gerando AUTH_ENCRYPTION_KEY

A chave utilizada para criptografar tokens deve possuir **32 bytes**, representados por **64 caracteres hexadecimais**.

Uma chave pode ser gerada com:

```bash
openssl rand -hex 32
```

Exemplo de formato:

```text
64 caracteres hexadecimais
```

A chave real não deve ser adicionada ao Git.

Alterar essa chave em um ambiente existente também torna tokens anteriormente criptografados ilegíveis.

---

## GitHub OAuth App

Para utilizar autenticação, crie uma OAuth App nas configurações de desenvolvedor do GitHub.

Durante o desenvolvimento local, configure:

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

---

## Prisma

Gere o Prisma Client:

```bash
npx prisma generate
```

Execute as migrations:

```bash
npx prisma migrate dev
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

A API possui testes automatizados utilizando Vitest.

Execute:

```bash
cd apps/api

npm test
```

Para validar o build:

```bash
npm run build
```

No frontend:

```bash
cd apps/web

npm run build
```

---

# Build de produção

## Backend

```bash
cd apps/api

npm install

npx prisma generate

npm run build
```

---

## Frontend

```bash
cd apps/web

npm install

npm run build
```

Os arquivos de produção do Vite serão gerados em:

```text
apps/web/dist
```

---

# Autor

Desenvolvido por **Gabrielle de Oliveira Fonseca** como projeto Full Stack de estudo e portfólio.

GitHub:

```text
https://github.com/GabOof
```

Repositório:

```text
https://github.com/GabOof/DevPulse
```

---

## Versão

```text
DevPulse v1.0.0
```
