const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// POST /api/simulate
router.post('/', async (req, res) => {
  try {
    const { crop, freshness = 0.80, temperature = 25, humidity = 60, storage_type = 'room_temp' } = req.body;

    if (!crop) return res.status(400).json({ error: 'crop is required' });

    const mlResp = await axios.post(
      `${ML_SERVICE_URL}/predict/simulate`,
      { crop, freshness: parseFloat(freshness), temperature: parseFloat(temperature),
        humidity: parseFloat(humidity), storage_type },
      { timeout: 15000 }
    );

    return res.json({ success: true, ...mlResp.data });

  } catch (err) {
    console.error('Simulate error:', err.message);
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ML service unavailable' });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
