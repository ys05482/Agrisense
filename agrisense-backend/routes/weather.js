const express = require('express');
const router  = express.Router();
const axios   = require('axios');

const OW_KEY = () => process.env.OPENWEATHER_API_KEY || '369bd575b3748445fdbda4984b12158b';
const OW_URL = 'http://api.openweathermap.org/data/2.5/weather';

// GET /api/weather?lat=&lon=   OR   ?city=
router.get('/', async (req, res) => {
  try {
    const { lat, lon, city } = req.query;

    const params = { appid: OW_KEY(), units: 'metric' };
    if (lat && lon) { params.lat = lat; params.lon = lon; }
    else if (city)  { params.q = city; }
    else return res.status(400).json({ error: 'Provide lat/lon or city' });

    const resp = await axios.get(OW_URL, { params, timeout: 8000 });
    const d    = resp.data;

    return res.json({
      city:        d.name,
      country:     d.sys?.country,
      temperature: Math.round(d.main.temp),
      feels_like:  Math.round(d.main.feels_like),
      humidity:    d.main.humidity,
      description: d.weather?.[0]?.description || '',
      icon:        d.weather?.[0]?.icon || '',
      wind_speed:  d.wind?.speed,
      lat:         d.coord?.lat,
      lon:         d.coord?.lon,
    });

  } catch (err) {
    console.error('Weather error:', err.message);
    if (err.response?.status === 401) return res.status(401).json({ error: 'Invalid OpenWeather API key' });
    if (err.response?.status === 404) return res.status(404).json({ error: 'City not found' });
    // Return fallback so frontend still works
    return res.json({
      city: 'Unknown', country: 'IN', temperature: 28,
      humidity: 70, description: 'clear sky', icon: '01d',
      wind_speed: 3, lat: 20.5, lon: 78.9
    });
  }
});

module.exports = router;
