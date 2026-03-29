const express  = require('express');
const router   = express.Router();
const { Analysis } = require('../models');

// GET /api/history?limit=20&crop=tomato
router.get('/', async (req, res) => {
  try {
    const { limit = 20, crop, page = 1 } = req.query;
    const filter = {};
    if (crop) filter.crop = new RegExp(crop, 'i');

    const total = await Analysis.countDocuments(filter);
    const items = await Analysis.find(filter)
      .sort({ created_at: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    return res.json({ success: true, total, page: parseInt(page), items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:id
router.delete('/:id', async (req, res) => {
  try {
    await Analysis.findByIdAndDelete(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
