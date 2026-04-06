# 🚀 HC GeoGestão — Plano de Migração Supabase → Docker

## Objetivo

Migrar 100% da dependência do Supabase Cloud para uma infraestrutura Docker self-hosted composta por:

| Container | Tecnologia | Porta |
|---|---|---|
| **frontend** | React (Vite) + Nginx | 80/443 |
| **api** | Node.js + Express | 3001 |
| **db** | PostgreSQL 16 | 5432 |
| **storage** | Volume Docker (uploads) | — |

---

## Documentos do Plano

| # | Arquivo | Conteúdo |
|---|---|---|
| 01 | [Infraestrutura Docker](./01-docker-infrastructure.md) | Docker Compose, Dockerfiles, volumes, networking |
| 02 | [Banco de Dados](./02-database-migration.md) | SQL completo de criação das 26 tabelas, triggers, functions |
| 03 | [API Backend](./03-api-backend.md) | Estrutura Node/Express, todos os endpoints REST, autenticação JWT |
| 04 | [Frontend Refactoring](./04-frontend-refactoring.md) | Mapa de todos os 38 arquivos que precisam mudar, antes/depois para cada um |
| 05 | [Storage & Uploads](./05-storage-migration.md) | Migração de 4 buckets Supabase para API de upload própria |
| 06 | [Checklist de Execução](./06-checklist-execucao.md) | Passo a passo ordenado para executar a migração |

---

## Escopo da Migração

### O que sai (Supabase)
- ❌ `@supabase/supabase-js` (SDK cliente)
- ❌ Supabase Auth (GoTrue)
- ❌ Supabase PostgREST (API automática)
- ❌ Supabase Storage (4 buckets)
- ❌ Supabase RLS (Row Level Security)

### O que entra (Docker)
- ✅ PostgreSQL 16 (mesmo schema, sem RLS)
- ✅ API Node.js + Express (substitui PostgREST + GoTrue)
- ✅ JWT próprio (substitui Supabase Auth)
- ✅ Multer + volume Docker (substitui Storage)
- ✅ Middleware de `user_id` (substitui RLS)

### O que NÃO muda
- ✅ React + TypeScript + Tailwind + shadcn/ui
- ✅ Vite, React Router, Framer Motion
- ✅ Toda a lógica visual e componentes UI
- ✅ jsPDF, Recharts, date-fns

---

## Números da Migração

| Métrica | Quantidade |
|---|---|
| Tabelas a criar no PostgreSQL | 26 |
| Stored procedures / functions | 4 (3 RPCs + 1 trigger) |
| Endpoints REST a implementar na API | ~80 (CRUD × 26 tabelas + auth + upload) |
| Arquivos frontend a refatorar | 38 |
| Buckets de storage a migrar | 4 |
| Variáveis de ambiente | ~8 |
