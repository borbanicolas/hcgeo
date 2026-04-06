const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Todas as rotas de busca requerem autenticação
router.use(authMiddleware);
router.get('/places', async (req, res) => {
  const { q } = req.query;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ 
      error: "Google API Key não configurada no servidor.",
      setup_required: true 
    });
  }

  if (!q) return res.status(400).json({ error: "O termo de busca (q) é obrigatório." });

  try {
    // 1. Busca de texto usando a NOVA Places API
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.websiteUri'
      },
      body: JSON.stringify({ 
        textQuery: q,
        languageCode: 'pt-BR'
      })
    });

    const searchData = await searchRes.json();

    if (searchRes.status !== 200) {
      throw new Error(`Erro Google API (${searchRes.status}): ${JSON.stringify(searchData)}`);
    }

    // 2. Formatar resultados (Padrão da Nova API)
    const results = (searchData.places || []).map(place => ({
      place_id: place.id,
      name: place.displayName?.text || 'Sem nome',
      address: place.formattedAddress,
      rating: place.rating,
      phone: place.nationalPhoneNumber || null, 
      website: place.websiteUri || null, 
    }));

    res.json(results);
  } catch (err) {
    console.error('[SEARCH_ERROR]', err);
    res.status(500).json({ error: "Erro ao consultar Google Places" });
  }
});

// Detalhes extras de um local (para pegar telefone/site com precisão)
router.get('/details/:place_id', async (req, res) => {
  const { place_id } = req.params;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) return res.status(400).json({ error: "API Key ausente" });

  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,formatted_phone_number,website,formatted_address&key=${apiKey}&language=pt-BR`;
    const detailRes = await fetch(detailsUrl);
    const detailData = await detailRes.json();

    if (detailData.status !== 'OK') throw new Error(`Google Details Error: ${detailData.status}`);

    res.json(detailData.result);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
});

module.exports = router;
