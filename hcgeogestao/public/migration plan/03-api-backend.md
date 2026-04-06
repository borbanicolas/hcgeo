# 03 — API Backend (Node.js + Express)

## Visão Geral

A API substitui 3 serviços do Supabase:
1. **GoTrue** → Endpoints de Auth (`/auth/*`)
2. **PostgREST** → Endpoints CRUD (`/api/*`)
3. **Storage** → Endpoints de Upload (`/api/upload/*`)

---

## Dependências (`api/package.json`)

```json
{
  "name": "hcgeo-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "pg": "^8.13.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "helmet": "^8.0.0",
    "morgan": "^1.10.0",
    "uuid": "^10.0.0"
  }
}
```

---

## Entrypoint (`api/src/index.js`)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const clientesRoutes = require('./routes/clientes');
const propostasRoutes = require('./routes/propostas');
const ordensServicoRoutes = require('./routes/ordensServico');
const obrasRoutes = require('./routes/obras');
const medicoesRoutes = require('./routes/medicoes');
const relatoriosRoutes = require('./routes/relatorios');
const estoqueRoutes = require('./routes/estoque');
const fornecedoresRoutes = require('./routes/fornecedores');
const veiculosRoutes = require('./routes/veiculos');
const colaboradoresRoutes = require('./routes/colaboradores');
const financeiroRoutes = require('./routes/financeiro');
const documentosEmpresaRoutes = require('./routes/documentosEmpresa');
const uploadRoutes = require('./routes/upload');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware global
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Servir uploads como arquivos estáticos
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas
app.use('/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/propostas', propostasRoutes);
app.use('/api/ordens-servico', ordensServicoRoutes);
app.use('/api/obras', obrasRoutes);
app.use('/api/medicoes', medicoesRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/estoque', estoqueRoutes);
app.use('/api/fornecedores', fornecedoresRoutes);
app.use('/api/veiculos', veiculosRoutes);
app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/documentos-empresa', documentosEmpresaRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[HCGEO API] Rodando na porta ${PORT}`);
});
```

---

## Database Pool (`api/src/config/database.js`)

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'hcgeogestao',
  user: process.env.DB_USER || 'hcgeo',
  password: process.env.DB_PASSWORD || 'hcgeo_secret_2026',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error:', err);
});

module.exports = { pool };
```

---

## JWT Helpers (`api/src/utils/jwt.js`)

```javascript
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'trocar_em_producao';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId, email) {
  return jwt.sign(
    { sub: userId, email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
```

---

## Auth Middleware (`api/src/middleware/auth.js`)

```javascript
const { verifyToken } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;   // ← Substitui o auth.uid() do Supabase
    req.userEmail = payload.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

module.exports = { authMiddleware };
```

---

## Error Handler (`api/src/middleware/errorHandler.js`)

```javascript
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
}

module.exports = { errorHandler };
```

---

## Number Generator (`api/src/utils/generateNumber.js`)

```javascript
const { pool } = require('../config/database');

async function generatePropostaNumber(userId) {
  const result = await pool.query(
    'SELECT generate_proposta_number($1) AS numero',
    [userId]
  );
  return result.rows[0].numero;
}

async function generateOSNumber(userId) {
  const result = await pool.query(
    'SELECT generate_os_number($1) AS numero',
    [userId]
  );
  return result.rows[0].numero;
}

async function generateRelatorioNumber(userId) {
  const result = await pool.query(
    'SELECT generate_relatorio_number($1) AS numero',
    [userId]
  );
  return result.rows[0].numero;
}

module.exports = { generatePropostaNumber, generateOSNumber, generateRelatorioNumber };
```

---

## Rotas de Auth (`api/src/routes/auth.js`)

```javascript
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const { signToken } = require('../utils/jwt');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Verificar se já existe
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    // Criar usuário
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name',
      [email, password_hash, full_name || '']
    );

    const user = result.rows[0];
    const token = signToken(user.id, user.email);

    res.status(201).json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err) { next(err); }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, password_hash, full_name FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = signToken(user.id, user.email);

    res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token,
    });
  } catch (err) { next(err); }
});

// GET /auth/me — Retorna o usuário autenticado
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /auth/logout — No-op (JWT é stateless, frontend apaga o token)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout realizado' });
});

module.exports = router;
```

