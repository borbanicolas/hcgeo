const express = require('express');
const router = express.Router();
require('dotenv').config();

const CNAE_API_URL = 'https://api.listacnae.com.br/v1';
const API_TOKEN = process.env.CNAE_API_TOKEN;

router.get('/cnae/search', async (req, res) => {
  try {
    const { term, state, city, cnae } = req.query;
    if (!API_TOKEN) return res.status(500).json({ error: 'CNAE_API_TOKEN não habilitado' });

    let url = `${CNAE_API_URL}/buscar?quantidade=30&inicio=0`;
    
    // ListaCNAE espera JSON listas stringificadas e encodadas
    if (term) {
      const tb = [{ termo: term, tipo: 'A' }];
      url += `&termos_de_busca=${encodeURIComponent(JSON.stringify(tb))}`;
    }
    
    if (cnae) {
      const c = [parseInt(cnae.toString().replace(/\D/g, ""))];
      url += `&cnaes=${encodeURIComponent(JSON.stringify(c))}`;
    }

    if (state) url += `&estados=${encodeURIComponent(JSON.stringify([state.toUpperCase()]))}`;
    if (city) url += `&municipios=${encodeURIComponent(JSON.stringify([parseInt(city)]))}`;

    console.log('[DEBUG] Calling ListaCNAE:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('[ERROR] ListaCNAE 400 Detail:', JSON.stringify(errData, null, 2));
      return res.status(response.status).json({ error: 'Erro API ListaCNAE', details: errData });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor proxy', details: error.message });
  }
});

module.exports = router;
