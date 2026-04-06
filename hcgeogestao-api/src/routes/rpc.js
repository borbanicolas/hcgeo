const express = require('express');
const pool = require('../db/pool');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// ─── generate_proposta_number ───────────────────────────────────────
router.post('/generate_proposta_number', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(
        MAX(CAST(numero AS INTEGER)), 0
      ) + 1 AS next_number
      FROM propostas WHERE user_id = $1`,
      [req.userId]
    );
    const nextNumber = String(result.rows[0].next_number).padStart(4, '0');
    res.json({ number: nextNumber });
  } catch (err) {
    console.error('[RPC] generate_proposta_number error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── generate_os_number ─────────────────────────────────────────────
router.post('/generate_os_number', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(
        MAX(CAST(numero AS INTEGER)), 0
      ) + 1 AS next_number
      FROM ordens_servico WHERE user_id = $1`,
      [req.userId]
    );
    const nextNumber = String(result.rows[0].next_number).padStart(4, '0');
    res.json({ number: nextNumber });
  } catch (err) {
    console.error('[RPC] generate_os_number error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── generate_relatorio_number ──────────────────────────────────────
router.post('/generate_relatorio_number', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COALESCE(
        MAX(CAST(numero AS INTEGER)), 0
      ) + 1 AS next_number
      FROM relatorios WHERE user_id = $1`,
      [req.userId]
    );
    const nextNumber = String(result.rows[0].next_number).padStart(4, '0');
    res.json({ number: nextNumber });
  } catch (err) {
    console.error('[RPC] generate_relatorio_number error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
