# 06 — Checklist de Execução

Passo a passo ordenado para executar a migração. Cada etapa tem dependências claras.

---

## Fase 1: Preparação do Backend (sem tocar no frontend)

### ✅ 1.1. Criar estrutura de pastas

```bash
mkdir -p api/src/{config,middleware,routes,utils}
mkdir -p api/uploads
mkdir -p db
mkdir -p frontend
```

### ✅ 1.2. Criar `db/init.sql`

Copiar o SQL completo do documento `02-database-migration.md` para `db/init.sql`.

- [ ] Incluir a tabela `users`
- [ ] Incluir as 26 tabelas de negócio
- [ ] Incluir indexes
- [ ] Incluir triggers de `updated_at`
- [ ] Incluir funções RPC (generate_proposta_number, etc.)

### ✅ 1.3. Criar `docker-compose.yml`

Copiar do documento `01-docker-infrastructure.md`.

- [ ] Serviço `db` (PostgreSQL 16)
- [ ] Serviço `api` (Node.js)
- [ ] Serviço `frontend` (Nginx)
- [ ] Volumes: `pgdata`, `uploads`
- [ ] Network: `hcgeo-net`

### ✅ 1.4. Criar `.env.docker`

```env
DB_NAME=hcgeogestao
DB_USER=hcgeo
DB_PASSWORD=DEFINIR_SENHA_FORTE
JWT_SECRET=DEFINIR_SEGREDO_FORTE
JWT_EXPIRES_IN=7d
UPLOAD_MAX_SIZE_MB=10
VITE_API_URL=http://localhost:3001
```

### ✅ 1.5. Testar banco isolado

```bash
docker compose --env-file .env.docker up db
docker compose exec db psql -U hcgeo -d hcgeogestao -c "\dt"
# Deve listar 27 tabelas (26 + users)
```

---

## Fase 2: Desenvolver a API

### ✅ 2.1. Inicializar projeto Node

```bash
cd api
npm init -y
npm install express pg bcryptjs jsonwebtoken cors multer helmet morgan uuid
```

### ✅ 2.2. Implementar camada base

- [ ] `src/config/database.js` — Pool PostgreSQL
- [ ] `src/utils/jwt.js` — signToken, verifyToken
- [ ] `src/middleware/auth.js` — JWT verification
- [ ] `src/middleware/errorHandler.js` — Error handler
- [ ] `src/utils/generateNumber.js` — Sequential numbers
- [ ] `src/index.js` — Express entrypoint

### ✅ 2.3. Implementar Auth routes

- [ ] `POST /auth/register`
- [ ] `POST /auth/login`
- [ ] `GET /auth/me`
- [ ] `POST /auth/logout`

**Testar**: `curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123456"}'`

### ✅ 2.4. Implementar CRUD routes (por ordem de prioridade)

| Prioridade | Rota | Tabela |
|---|---|---|
| 🔴 Alta | `/api/leads` | leads |
| 🔴 Alta | `/api/clientes` | clientes |
| 🔴 Alta | `/api/propostas` | propostas + proposta_itens |
| 🔴 Alta | `/api/ordens-servico` | ordens_servico |
| 🔴 Alta | `/api/obras` | obras |
| 🟡 Média | `/api/medicoes` | medicoes + medicao_fotos |
| 🟡 Média | `/api/relatorios` | relatorios (com JOIN obras) |
| 🟡 Média | `/api/estoque` | estoque + estoque_saidas |
| 🟡 Média | `/api/fornecedores` | fornecedores |
| 🟡 Média | `/api/veiculos` | veiculos + abastecimentos + registros |
| 🟡 Média | `/api/colaboradores` | colaboradores + 5 sub-tabelas + ponto |
| 🟡 Média | `/api/financeiro` | contas_pagar + contas_receber + despesas_fixas |
| 🟢 Baixa | `/api/documentos-empresa` | documentos_empresa |

### ✅ 2.5. Implementar Upload routes

- [ ] `POST /api/upload/:bucket` — Multer + volume
- [ ] `DELETE /api/upload/:bucket/:filename`
- [ ] Servir `/uploads` como estáticos

### ✅ 2.6. Implementar RPC endpoints

- [ ] `POST /api/propostas/generate-number`
- [ ] `POST /api/ordens-servico/generate-number`
- [ ] `POST /api/relatorios/generate-number`

### ✅ 2.7. Testar API completa

```bash
docker compose --env-file .env.docker up db api

# Testar health
curl http://localhost:3001/health

# Testar auth
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' | jq -r '.token')

# Testar CRUD
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/leads
```

---

## Fase 3: Refatorar o Frontend

### ✅ 3.1. Criar `src/lib/apiClient.ts`