---

## Padrão de Rota CRUD (Exemplo: Leads)

Todas as 26 tabelas seguem este exato padrão. A variação é apenas nos nomes de tabela/colunas.

### `api/src/routes/leads.js`

```javascript
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// GET /api/leads — Listar todos (filtrado por user_id)
router.get('/', async (req, res, next) => {
  try {
    const { orderBy = 'created_at', ascending = 'false' } = req.query;

    // Whitelist de colunas permitidas para ordenação
    const allowedColumns = ['created_at', 'updated_at', 'nome_contato', 'status', 'valor_estimado'];
    const column = allowedColumns.includes(orderBy) ? orderBy : 'created_at';
    const direction = ascending === 'true' ? 'ASC' : 'DESC';

    const result = await pool.query(
      `SELECT * FROM leads WHERE user_id = $1 ORDER BY ${column} ${direction}`,
      [req.userId]
    );

    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/leads/select — Buscar com colunas específicas
router.get('/select', async (req, res, next) => {
  try {
    const { columns = '*' } = req.query;

    // Whitelist de colunas permitidas
    const allowedColumns = ['id', 'status', 'valor_estimado', 'nome_contato', 'empresa',
      'created_at', 'updated_at', 'prioridade', 'cidade_uf', 'cliente_id'];
    const requestedCols = columns.split(',').map(c => c.trim());
    const safeCols = requestedCols.filter(c => c === '*' || allowedColumns.includes(c));
    const colStr = safeCols.length > 0 ? safeCols.join(', ') : '*';

    const result = await pool.query(
      `SELECT ${colStr} FROM leads WHERE user_id = $1`,
      [req.userId]
    );

    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/leads/:id — Buscar por ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/leads — Criar
router.post('/', async (req, res, next) => {
  try {
    const {
      nome_contato, empresa, telefone_whatsapp, email, cidade_uf,
      status, tipo_servico_interesse, valor_estimado, prioridade,
      proximo_contato_em, observacoes, cliente_id
    } = req.body;

    const result = await pool.query(
      `INSERT INTO leads (
        user_id, nome_contato, empresa, telefone_whatsapp, email, cidade_uf,
        status, tipo_servico_interesse, valor_estimado, prioridade,
        proximo_contato_em, observacoes, cliente_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        req.userId, nome_contato, empresa || '', telefone_whatsapp || '', email || '',
        cidade_uf || '', status || 'Novo', tipo_servico_interesse || '{}',
        valor_estimado || 0, prioridade || 'Média',
        proximo_contato_em || null, observacoes || '', cliente_id || null
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// PUT /api/leads/:id — Atualizar
router.put('/:id', async (req, res, next) => {
  try {
    // Verificar se pertence ao usuário
    const check = await pool.query(
      'SELECT id FROM leads WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    // Construir SET dinâmico (apenas campos enviados)
    const allowedFields = [
      'nome_contato', 'empresa', 'telefone_whatsapp', 'email', 'cidade_uf',
      'status', 'tipo_servico_interesse', 'valor_estimado', 'prioridade',
      'proximo_contato_em', 'observacoes', 'cliente_id'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(req.body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(req.params.id);
    values.push(req.userId);

    const result = await pool.query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
      values
    );

    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

// DELETE /api/leads/:id — Excluir
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }

    res.json({ message: 'Lead excluído' });
  } catch (err) { next(err); }
});

module.exports = router;
```

---

## Mapa Completo de Endpoints

### Auth (sem middleware)
| Método | Endpoint | Ação |
|---|---|---|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login → retorna JWT |
| GET | `/auth/me` | Dados do usuário logado |
| POST | `/auth/logout` | No-op (stateless) |

### CRUD Genérico (todos com `authMiddleware`)

Cada tabela expõe os mesmos 5 endpoints:

| Método | Endpoint | Ação | Nota |
|---|---|---|---|
| GET | `/api/{recurso}` | Listar todos | `?orderBy=col&ascending=true` |
| GET | `/api/{recurso}/select` | Listar colunas específicas | `?columns=id,status,nome` |
| GET | `/api/{recurso}/:id` | Buscar por ID | |
| POST | `/api/{recurso}` | Criar | |
| PUT | `/api/{recurso}/:id` | Atualizar | |
| DELETE | `/api/{recurso}/:id` | Excluir | |

### Recursos (26 tabelas → 26 rotas)

| # | Rota API | Tabela PostgreSQL |
|---|---|---|
| 1 | `/api/leads` | leads |
| 2 | `/api/clientes` | clientes |
| 3 | `/api/propostas` | propostas |
| 4 | `/api/propostas/:propostaId/itens` | proposta_itens |
| 5 | `/api/ordens-servico` | ordens_servico |
| 6 | `/api/obras` | obras |
| 7 | `/api/medicoes` | medicoes |
| 8 | `/api/medicoes/:medicaoId/fotos` | medicao_fotos |
| 9 | `/api/relatorios` | relatorios |
| 10 | `/api/estoque` | estoque |
| 11 | `/api/estoque/:estoqueId/saidas` | estoque_saidas |
| 12 | `/api/fornecedores` | fornecedores |
| 13 | `/api/veiculos` | veiculos |
| 14 | `/api/veiculos/:veiculoId/abastecimentos` | abastecimentos |
| 15 | `/api/veiculos/:veiculoId/registros-uso` | registros_uso_veiculo |
| 16 | `/api/colaboradores` | colaboradores |
| 17 | `/api/colaboradores/:colabId/asos` | colaborador_asos |
| 18 | `/api/colaboradores/:colabId/nrs` | colaborador_nrs |
| 19 | `/api/colaboradores/:colabId/epis` | colaborador_epis |
| 20 | `/api/colaboradores/:colabId/vacinas` | colaborador_vacinas |
| 21 | `/api/colaboradores/:colabId/arquivos` | colaborador_arquivos |
| 22 | `/api/colaboradores/:colabId/ponto` | ponto_registros |
| 23 | `/api/financeiro/contas-pagar` | contas_pagar |
| 24 | `/api/financeiro/contas-receber` | contas_receber |
| 25 | `/api/financeiro/despesas-fixas` | despesas_fixas |
| 26 | `/api/documentos-empresa` | documentos_empresa |

### Endpoints Especiais

| Método | Endpoint | Ação |
|---|---|---|
| POST | `/api/propostas/generate-number` | Gera número sequencial de proposta |
| POST | `/api/ordens-servico/generate-number` | Gera número sequencial de OS |
| POST | `/api/relatorios/generate-number` | Gera número sequencial de relatório |
| POST | `/api/upload/medicao-fotos` | Upload de foto de medição |
| POST | `/api/upload/empresa-docs` | Upload de documento da empresa |
| POST | `/api/upload/proposta-docs` | Upload de arquivo de proposta |
| POST | `/api/upload/colaborador-docs` | Upload de documento de colaborador |
| DELETE | `/api/upload/:bucket/:filename` | Deletar arquivo |

---

## Rota de Upload (`api/src/routes/upload.js`)

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const bucket = req.params.bucket || 'general';
    const dir = path.join(UPLOAD_DIR, bucket, req.userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_SIZE_MB) || 10) * 1024 * 1024 },
});

// POST /api/upload/:bucket — Upload de arquivo
// buckets: medicao-fotos, empresa-docs, proposta-docs, colaborador-docs
router.post('/:bucket', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const bucket = req.params.bucket;
  const relativePath = `${bucket}/${req.userId}/${req.file.filename}`;
  const publicUrl = `/uploads/${relativePath}`;

  res.json({
    data: {
      path: relativePath,
      publicUrl,
      filename: req.file.originalname,
    }
  });
});

// DELETE /api/upload/:bucket/:filename
router.delete('/:bucket/:filename', (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.bucket, req.userId, req.params.filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'Arquivo removido' });
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

module.exports = router;
```

---

## Rota de Propostas com itens e RPCs (`api/src/routes/propostas.js`)

Exemplo de rota mais complexa com sub-recursos e RPC:

```javascript
const express = require('express');
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { generatePropostaNumber } = require('../utils/generateNumber');

const router = express.Router();
router.use(authMiddleware);

// POST /api/propostas/generate-number
router.post('/generate-number', async (req, res, next) => {
  try {
    const numero = await generatePropostaNumber(req.userId);
    res.json({ data: numero });
  } catch (err) { next(err); }
});

// GET /api/propostas — com joins opcionais
router.get('/', async (req, res, next) => {
  try {
    const { status, orderBy = 'created_at', ascending = 'false' } = req.query;
    let query = 'SELECT * FROM propostas WHERE user_id = $1';
    const params = [req.userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    const direction = ascending === 'true' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${orderBy === 'data_emissao' ? 'data_emissao' : 'created_at'} ${direction}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/propostas/:id — Com itens
router.get('/:id', async (req, res, next) => {
  try {
    const proposta = await pool.query(
      'SELECT * FROM propostas WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (proposta.rows.length === 0) {
      return res.status(404).json({ error: 'Proposta não encontrada' });
    }

    const itens = await pool.query(
      'SELECT * FROM proposta_itens WHERE proposta_id = $1 ORDER BY ordem',
      [req.params.id]
    );

    res.json({
      data: { ...proposta.rows[0], itens: itens.rows }
    });
  } catch (err) { next(err); }
});

// POST /api/propostas — Criar proposta com itens
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { itens, ...propostaData } = req.body;

    // Gerar número se não fornecido
    if (!propostaData.numero) {
      propostaData.numero = await generatePropostaNumber(req.userId);
    }

    // Inserir proposta
    const cols = Object.keys(propostaData);
    const vals = Object.values(propostaData);
    const placeholders = vals.map((_, i) => `$${i + 2}`);

    const result = await client.query(
      `INSERT INTO propostas (user_id, ${cols.join(', ')})
       VALUES ($1, ${placeholders.join(', ')})
       RETURNING *`,
      [req.userId, ...vals]
    );

    const proposta = result.rows[0];

    // Inserir itens, se houver
    if (itens && itens.length > 0) {
      for (const item of itens) {
        await client.query(
          `INSERT INTO proposta_itens
           (proposta_id, item_numero, descricao, unidade, quantidade, valor_unitario, valor_total, ordem, is_grupo, grupo_nome)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [proposta.id, item.item_numero, item.descricao, item.unidade || 'un',
           item.quantidade || 0, item.valor_unitario || 0, item.valor_total || 0,
           item.ordem || 0, item.is_grupo || false, item.grupo_nome]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ data: proposta });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/propostas/:id — Atualizar (mesma lógica do padrão genérico)
// DELETE /api/propostas/:id — Excluir (CASCADE apaga itens)
// ... (segue o mesmo padrão de leads)

module.exports = router;
```

---

## Rota de Relatórios com Join (`api/src/routes/relatorios.js`)

Exemplo de como implementar joins (o frontend faz `select("*, obras(titulo, cliente_nome)")`):

```javascript
// GET /api/relatorios
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
              json_build_object('titulo', o.titulo, 'cliente_nome', o.cliente_nome) AS obras
       FROM relatorios r
       LEFT JOIN obras o ON r.obra_id = o.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.userId]
    );

    res.json({ data: result.rows });
  } catch (err) { next(err); }
});
```

---

## Padrão de Resposta da API

Todas as respostas seguem este formato para manter compatibilidade com o frontend:

```json
// Sucesso - lista
{ "data": [...] }

// Sucesso - item único
{ "data": { ... } }

// Sucesso - operação
{ "message": "Operação realizada" }

// Erro
{ "error": "Mensagem de erro" }
```

> **Importante**: O frontend atual espera `{ data, error }`. A API deve retornar `data` em caso de sucesso. O serviço do frontend (novo `apiClient`) será responsável por converter para o mesmo formato.
