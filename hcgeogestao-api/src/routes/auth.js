const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_2026';
const TOKEN_EXPIRY = '1h';

// ─── Sign Up (Admin Protected) ──────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token de administração obrigatório' });
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if the requester is an admin
    const requester = await pool.query(`
      SELECT r.name as role 
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `, [decoded.sub]);

    if (requester.rows.length === 0 || requester.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem criar novos usuários' });
    }

    const { email, password, role_name = 'user' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM auth_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);

    const roleResult = await pool.query('SELECT id FROM sys_roles WHERE name = $1', [role_name]);
    let roleId = null;
    if (roleResult.rows.length > 0) {
      roleId = roleResult.rows[0].id;
    }

    await pool.query(
      'INSERT INTO auth_users (id, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
      [id, email, passwordHash, roleId]
    );

    res.status(201).json({
      success: true,
      user: { id, email, role: role_name }
    });

  } catch (err) {
    console.error('[AUTH] Signup error:', err.message);
    res.status(500).json({ error: 'Falha ao criar usuário. O token pode estar expirado.' });
  }
});

// ─── Sign In ────────────────────────────────────────────────────────
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = `
      SELECT u.id, u.email, u.password_hash, r.name as role 
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id 
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      session: {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
      },
    });
  } catch (err) {
    console.error('[AUTH] Signin error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ─── Get current user (session check) ───────────────────────────────
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, email, created_at FROM auth_users WHERE id = $1', [decoded.sub]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// ─── Refresh token ──────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });

    const query = `
      SELECT u.id, u.email, r.name as role 
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id 
      WHERE u.id = $1
    `;
    const result = await pool.query(query, [decoded.sub]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const newToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

    res.json({
      user: { id: user.id, email: user.email, role: user.role },
      session: {
        access_token: newToken,
        token_type: 'bearer',
        expires_in: 3600,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Could not refresh token' });
  }
});

// ─── Verify Financeiro Vault Password ────────────────────────────────
router.post('/verify-financeiro', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const result = await pool.query("SELECT value FROM sys_settings WHERE key = 'financeiro_password'");
    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Configuração do cofre ausente no banco' });
    }

    const valid = await bcrypt.compare(password, result.rows[0].value);
    if (!valid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[AUTH] Financeiro Verify error:', err.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// ─── Admin User Management ───────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const result = await pool.query(`
      SELECT u.id, u.email, r.name as role 
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id
      ORDER BY u.email ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role_name } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const targetId = req.params.id;
    const roleResult = await pool.query('SELECT id FROM sys_roles WHERE name = $1', [role_name]);
    if (roleResult.rows.length === 0) return res.status(400).json({ error: 'Invalid role' });
    
    await pool.query('UPDATE auth_users SET role_id = $1 WHERE id = $2', [roleResult.rows[0].id, targetId]);
    res.json({ success: true, role: role_name });
  } catch (err) {
    res.status(500).json({ error: 'Error updating user role' });
  }
});

router.get('/audit', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const result = await pool.query(`
      SELECT l.id, l.action, l.table_name, l.record_id, l.details, l.ip_address, l.created_at, u.email as user_email
      FROM sys_audit_logs l
      LEFT JOIN auth_users u ON l.user_id = u.id
      ORDER BY l.created_at DESC LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

module.exports = router;
