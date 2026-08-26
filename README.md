# DevPulse

Plataforma Full Stack para análise de atividade, produtividade e evolução de projetos hospedados no GitHub.

O DevPulse coleta dados de repositórios públicos através da GitHub REST API e transforma essas informações em métricas sobre atividade de desenvolvimento, commits, tecnologias utilizadas, colaboração e evolução histórica do projeto.

---

## Tecnologias

### Frontend

- React
- TypeScript
- Vite
- Recharts

### Backend

- Node.js
- TypeScript
- Fastify

### Banco de dados

- PostgreSQL
- Prisma ORM

### Integrações

- GitHub REST API

### Infraestrutura

- Docker
- Docker Compose

---

## Requisitos

Para executar o projeto localmente:

- Node.js
- npm
- Docker
- Docker Compose
- Git

---

## Configuração

Clone o repositório:

```bash
git clone https://github.com/SEU-USUARIO/devpulse.git
```

Entre no projeto:

```bash
cd devpulse
```

---

## Banco de dados

Suba o PostgreSQL:

```bash
docker compose up -d
```

Confira:

```bash
docker compose ps
```

---

## Backend

Entre na API:

```bash
cd apps/api
```

Instale as dependências:

```bash
npm install
```

Crie seu arquivo de ambiente:

```bash
cp .env.example .env
```

Configure:

```env
DATABASE_URL="postgresql://devpulse:devpulse@localhost:5432/devpulse"

GITHUB_API_TOKEN=
```

Execute as migrations:

```bash
npx prisma migrate dev
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Inicie:

```bash
npm run dev
```

A API estará disponível em:

```text
http://localhost:3333
```

Teste:

```bash
curl http://localhost:3333/health
```

Resposta esperada:

```json
{
    "status": "ok",
    "service": "devpulse-api"
}
```

---

## Frontend

Em outro terminal:

```bash
cd apps/web
```

Instale:

```bash
npm install
```

Crie o ambiente:

```bash
cp .env.example .env
```

Configure:

```env
VITE_API_URL=http://localhost:3333
```

Execute:

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:5173
```

---

## Autor

Desenvolvido como projeto de estudo e portfólio.
