const express = require('express');
const router  = express.Router();
const { PriceLog } = require('../models');

// Realistic Indian mandi base prices (₹ per kg)
const BASE_PRICES = {
  tomato: 25, potato: 18, onion: 22, banana: 35, apple: 120,
  mango: 80, orange: 55, carrot: 30, cucumber: 20, capsicum: 60,
  spinach: 25, cauliflower: 35, cabbage: 20, peas: 45, corn: 15,
  garlic: 150, ginger: 90, lemon: 70, grapes: 80, watermelon: 18,
  pineapple: 45, kiwi: 120, pear: 65, pomegranate: 100,
  strawberry: 180, okra: 40, eggplant: 30, beetroot: 25,
  radish: 20, turnip: 22, soybean: 55, lettuce: 40, celery: 50,
  bellpepper: 70, chillipepper: 55, paprika: 60
};

const MARKETS = [
  'Azadpur Mandi, Delhi', 'APMC Vashi, Mumbai', 'Yeshwanthpur APMC, Bengaluru',
  'Koyambedu, Chennai', 'Gaddiannaram, Hyderabad', 'Gultekdi, Pune',
  'Haridwar Mandi', 'Dehradun Mandi'
];

function getPrice(crop, market) {
  const base = BASE_PRICES[crop.toLowerCase()] || 40;
  // Simulate daily fluctuation (±15%)
  const day  = new Date().getDate();
  const seed = (crop.charCodeAt(0) + day) % 10;
  const factor = 0.90 + (seed / 10) * 0.25;
  return Math.round(base * factor);
}

function get14DayForecast(crop) {
  const base   = BASE_PRICES[crop.toLowerCase()] || 40;
  const labels = [];
  const prices = [];
  const today  = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    labels.push(d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    const noise = base * (0.88 + Math.random() * 0.24);
    prices.push(Math.round(noise));
  }
  return { labels, prices };
}

// GET /api/prices?crop=tomato&city=Delhi
router.get('/', async (req, res) => {
  try {
    const { crop = 'tomato', city = 'Delhi' } = req.query;
    const cropKey = crop.toLowerCase();

    const market = MARKETS.find(m => m.toLowerCase().includes(city.toLowerCase()))
      || `${city} Mandi`;

    const current_price = getPrice(cropKey, market);
    const forecast      = get14DayForecast(cropKey);
    const best_day_idx  = forecast.prices.indexOf(Math.max(...forecast.prices));
    const worst_day_idx = forecast.prices.indexOf(Math.min(...forecast.prices));

    // Save to DB
    await PriceLog.create({
      crop: crop, price: current_price, market, city
    }).catch(() => {});

    return res.json({
      crop: crop.charAt(0).toUpperCase() + crop.slice(1),
      current_price,
      unit: 'per kg (₹)',
      market,
      city,
      forecast,
      best_sell_day:  { day: forecast.labels[best_day_idx],  price: forecast.prices[best_day_idx]  },
      worst_sell_day: { day: forecast.labels[worst_day_idx], price: forecast.prices[worst_day_idx] },
      available_crops: Object.keys(BASE_PRICES),
    });

  } catch (err) {
    console.error('Prices error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