Copiar o código do documento `04-frontend-refactoring.md`.

### ✅ 3.2. Atualizar `.env`

```diff
-VITE_SUPABASE_URL=...
-VITE_SUPABASE_PUBLISHABLE_KEY=...
-VITE_SUPABASE_PROJECT_ID=...
+VITE_API_URL=http://localhost:3001
```

### ✅ 3.3. Configurar proxy no Vite

Adicionar ao `vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001',
    '/auth': 'http://localhost:3001',
    '/uploads': 'http://localhost:3001',
  }
}
```

### ✅ 3.4. Trocar imports (38 arquivos)

Executar search-and-replace global:

```bash
# No VSCode: Ctrl+Shift+H
# Buscar: import { supabase } from "@/integrations/supabase/client"
# Substituir: import { supabase } from "@/lib/apiClient"
```

Lista de arquivos (38 no total — ver `04-frontend-refactoring.md` para lista completa):

- [ ] `hooks/useAuth.ts`
- [ ] `pages/Auth.tsx`
- [ ] `pages/Dashboard.tsx`
- [ ] `pages/Leads.tsx`
- [ ] `pages/Clientes.tsx`
- [ ] `pages/Propostas.tsx`
- [ ] `pages/Obras.tsx`
- [ ] `pages/Medicoes.tsx`
- [ ] `pages/Estoque.tsx`
- [ ] `pages/Fornecedores.tsx`
- [ ] `pages/Colaboradores.tsx`
- [ ] `pages/Financeiro.tsx`
- [ ] `pages/Relatorios.tsx`
- [ ] `components/leads/LeadFormDialog.tsx`
- [ ] `components/leads/LeadKanban.tsx`
- [ ] `components/clientes/ClienteFormDialog.tsx`
- [ ] `components/propostas/PropostaFormDialog.tsx`
- [ ] `components/propostas/OSFormDialog.tsx`
- [ ] `components/propostas/ImportPropostaDialog.tsx`
- [ ] `components/propostas/PropostasRelatorio.tsx`
- [ ] `components/obras/ObraFormDialog.tsx`
- [ ] `components/obras/ObraDetalhe.tsx`
- [ ] `components/medicoes/MedicaoFormDialog.tsx`
- [ ] `components/relatorios/RelatorioFormDialog.tsx`
- [ ] `components/estoque/EstoqueFormDialog.tsx`
- [ ] `components/estoque/SaidaFormDialog.tsx`
- [ ] `components/fornecedores/FornecedorFormDialog.tsx`
- [ ] `components/veiculos/VeiculoFormDialog.tsx`
- [ ] `components/veiculos/VeiculoDetalhe.tsx`
- [ ] `components/veiculos/AbastecimentoFormDialog.tsx`
- [ ] `components/veiculos/RegistroUsoFormDialog.tsx`
- [ ] `components/colaboradores/ColaboradorFormDialog.tsx`
- [ ] `components/colaboradores/ColaboradorDocumentos.tsx`
- [ ] `components/colaboradores/ColaboradorFolhaPonto.tsx`
- [ ] `components/empresa/DocumentosEmpresa.tsx`
- [ ] `components/financeiro/DesempenhoTab.tsx`
- [ ] `components/financeiro/DespesasTab.tsx`
- [ ] `lib/clienteSync.ts`

### ✅ 3.5. Remover dependência Supabase

```bash
npm uninstall @supabase/supabase-js
rm -rf src/integrations/
```

### ✅ 3.6. Testar localmente

```bash
# Terminal 1: Subir banco + API
docker compose --env-file .env.docker up db api

# Terminal 2: Subir frontend em dev
npm run dev

# Testar:
# 1. Abrir http://localhost:5173
# 2. Criar conta
# 3. Criar um lead
# 4. Criar um cliente
# 5. Criar uma proposta
# 6. Upload de arquivo
# 7. Testar cada módulo
```

---

## Fase 4: Migrar Dados (se necessário)

### ✅ 4.1. Exportar dados do Supabase

```bash
# Via Supabase CLI
npx supabase db dump --data-only > supabase_data.sql
```

### ✅ 4.2. Criar usuário no novo banco

```sql
-- Mapear o UUID do Supabase Auth para a tabela users
INSERT INTO users (id, email, password_hash, full_name)
VALUES (
  'UUID_DO_SUPABASE',
  'email@empresa.com',
  '$2b$10$...hash_bcrypt...',
  'Nome Completo'
);
```

### ✅ 4.3. Importar dados

```bash
# Remover linhas de auth.users e auth.* do dump
# Importar no novo banco
docker compose exec -T db psql -U hcgeo hcgeogestao < supabase_data_cleaned.sql
```

