const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');
const { insertAuditLog } = require('../utils/auditLog');

const router = express.Router();

// All CRUD routes require authentication
router.use(authMiddleware);

// ─── Allowed tables (whitelist for security) ────────────────────────
const ALLOWED_TABLES = [
  'leads', 'clientes', 'propostas', 'proposta_itens', 'ordens_servico',
  'obras', 'medicoes', 'medicao_fotos', 'relatorios',
  'estoque', 'estoque_saidas', 'fornecedores',
  'veiculos', 'abastecimentos', 'registros_uso_veiculo',
  'colaboradores', 'colaborador_asos', 'colaborador_nrs',
  'colaborador_epis', 'colaborador_vacinas', 'colaborador_arquivos',
  'ponto_registros',
  'contas_pagar', 'contas_receber', 'despesas_fixas',
  'documentos_empresa',
];

// Tables that DON'T have user_id (child tables linked via FK)
const NO_USER_ID_TABLES = ['proposta_itens'];

function validateTable(tableName) {
  return ALLOWED_TABLES.includes(tableName);
}

// ─── SELECT (list with filters) ─────────────────────────────────────
router.get('/:table', async (req, res) => {
  const { table } = req.params;
  console.log(`\n[DEBUG BACKEND] 🟢 Requisição GET recebida para a tabela: ${table}`);
  console.log(`[DEBUG BACKEND] 🔑 User ID chamando a rota:`, req.userId);
  console.log(`[DEBUG BACKEND] 🔍 Query Params recebidos:`, req.query);

  if (!validateTable(table)) {
    console.log(`[DEBUG BACKEND] 🛑 Erro: Tabela inválida (${table})`);
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  try {
    const hasUserId = !NO_USER_ID_TABLES.includes(table);

    // Support querying relationships: select=*,clientes(razao_social)
    let selectClause = `${table}.*`;
    let joinSql = '';

    if (req.query.select && req.query.select !== '*') {
      const selectStr = req.query.select;
      const matches = [...selectStr.matchAll(/(\w+)\(([^)]+)\)/g)];
      let joinIndex = 1;

      for (const match of matches) {
        const tJoin = match[1];
        const rawCols = match[2];
        const cols = rawCols === '*' ? ['id', 'created_at'] : rawCols.split(',').map(c => c.trim());
        const alias = `_j${joinIndex++}`;
        
        let tSingular = tJoin;
        if (tJoin.endsWith('coes')) tSingular = tJoin.replace('coes', 'cao');
        else if (tJoin.endsWith('s')) tSingular = tJoin.slice(0, -1);
        
        const fk = `${tSingular}_id`;
        
        // Handling basic *, table2(*) or cols
        const jsonObjArgs = cols.map(c => `'${c}', ${alias}.${c}`).join(', ');
        
        selectClause += `, (CASE WHEN ${alias}.id IS NOT NULL THEN json_build_object('id', ${alias}.id, ${jsonObjArgs}) ELSE NULL END) AS ${tJoin}`;
        
        // Assuming table -> tJoin via fk
        // (Note: works mainly if parent has parent_id or if table has child_id)
        if (['propostas', 'clientes', 'fornecedores'].includes(tJoin)) {
          joinSql += ` LEFT JOIN ${tJoin} AS ${alias} ON ${table}.${fk} = ${alias}.id`;
        } else {
          // If backwards (e.g. ordens_servico.proposta_id)
          joinSql += ` LEFT JOIN ${tJoin} AS ${alias} ON ${table}.${fk} = ${alias}.id`;
        }
      }
    }

    let query = `SELECT ${selectClause} FROM ${table} ${joinSql}`;
    const params = [];

    // Support filtering via query params (e.g. ?id=5)
    const filters = { ...req.query };
    delete filters.order;
    delete filters.limit;
    delete filters.offset;
    delete filters.select;

    for (let [key, rawValue] of Object.entries(filters)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const val of values) {
        let value = val;
        let operator = '=';
        
        if (typeof val === 'string' && val.includes('.')) {
          const parts = val.split('.');
          const op = parts[0];
          const actualVal = parts.slice(1).join('.');
          
          const ops = {
            'eq': '=',
            'neq': '!=',
            'gt': '>',
            'gte': '>=',
            'lt': '<',
            'lte': '<=',
            'like': 'ILIKE'
          };

          if (ops[op]) {
            operator = ops[op];
            value = op === 'like' ? `%${actualVal}%` : actualVal;
          } else if (op === 'in') {
            const list = actualVal.replace(/[()]/g, '').split(',');
            params.push(list);
            const connector = params.length === 1 ? 'WHERE' : 'AND';
            query += ` ${connector} ${table}.${key} = ANY($${params.length})`;
            continue;
          }
        }

        params.push(value);
        const connector = params.length === 1 ? 'WHERE' : 'AND';
        query += ` ${connector} ${table}.${key} ${operator} $${params.length}`;
      }
    }

    // Final query preparation
    const order = req.query.order || 'created_at.desc';
    const [orderCol, orderDir] = order.split('.');
    query += ` ORDER BY ${orderCol} ${orderDir === 'asc' ? 'ASC' : 'DESC'}`;

    if (req.query.limit) {
      params.push(parseInt(req.query.limit));
      query += ` LIMIT $${params.length}`;
    }
    if (req.query.offset) {
      params.push(parseInt(req.query.offset));
      query += ` OFFSET $${params.length}`;
    }

    console.log(`[DEBUG BACKEND] 🛠️  SQL Gerada:`, query);
    console.log(`[DEBUG BACKEND] 📦 Parâmetros SQL:`, params);
    console.log(`[DEBUG BACKEND] 🔎 Buscando TUDO da tabela: ${table}...`);

    const result = await pool.query(query, params);
    console.log(`[DEBUG BACKEND] ✅ Resultados encontrados:`, result.rows.length);
    if (table === 'propostas') {
       console.log(`[DEBUG BACKEND] 📊 DADOS COMPLETOS EXTRAÍDOS DA TABELA (GET):`);
       console.dir(result.rows, { depth: null, colors: true });
    }
    res.json(result.rows);
  } catch (err) {
    console.error(`[CRUD] GET /${table} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── SELECT by ID ───────────────────────────────────────────────────
router.get('/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!validateTable(table)) {
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  try {
    let query = `SELECT * FROM ${table} WHERE id = $1`;
    const params = [id];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[CRUD] GET /${table}/${id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── INSERT ─────────────────────────────────────────────────────────
router.post('/:table', async (req, res) => {
  const { table } = req.params;
  console.log(`\n[DEBUG BACKEND] 🔵 Requisição POST (Criar) recebida para a tabela: ${table}`);
  console.log(`[DEBUG BACKEND] 🔑 User ID vinculando:`, req.userId);

  if (!validateTable(table)) {
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  try {
    const hasUserId = !NO_USER_ID_TABLES.includes(table);
    const isArray = Array.isArray(req.body);
    const items = isArray ? req.body : [req.body];

    if (items.length === 0) {
      return res.status(400).json({ error: 'Nenhum dado enviado' });
    }

    // Identifica colunas validando o primeiro item do array
    const columnsObj = { ...items[0] };
    if (hasUserId) columnsObj.user_id = req.userId;
    const keys = Object.keys(columnsObj);

    const values = [];
    let placeholdersArray = [];
    let idx = 1;

    for (const item of items) {
      const rowData = { ...item };
      if (hasUserId) rowData.user_id = req.userId;

      const itemPlaceholders = [];
      for (const key of keys) {
        values.push(rowData[key] !== undefined ? rowData[key] : null);
        itemPlaceholders.push(`$${idx++}`);
      }
      placeholdersArray.push(`(${itemPlaceholders.join(', ')})`);
    }

    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES ${placeholdersArray.join(', ')} RETURNING *`;
    const result = await pool.query(query, values);

    // Auditoria (Silencioso)
    try {
      await insertAuditLog(pool, req, {
        userId: req.userId,
        action: 'INSERT',
        tableName: table,
        recordId: result.rows[0]?.id || null,
        details: isArray ? `Foram inseridos ${result.rows.length} registros em lote` : 'Novo registro criado',
      });
    } catch(err) {}

    res.status(201).json(isArray ? result.rows : result.rows[0]);
  } catch (err) {
    console.error(`[CRUD] POST /${table} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── UPDATE ─────────────────────────────────────────────────────────
router.patch('/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!validateTable(table)) {
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  try {
    const data = { ...req.body };
    delete data.id;
    delete data.user_id;
    delete data.created_at;

    const keys = Object.keys(data);
    if (keys.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    values.push(id);
    const idPlaceholder = `$${values.length}`;

    let query = `UPDATE ${table} SET ${setClause} WHERE id = ${idPlaceholder} RETURNING *`;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (table === 'propostas') {
       console.log(`[DEBUG BACKEND] 📤 Enviando para o Front (PATCH):`, JSON.stringify(result.rows[0]));
    }

    // Auditoria
    try {
      await insertAuditLog(pool, req, {
        userId: req.userId,
        action: 'UPDATE',
        tableName: table,
        recordId: id,
        details: `Atualizou campos: ${keys.join(', ')}`,
      });
    } catch(err) { console.warn('Erro ao salvar audit log:', err.message); }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(`[CRUD] PATCH /${table}/${id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE (By Query Parameters) ──────────────────────────────────
router.delete('/:table', async (req, res) => {
  const { table } = req.params;
  if (!validateTable(table)) {
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  console.log(`\n[DEBUG BACKEND] 🔴 Requisição DELETE recebida para a tabela: ${table}`);
  console.log(`[DEBUG BACKEND] 🔍 Query Params recebidos:`, req.query);

  try {
    const filters = { ...req.query };
    if (Object.keys(filters).length === 0) {
      return res.status(400).json({ error: 'Filtros obrigatórios para DELETE em lote' });
    }

    let query = `DELETE FROM ${table}`;
    const params = [];

    for (let [key, rawValue] of Object.entries(filters)) {
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const val of values) {
        let value = val;
        let operator = '=';
        
        if (typeof val === 'string' && val.includes('.')) {
          const parts = val.split('.');
          const op = parts[0];
          const actualVal = parts.slice(1).join('.');
          const ops = { 'eq': '=', 'neq': '!=', 'gt': '>', 'gte': '>=', 'lt': '<', 'lte': '<=' };
          if (ops[op]) {
            operator = ops[op];
            value = actualVal;
          } else if (op === 'in') {
            const list = actualVal.replace(/[()]/g, '').split(',');
            params.push(list);
            const connector = params.length === 1 ? 'WHERE' : 'AND';
            query += ` ${connector} ${table}.${key} = ANY($${params.length})`;
            continue;
          }
        }

        params.push(value);
        const connector = params.length === 1 ? 'WHERE' : 'AND';
        query += ` ${connector} ${table}.${key} ${operator} $${params.length}`;
      }
    }

    query += ' RETURNING id';
    console.log(`[DEBUG BACKEND] 🛠️  SQL Gerada (DELETE):`, query);

    const result = await pool.query(query, params);
    
    // Auditoria opcional em lote
    if (result.rows.length > 0) {
      try {
        await insertAuditLog(pool, req, {
          userId: req.userId,
          action: 'DELETE',
          tableName: table,
          recordId: null,
          details: `Foram apagados ${result.rows.length} registros`,
        });
      } catch(err) {} 
    }

    res.json({ deletedCount: result.rows.length, ids: result.rows.map(r => r.id) });
  } catch (err) {
    console.error(`[CRUD] DELETE /${table} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE (By ID) ──────────────────────────────────────────────────
router.delete('/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  if (!validateTable(table)) {
    return res.status(400).json({ error: `Invalid table: ${table}` });
  }

  try {
    let query = `DELETE FROM ${table} WHERE id = $1 RETURNING id`;
    const params = [id];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Auditoria
    try {
      await insertAuditLog(pool, req, {
        userId: req.userId,
        action: 'DELETE',
        tableName: table,
        recordId: id,
        details: 'Registro apagado',
      });
    } catch(err) { console.warn('Erro ao salvar audit log:', err.message); }

    res.json({ deleted: true, id: result.rows[0].id });
  } catch (err) {
    console.error(`[CRUD] DELETE /${table}/${id} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
