const express = require('express');
const router  = express.Router();
const axios   = require('axios');

// ─────────────────────────────────────────────────────────────────────
// Leave GOOGLE_TRANSLATE_API_KEY in .env file
// Get key from: https://console.cloud.google.com/apis/library/translate.googleapis.com
// ─────────────────────────────────────────────────────────────────────

// Static translations for common AgriSense UI strings
// (Fallback when API key not set)
const STATIC_TRANSLATIONS = {
  hi: {
    'Analyze Crop':         'फसल विश्लेषण करें',
    'Freshness':            'ताजगी',
    'Spoilage':             'खराब होना',
    'Temperature':          'तापमान',
    'Humidity':             'नमी',
    'Storage Type':         'भंडारण प्रकार',
    'Room Temp':            'कमरे का तापमान',
    'Cold Storage':         'कोल्ड स्टोरेज',
    'Freezer':              'फ्रीजर',
    'Simulator':            'सिम्युलेटर',
    'Market Map':           'बाजार नक्शा',
    'Market Prices':        'बाजार भाव',
    'Pest Risk':            'कीट जोखिम',
    'Upload Image':         'छवि अपलोड करें',
    'Capture Photo':        'फोटो लें',
    'Days remaining':       'बचे हुए दिन',
    'Sell Today':           'आज बेचें',
    'High Risk':            'उच्च जोखिम',
    'Medium Risk':          'मध्यम जोखिम',
    'Low Risk':             'कम जोखिम',
    'Smart Crop Intelligence for Indian Farmers': 'भारतीय किसानों के लिए स्मार्ट फसल बुद्धिमत्ता',
  },
  mr: {
    'Analyze Crop':         'पिकाचे विश्लेषण करा',
    'Freshness':            'ताजेपणा',
    'Spoilage':             'खराब होणे',
    'Temperature':          'तापमान',
    'Humidity':             'आर्द्रता',
    'Storage Type':         'साठवणूक प्रकार',
    'Room Temp':            'खोलीचे तापमान',
    'Cold Storage':         'शीत साठवण',
    'Freezer':              'फ्रीजर',
    'Simulator':            'सिम्युलेटर',
    'Market Map':           'बाजार नकाशा',
    'Market Prices':        'बाजार भाव',
    'Pest Risk':            'कीड धोका',
    'Upload Image':         'प्रतिमा अपलोड करा',
    'Capture Photo':        'फोटो घ्या',
    'Days remaining':       'उर्वरित दिवस',
    'Sell Today':           'आज विका',
    'High Risk':            'उच्च धोका',
    'Medium Risk':          'मध्यम धोका',
    'Low Risk':             'कमी धोका',
    'Smart Crop Intelligence for Indian Farmers': 'भारतीय शेतकऱ्यांसाठी स्मार्ट पिक बुद्धिमत्ता',
  }
};

// POST /api/translate
router.post('/', async (req, res) => {
  try {
    const { texts, target_language = 'hi' } = req.body;
    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

    // ── If Google API key is set, use real translation ──────────────
    if (apiKey && apiKey !== 'YOUR_GOOGLE_TRANSLATE_API_KEY_HERE') {
      const translations = await Promise.all(
        texts.map(async (text) => {
          try {
            const resp = await axios.post(
              `https://translation.googleapis.com/language/translate/v2`,
              { q: text, target: target_language, source: 'en', format: 'text' },
              { params: { key: apiKey }, timeout: 5000 }
            );
            return resp.data.data.translations[0].translatedText;
          } catch {
            return STATIC_TRANSLATIONS[target_language]?.[text] || text;
          }
        })
      );
      return res.json({ translations, target_language, source: 'google' });
    }

    // ── Fallback: static dictionary ────────────────────────────────
    const dict = STATIC_TRANSLATIONS[target_language] || {};
    const translations = texts.map(t => dict[t] || t);
    return res.json({ translations, target_language, source: 'static' });

  } catch (err) {
    console.error('Translate error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/translate/languages
router.get('/languages', (req, res) => {
  res.json({
    supported: [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'हिंदी (Hindi)' },
      { code: 'mr', name: 'मराठी (Marathi)' },
    ]
  });
});

module.exports = router;