### ✅ 4.4. Migrar arquivos do Storage

```bash
# Download do Supabase Storage
for bucket in medicao-fotos empresa-docs proposta-docs colaborador-docs; do
  npx supabase storage cp -r "ss:///$bucket" "./api/uploads/$bucket/"
done
```

### ✅ 4.5. Atualizar URLs no banco

```sql
-- Trocar prefixo das URLs
UPDATE medicao_fotos SET url = REPLACE(url,
  'https://uixhyywpqiwpjghbbtju.supabase.co/storage/v1/object/public/',
  '/uploads/'
) WHERE url LIKE '%supabase%';

-- Repetir para todas as 9 tabelas com URLs (ver doc 05)
```

---

## Fase 5: Docker Build Final

### ✅ 5.1. Criar Dockerfiles

- [ ] `api/Dockerfile` (Node 20 Alpine)
- [ ] `frontend/Dockerfile` (multi-stage: build + nginx)
- [ ] `frontend/nginx.conf` (SPA + proxy)

### ✅ 5.2. Build e teste integrado

```bash
docker compose --env-file .env.docker up --build
# Acessar http://localhost
# Testar TODOS os módulos
```

### ✅ 5.3. Checklist de testes

| Módulo | Teste |
|---|---|
| Auth | Login, Cadastro, Logout, Refresh |
| Dashboard | KPIs carregam, Alertas aparecem, Funil funciona |
| Leads | CRUD, Kanban drag-and-drop, Filtros |
| Clientes | CRUD, Filtro PF/PJ, Busca |
| Propostas | CRUD, PDF Export, Import JSON, Gerar OS |
| OS | CRUD, Status |
| Obras | CRUD, Detalhe com medições |
| Medições | CRUD, Upload de fotos, Remover fotos |
| Relatórios | CRUD, Join com obras |
| Estoque | CRUD, Saídas, Devolução |
| Fornecedores | CRUD, Filtros |
| Veículos | CRUD, Abastecimentos, Registros de uso |
| Colaboradores | CRUD, ASOs, NRs, EPIs, Vacinas, Arquivos, Ponto |
| Financeiro | Senha gate, Contas a pagar/receber, DRE, Gráficos, Gerar cobranças |
| Documentos Empresa | CRUD, Upload |

---

## Fase 6: Deploy em Produção (VPS)

### ✅ 6.1. Preparar VPS

```bash
# Instalar Docker + Docker Compose
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
```

### ✅ 6.2. Configurar DNS

| Registro | Tipo | Valor |
|---|---|---|
| `app.empresa.com.br` | A | IP da VPS |
| `api.empresa.com.br` | A | IP da VPS (se separado) |

### ✅ 6.3. Deploy

```bash
# Clonar repo na VPS
git clone https://github.com/usuario/hcgeogestao.git
cd hcgeogestao

# Configurar variáveis de produção
cp .env.docker .env.production
nano .env.production  # Definir senhas fortes

# Build e deploy
docker compose --env-file .env.production up -d --build
```

### ✅ 6.4. SSL (HTTPS)

Opção 1: Certbot direto
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d app.empresa.com.br
```

Opção 2: Nginx Proxy Manager (recomendado)
```yaml
# Adicionar ao docker-compose.yml
nginx-proxy:
  image: jc21/nginx-proxy-manager:latest
  ports:
    - "80:80"
    - "443:443"
    - "81:81"       # Admin UI
  volumes:
    - npm_data:/data
    - npm_letsencrypt:/etc/letsencrypt
```

---

## Estimativas de Tempo

| Fase | Estimativa |
|---|---|
| Fase 1: Preparação | 1-2 horas |
| Fase 2: API Backend | 8-12 horas |
| Fase 3: Frontend Refactoring | 2-4 horas |
| Fase 4: Migração de Dados | 2-3 horas |
| Fase 5: Docker Build | 1-2 horas |
| Fase 6: Deploy | 2-3 horas |
| **Total** | **16-26 horas** |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| QueryBuilder não cobre todos os casos de uso do Supabase SDK | Média | Refinar o apiClient conforme erros aparecem nos testes |
| Joins do PostgREST com sintaxe complexa | Baixa | Já mapeados nos docs; a API retorna joins nativamente |
| Upload de arquivos maiores que 10MB | Baixa | Configurável via UPLOAD_MAX_SIZE_MB |
| Perda de dados na migração | Média | Fazer backup ANTES de iniciar; manter Supabase ativo até validar |
| CORS em produção | Média | Nginx proxy resolve (mesma origem) |
| Performance do PostgreSQL sem cache | Baixa | O volume de dados é pequeno; indexes já definidos |
