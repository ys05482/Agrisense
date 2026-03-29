const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { PestLog } = require('../models');

// Pest knowledge base
const PEST_DATA = {
  tomato:  [
    { name: 'Tomato Leaf Curl Virus', temp_range: [25,35], humidity_range: [60,90], severity: 'high',   description: 'Spread by whiteflies in hot humid conditions' },
    { name: 'Early Blight',           temp_range: [24,29], humidity_range: [75,100],severity: 'medium', description: 'Fungal disease, worsens in wet weather' },
    { name: 'Fruit Borer',            temp_range: [28,38], humidity_range: [50,80], severity: 'high',   description: 'Larvae bore into fruit' },
  ],
  potato:  [
    { name: 'Late Blight',      temp_range: [10,20], humidity_range: [80,100], severity: 'high',   description: 'Notorious oomycete disease, cool wet weather' },
    { name: 'Aphids',           temp_range: [18,28], humidity_range: [50,75],  severity: 'medium', description: 'Sap-sucking insects, mild weather' },
    { name: 'Colorado Beetle',  temp_range: [21,30], humidity_range: [40,70],  severity: 'medium', description: 'Defoliator, warm dry conditions' },
  ],
  mango:   [
    { name: 'Mango Hopper',     temp_range: [25,35], humidity_range: [60,90],  severity: 'high',   description: 'Damages flowers and young shoots' },
    { name: 'Powdery Mildew',   temp_range: [22,28], humidity_range: [40,70],  severity: 'medium', description: 'Fungal, affects flowering stage' },
    { name: 'Fruit Fly',        temp_range: [28,38], humidity_range: [55,85],  severity: 'high',   description: 'Maggots destroy fruit from inside' },
  ],
  onion:   [
    { name: 'Thrips',           temp_range: [25,35], humidity_range: [30,60],  severity: 'high',   description: 'Tiny insects, hot dry conditions' },
    { name: 'Purple Blotch',    temp_range: [25,30], humidity_range: [75,100], severity: 'medium', description: 'Fungal, spreads in wet weather' },
    { name: 'Downy Mildew',     temp_range: [13,23], humidity_range: [80,100], severity: 'medium', description: 'Cool moist conditions' },
  ],
  wheat:   [
    { name: 'Rust (Yellow/Brown)',temp_range:[10,20],humidity_range:[80,100],  severity: 'high',   description: 'Fungal, spreads in cool wet weather' },
    { name: 'Aphids',             temp_range:[15,25],humidity_range:[50,75],   severity: 'medium', description: 'Reduces yield, virus vector' },
    { name: 'Armyworm',           temp_range:[20,30],humidity_range:[60,80],   severity: 'high',   description: 'Defoliator, warm humid nights' },
  ],
  rice:    [
    { name: 'Brown Planthopper', temp_range:[24,30],humidity_range:[80,100],  severity: 'high',   description: 'Major rice pest, wet season' },
    { name: 'Blast Disease',     temp_range:[20,28],humidity_range:[90,100],  severity: 'high',   description: 'Fungal, devastates rice crops' },
    { name: 'Stem Borer',        temp_range:[25,35],humidity_range:[70,90],   severity: 'medium', description: 'Larvae bore into stems' },
  ],
  default: [
    { name: 'Aphids',           temp_range:[18,30], humidity_range:[50,80],  severity: 'medium', description: 'Common sap-sucking pest' },
    { name: 'Whitefly',         temp_range:[24,35], humidity_range:[55,85],  severity: 'medium', description: 'Vector of viral diseases' },
    { name: 'Fungal Blight',    temp_range:[20,28], humidity_range:[80,100], severity: 'medium', description: 'Worsens in humid conditions' },
  ]
};

function calcRisk(pest, temperature, humidity) {
  const [tMin, tMax] = pest.temp_range;
  const [hMin, hMax] = pest.humidity_range;

  const tScore = (temperature >= tMin && temperature <= tMax) ? 1.0
    : (temperature < tMin ? Math.max(0, 1 - (tMin - temperature) / 10)
                          : Math.max(0, 1 - (temperature - tMax) / 10));

  const hScore = (humidity >= hMin && humidity <= hMax) ? 1.0
    : (humidity < hMin ? Math.max(0, 1 - (hMin - humidity) / 20)
                       : Math.max(0, 1 - (humidity - hMax) / 20));

  const severity_mult = { high: 1.0, medium: 0.75, low: 0.5 }[pest.severity] || 0.75;
  return Math.round(tScore * hScore * severity_mult * 100);
}

// GET /api/pest?crop=tomato&lat=28.6&lon=77.2
router.get('/', async (req, res) => {
  try {
    const { crop = 'tomato', lat, lon, city } = req.query;

    // Fetch weather
    let temperature = 28, humidity = 70, cityName = city || 'Unknown';
    if ((lat && lon) || city) {
      try {
        const params = { appid: process.env.OPENWEATHER_API_KEY || '369bd575b3748445fdbda4984b12158b', units: 'metric' };
        if (lat && lon) { params.lat = lat; params.lon = lon; }
        else             { params.q  = city; }

        const wResp = await axios.get('http://api.openweathermap.org/data/2.5/weather',
          { params, timeout: 6000 });
        temperature = wResp.data.main.temp;
        humidity    = wResp.data.main.humidity;
        cityName    = wResp.data.name;
      } catch (e) {
        console.warn('Weather fetch failed in pest route:', e.message);
      }
    }

    const cropKey  = crop.toLowerCase();
    const pestList = PEST_DATA[cropKey] || PEST_DATA.default;

    const risks = pestList.map(pest => ({
      name:        pest.name,
      probability: calcRisk(pest, temperature, humidity),
      severity:    pest.severity,
      description: pest.description,
    })).sort((a, b) => b.probability - a.probability);

    const maxRisk   = Math.max(...risks.map(r => r.probability));
    const risk_level = maxRisk >= 70 ? 'HIGH' : maxRisk >= 40 ? 'MEDIUM' : 'LOW';
    const risk_color = maxRisk >= 70 ? '#ef4444' : maxRisk >= 40 ? '#f59e0b' : '#22c55e';

    // Advice
    const advice = [];
    if (humidity > 80)  advice.push('High humidity detected — consider fungicide application');
    if (temperature > 32) advice.push('Hot weather — check for aphids and whiteflies');
    if (temperature < 15) advice.push('Cool weather — watch for rust diseases');
    if (advice.length === 0) advice.push('Conditions are relatively moderate. Regular monitoring recommended.');

    // Save to DB
    await PestLog.create({
      crop, risk_level, risk_score: maxRisk,
      temperature, humidity, city: cityName, pests: risks,
    }).catch(() => {});

    return res.json({
      crop: crop.charAt(0).toUpperCase() + crop.slice(1),
      city: cityName,
      temperature,
      humidity,
      risk_level,
      risk_score: maxRisk,
      risk_color,
      pests: risks,
      advice,
    });

  } catch (err) {
    console.error('Pest error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
