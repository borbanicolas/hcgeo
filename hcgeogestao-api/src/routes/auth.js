const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_2026';
const TOKEN_EXPIRY = '1h';

// ─── Public Register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
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

    // Default public role: 'user'
    const roleResult = await pool.query("SELECT id FROM sys_roles WHERE name = 'user'");
    const roleId = roleResult.rows[0]?.id || null;

    await pool.query(
      'INSERT INTO auth_users (id, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
      [id, email, passwordHash, roleId]
    );

    // Auditoria: Registro Público
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, 'REGISTER', 'auth_users', id, `Novo usuário registrado: ${email}`, ip]
      );
    } catch(e) {}

    // Auto-login after registration
    const token = jwt.sign({ sub: id, email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    
    res.status(201).json({
      success: true,
      session: { access_token: token },
      user: { id, email, role: 'user' }
    });

  } catch (err) {
    console.error('[AUTH] Register error:', err.message);
    res.status(500).json({ error: 'Falha ao processar registro' });
  }
});

// ─── Sign Up (Now Public) ──────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
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

    const roleResult = await pool.query("SELECT id FROM sys_roles WHERE name = $1", [role_name]);
    let roleId = null;
    if (roleResult.rows.length > 0) {
      roleId = roleResult.rows[0].id;
    }

    await pool.query(
      'INSERT INTO auth_users (id, email, password_hash, role_id) VALUES ($1, $2, $3, $4)',
      [id, email, passwordHash, roleId]
    );

    // Auditoria: Registro
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, 'SIGNUP', 'auth_users', id, `Novo usuário: ${email} (${role_name})`, ip]
      );
    } catch(e) {}

    res.status(201).json({
      success: true,
      user: { id, email, role: role_name }
    });

  } catch (err) {
    console.error('[AUTH] Signup error:', err.message);
    res.status(500).json({ error: 'Falha ao criar usuário.' });
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
      SELECT u.id, u.email, u.password_hash, u.failed_attempts, u.is_blocked, u.last_failed_ip, r.name as role 
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id 
      WHERE u.email = $1
    `;
    const result = await pool.query(query, [email]);
    if (result.rows.length === 0) {
      // Auditoria: Tentativa com e-mail inexistente
      try {
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
        await pool.query(
          'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [null, 'LOGIN_FAILURE', 'auth_users', null, `Tentativa com usuário inexistente: ${email}`, ip]
        );
      } catch(e) {}
      
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // 1. Verificar se já não está bloqueado
    if (user.is_blocked) {
      return res.status(403).json({ error: 'Conta bloqueada por excesso de tentativas. Contate o administrador.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';

    if (!valid) {
      const newAttempts = (user.failed_attempts || 0) + 1;
      const shouldBlock = newAttempts >= 5;

      // Atualizar contador, status de bloqueio E ÚLTIMO IP DE FALHA
      await pool.query(
        'UPDATE auth_users SET failed_attempts = $1, is_blocked = $2, last_failed_ip = $3 WHERE id = $4',
        [newAttempts, shouldBlock, ip, user.id]
      );

      // Auditoria: Falha de Login
      try {
        const details = shouldBlock 
          ? `Conta bloqueada após 5 erros: ${email}` 
          : `Falha de login ${newAttempts}/5 para: ${email}`;
          
        await pool.query(
          'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
          [user.id, 'LOGIN_FAILURE', 'auth_users', user.id, details, ip]
        );
      } catch(e) {}
      
      return res.status(401).json({ error: 'Auth failed' });
    }

    // 2. Login com Sucesso: Zerar contador de falhas
    await pool.query('UPDATE auth_users SET failed_attempts = 0 WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Auditoria: Login com Sucesso
    try {
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, 'LOGIN_SUCCESS', 'auth_users', user.id, `Usuário entrou no sistema: ${email}`, ip]
      );
    } catch(e) {}

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
    
    const adminCheck = await pool.query('SELECT u.email, r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const requesterEmail = adminCheck.rows[0].email?.toLowerCase().trim();
    const isSuperDev = requesterEmail === 'dev@nikoscience.tech';

    // Impedir qualquer cache no navegador ou proxy
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    // Se não for o SuperDev, o SQL vai retornar explicitamente NULL no campo last_failed_ip
    const result = await pool.query(`
      SELECT u.id, u.email, r.name as role, u.failed_attempts, u.is_blocked,
      (CASE WHEN $1 = true THEN u.last_failed_ip ELSE NULL END) as last_failed_ip
      FROM auth_users u 
      LEFT JOIN sys_roles r ON u.role_id = r.id
      WHERE u.email != 'dev@nikoscience.tech'
      ORDER BY u.email ASC
    `, [isSuperDev]);
    
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

    // Auditoria
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [decoded.sub, 'UPDATE', 'auth_users', targetId, `Alterou cargo para: ${role_name}`, ip]
      );
    } catch(e) {}

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
    
    const adminCheck = await pool.query('SELECT u.email, r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const requesterEmail = adminCheck.rows[0].email?.toLowerCase().trim();
    const isSuperDev = requesterEmail === 'dev@nikoscience.tech';

    const result = await pool.query(`
      SELECT l.id, l.action, l.table_name, l.record_id, l.details, 
      (CASE WHEN $1 = true THEN l.ip_address ELSE '[PROTEGIDO]' END) as ip_address,
      l.created_at, u.email as user_email
      FROM sys_audit_logs l
      LEFT JOIN auth_users u ON l.user_id = u.id
      ORDER BY l.created_at DESC LIMIT 100
    `, [isSuperDev]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching audit logs' });
  }
});

router.put('/users/:id/email', async (req, res) => {
  try {
    const { email } = req.body;
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const targetId = req.params.id;
    await pool.query('UPDATE auth_users SET email = $1 WHERE id = $2', [email, targetId]);

    // Auditoria
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [decoded.sub, 'UPDATE', 'auth_users', targetId, `Alterou e-mail para: ${email}`, ip]
      );
    } catch(e) {}

    res.json({ success: true, email });
  } catch (err) {
    res.status(500).json({ error: 'Error updating user email' });
  }
});

router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const targetId = req.params.id;
    const newPassword = 'HC-' + Math.random().toString(36).slice(-6).toUpperCase();
    const hash = await bcrypt.hash(newPassword, 12);
    
    await pool.query('UPDATE auth_users SET password_hash = $1 WHERE id = $2', [hash, targetId]);

    // Auditoria
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [decoded.sub, 'UPDATE', 'auth_users', targetId, 'Resetou senha do usuário', ip]
      );
    } catch(e) {}

    res.json({ success: true, newPassword });
  } catch (err) {
    res.status(500).json({ error: 'Error resetting password' });
  }
});

router.post('/users/:id/unblock', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    
    const adminCheck = await pool.query('SELECT r.name as role FROM auth_users u LEFT JOIN sys_roles r ON u.role_id = r.id WHERE u.id = $1', [decoded.sub]);
    if (adminCheck.rows.length === 0 || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const targetId = req.params.id;
    await pool.query('UPDATE auth_users SET failed_attempts = 0, is_blocked = false WHERE id = $1', [targetId]);

    // Auditoria
    try {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '0.0.0.0';
      await pool.query(
        'INSERT INTO sys_audit_logs (user_id, action, table_name, record_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
        [decoded.sub, 'UPDATE', 'auth_users', targetId, 'Desbloqueou conta do usuário', ip]
      );
    } catch(e) {}

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error unblocking user' });
  }
});

module.exports = router;
