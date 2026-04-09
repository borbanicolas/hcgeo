require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const crudRoutes = require('./routes/crud');
const rpcRoutes = require('./routes/rpc');
const uploadRoutes = require('./routes/upload');
const searchRoutes = require('./routes/search');
const externalRoutes = require('./routes/external');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://hcgeo.nikoscience.tech',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health check ───────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/external', externalRoutes);
app.use('/api', crudRoutes);
app.use('/rpc', rpcRoutes);
app.use('/upload', uploadRoutes);

// ─── 404 handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ──────────────────────────────────────────────────────────

const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_roles (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);
    await pool.query(`
      INSERT INTO sys_roles (name) VALUES ('admin'), ('financeiro'), ('user')
      ON CONFLICT (name) DO NOTHING;
    `);
    await pool.query(`
      ALTER TABLE auth_users 
      ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES sys_roles(id);
    `);
    // 4. Create sys_settings for the global vault password
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    const bcrypt = require('bcryptjs');
    const vaultPassword = process.env.FINANCEIRO_VAULT_PASSWORD;
    if (vaultPassword) {
      const hash = await bcrypt.hash(vaultPassword, 12);
      await pool.query(`
        INSERT INTO sys_settings (key, value) VALUES ('financeiro_password', $1)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `, [hash]);
    } else {
      console.warn('⚠️ AVISO: A senha do cofre financeiro não foi detectada no arquivo .env (FINANCEIRO_VAULT_PASSWORD)');
    }

    // 5. Tabelas de Auditoria de Ações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sys_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth_users(id) ON DELETE SET NULL,
        action VARCHAR(20) NOT NULL,
        table_name VARCHAR(50) NOT NULL,
        record_id VARCHAR(100),
        details TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Apply schema update if the table already existed without IP
    try {
      await pool.query('ALTER TABLE sys_audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);');
    } catch (ignore) {}

    console.log('✅ Auto-migration: Roles tables and relations ensured');
  } catch (err) {
    console.error('Auto-migration error:', err.message);
  }
};
initDB();

app.listen(PORT, '0.0.0.0', () => {

  console.log(`🚀 HC GeoGestão API running on port ${PORT} v0.0.2`);
});
