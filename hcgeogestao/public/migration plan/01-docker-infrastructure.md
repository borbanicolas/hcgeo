# 01 — Infraestrutura Docker

## Arquitetura

```
                    ┌──────────────────────────────────────────────────┐
                    │              Docker Network: hcgeo-net           │
                    │                                                  │
    Internet ───▶   │  ┌──────────┐   ┌──────────┐   ┌──────────┐    │
       :80/:443     │  │ frontend │──▶│   api    │──▶│    db    │    │
                    │  │  (nginx) │   │ (node)   │   │ (pg 16)  │    │
                    │  │  :80     │   │  :3001   │   │  :5432   │    │
                    │  └──────────┘   └──────────┘   └──────────┘    │
                    │                       │                          │
                    │                       ▼                          │
                    │               ┌──────────────┐                  │
                    │               │   uploads/   │                  │
                    │               │  (volume)    │                  │
                    │               └──────────────┘                  │
                    └──────────────────────────────────────────────────┘
```

---

## Estrutura de Diretórios (novo)

```
hcgeogestao/
├── docker-compose.yml          # ⭐ Orquestração
├── .env.docker                 # Variáveis para Docker
├── frontend/
│   ├── Dockerfile              # Build React + Nginx
│   └── nginx.conf              # Config do Nginx (proxy reverso)
├── api/
│   ├── Dockerfile              # Build Node.js
│   ├── package.json            # Dependências do backend
│   ├── src/
│   │   ├── index.js            # Entrypoint Express
│   │   ├── config/
│   │   │   └── database.js     # Pool PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verification
│   │   │   └── errorHandler.js # Error handling
│   │   ├── routes/
│   │   │   ├── auth.js         # POST /auth/login, /auth/register, /auth/logout
│   │   │   ├── leads.js        # CRUD /api/leads
│   │   │   ├── clientes.js     # CRUD /api/clientes
│   │   │   ├── propostas.js    # CRUD /api/propostas + itens
│   │   │   ├── ordensServico.js
│   │   │   ├── obras.js
│   │   │   ├── medicoes.js
│   │   │   ├── relatorios.js
│   │   │   ├── estoque.js      # estoque + saidas
│   │   │   ├── fornecedores.js
│   │   │   ├── veiculos.js     # veiculos + abastecimentos + registros
│   │   │   ├── colaboradores.js # colaboradores + docs + ponto
│   │   │   ├── financeiro.js   # contas_pagar + contas_receber + despesas_fixas
│   │   │   ├── documentosEmpresa.js
│   │   │   └── upload.js       # Upload de arquivos
│   │   └── utils/
│   │       ├── generateNumber.js  # Sequential number generator
│   │       └── jwt.js          # JWT sign/verify helpers
│   └── uploads/                # Pasta de uploads (montada via volume)
├── db/
│   └── init.sql                # ⭐ Script completo de criação do banco
└── src/                        # Frontend existente (será refatorado)
```

---

## docker-compose.yml

```yaml
version: "3.9"

services:
  # ═══════════════════════════════════════════
  # BANCO DE DADOS
  # ═══════════════════════════════════════════
  db:
    image: postgres:16-alpine
    container_name: hcgeo-db
    restart: always
    environment:
      POSTGRES_DB: ${DB_NAME:-hcgeogestao}
      POSTGRES_USER: ${DB_USER:-hcgeo}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-hcgeo_secret_2026}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/01-init.sql
    networks:
      - hcgeo-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-hcgeo} -d ${DB_NAME:-hcgeogestao}"]
      interval: 5s
      timeout: 5s
      retries: 5

  # ═══════════════════════════════════════════
  # API BACKEND (Node.js + Express)
  # ═══════════════════════════════════════════
  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: hcgeo-api
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-hcgeogestao}
      DB_USER: ${DB_USER:-hcgeo}
      DB_PASSWORD: ${DB_PASSWORD:-hcgeo_secret_2026}
      JWT_SECRET: ${JWT_SECRET:-trocar_esse_segredo_em_producao_2026}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      UPLOAD_MAX_SIZE_MB: ${UPLOAD_MAX_SIZE_MB:-10}
    ports:
      - "3001:3001"
    volumes:
      - uploads:/app/uploads
    networks:
      - hcgeo-net

  # ═══════════════════════════════════════════
  # FRONTEND (React + Nginx)
  # ═══════════════════════════════════════════
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3001}
    container_name: hcgeo-frontend
    restart: always
    depends_on:
      - api
    ports:
      - "80:80"
    networks:
      - hcgeo-net

volumes:
  pgdata:
    driver: local
  uploads:
    driver: local

networks:
  hcgeo-net:
    driver: bridge
```

---

## Dockerfile — API (`api/Dockerfile`)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copiar código
COPY src/ ./src/

# Criar pasta de uploads
RUN mkdir -p /app/uploads

EXPOSE 3001

CMD ["node", "src/index.js"]
```

---

## Dockerfile — Frontend (`frontend/Dockerfile`)

```dockerfile
# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar código fonte
COPY . .

# Variável de build (injetada via docker-compose args)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build
RUN npm run build

# ── Stage 2: Serve ──
FROM nginx:alpine

# Copiar build
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar config do Nginx
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## Nginx Config (`frontend/nginx.conf`)

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA: redireciona todas as rotas para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para a API
    location /api/ {
        proxy_pass http://api:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 10M;
    }

    # Proxy para auth
    location /auth/ {
        proxy_pass http://api:3001/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Servir uploads como estáticos
    location /uploads/ {
        proxy_pass http://api:3001/uploads/;
    }

    # Cache para assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

---

## Variáveis de Ambiente (`.env.docker`)

```env
# ── Database ──
DB_NAME=hcgeogestao
DB_USER=hcgeo
DB_PASSWORD=TROCAR_ESSA_SENHA_EM_PRODUCAO

# ── API ──
JWT_SECRET=TROCAR_ESSE_SEGREDO_EM_PRODUCAO
JWT_EXPIRES_IN=7d
UPLOAD_MAX_SIZE_MB=10

# ── Frontend ──
VITE_API_URL=http://localhost:3001
# Em produção, usar o domínio:
# VITE_API_URL=https://api.seudominio.com.br
```

---

## Comandos de Uso

### Desenvolvimento Local
```bash
# Subir tudo
docker compose --env-file .env.docker up --build

# Subir apenas o banco (para dev local do frontend/api)
docker compose --env-file .env.docker up db

# Ver logs
docker compose logs -f api

# Acessar o banco
docker compose exec db psql -U hcgeo -d hcgeogestao

# Rebuild apenas a API
docker compose --env-file .env.docker up --build api
```

### Produção
```bash
# Build e deploy
docker compose --env-file .env.production up -d --build

# Backup do banco
docker compose exec db pg_dump -U hcgeo hcgeogestao > backup.sql

# Restaurar banco
docker compose exec -T db psql -U hcgeo hcgeogestao < backup.sql
```
