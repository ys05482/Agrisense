const express = require("express");
const axios = require("axios");
const router = express.Router();
const { PriceLog } = require("../models");

const RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070";

// Fallback base prices (₹ per kg) — used only when API fails
const BASE_PRICES = {
  tomato: 25,
  potato: 18,
  onion: 22,
  banana: 35,
  apple: 120,
  mango: 80,
  orange: 55,
  carrot: 30,
  cucumber: 20,
  capsicum: 60,
  spinach: 25,
  cauliflower: 35,
  cabbage: 20,
  peas: 45,
  corn: 15,
  garlic: 150,
  ginger: 90,
  lemon: 70,
  grapes: 80,
  watermelon: 18,
  pineapple: 45,
  kiwi: 120,
  pear: 65,
  pomegranate: 100,
  strawberry: 180,
  okra: 40,
  eggplant: 30,
  beetroot: 25,
  radish: 20,
  turnip: 22,
  soybean: 55,
  lettuce: 40,
  celery: 50,
  bellpepper: 70,
  chillipepper: 55,
  paprika: 60,
};

// ---------- helpers ----------

// data.gov.in returns prices in ₹ per quintal → convert to ₹ per kg
function quintalToKg(price) {
  return Math.round(parseFloat(price) / 100);
}

// Simulated 14-day forecast (API only has current-day data)
function get14DayForecast(basePrice) {
  const labels = [];
  const prices = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    labels.push(
      d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    );
    // ±12% random fluctuation around base
    const noise = basePrice * (0.88 + Math.random() * 0.24);
    prices.push(Math.round(noise));
  }
  return { labels, prices };
}

// Fallback when API is down
function getFallbackResponse(crop, city) {
  const cropKey = crop.toLowerCase();
  const basePrice = BASE_PRICES[cropKey] || 40;
  const forecast = get14DayForecast(basePrice);
  const bestIdx = forecast.prices.indexOf(Math.max(...forecast.prices));
  const worstIdx = forecast.prices.indexOf(Math.min(...forecast.prices));

  return {
    crop: crop.charAt(0).toUpperCase() + crop.slice(1),
    current_price: basePrice,
    min_price: Math.round(basePrice * 0.85),
    max_price: Math.round(basePrice * 1.15),
    unit: "per kg (₹)",
    market: `${city} Mandi`,
    city,
    source: "fallback",
    records: [],
    forecast,
    best_sell_day: {
      day: forecast.labels[bestIdx],
      price: forecast.prices[bestIdx],
    },
    worst_sell_day: {
      day: forecast.labels[worstIdx],
      price: forecast.prices[worstIdx],
    },
    available_crops: Object.keys(BASE_PRICES),
  };
}

// ---------- routes ----------

// GET /api/prices?crop=tomato&city=Delhi
router.get("/", async (req, res) => {
  try {
    const { crop = "tomato", city = "Delhi" } = req.query;
    const apiKey = process.env.MANDI_API_KEY;

    if (!apiKey) {
      console.warn("MANDI_API_KEY not set, using fallback prices");
      return res.json(getFallbackResponse(crop, city));
    }

    // Fetch live data from data.gov.in
    const params = {
      "api-key": apiKey,
      format: "json",
      limit: 50,
    };

    // Add filters only if values are provided
    if (crop)
      params["filters[commodity]"] =
        crop.charAt(0).toUpperCase() + crop.slice(1).toLowerCase();
    if (city)
      params["filters[district]"] =
        city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();

    const response = await axios.get(
      `https://api.data.gov.in/resource/${RESOURCE_ID}`,
      { params, timeout: 8000 },
    );

    const records = response.data.records || [];

    // If no records found with district filter, try without it
    if (records.length === 0 && city) {
      delete params["filters[district]"];
      const retryResponse = await axios.get(
        `https://api.data.gov.in/resource/${RESOURCE_ID}`,
        { params, timeout: 8000 },
      );
      records.push(...(retryResponse.data.records || []));
    }

    // If still no records, use fallback
    if (records.length === 0) {
      return res.json(getFallbackResponse(crop, city));
    }

    // Parse prices from records (API gives ₹ per quintal)
    const parsedRecords = records.map((r) => ({
      state: r.state,
      district: r.district,
      market: r.market,
      commodity: r.commodity,
      variety: r.variety,
      arrival_date: r.arrival_date,
      min_price: quintalToKg(r.min_price),
      max_price: quintalToKg(r.max_price),
      modal_price: quintalToKg(r.modal_price),
    }));

    // Use modal_price of first record as current price
    const currentPrice = parsedRecords[0].modal_price;
    const marketName = `${parsedRecords[0].market}, ${parsedRecords[0].district}`;

    // Calculate average modal price across all returned markets
    const avgPrice = Math.round(
      parsedRecords.reduce((sum, r) => sum + r.modal_price, 0) /
        parsedRecords.length,
    );

    const allMin = Math.min(...parsedRecords.map((r) => r.min_price));
    const allMax = Math.max(...parsedRecords.map((r) => r.max_price));

    const forecast = get14DayForecast(avgPrice);
    const bestIdx = forecast.prices.indexOf(Math.max(...forecast.prices));
    const worstIdx = forecast.prices.indexOf(Math.min(...forecast.prices));

    // Save to DB (ignore errors)
    await PriceLog.create({
      crop,
      price: currentPrice,
      market: marketName,
      city,
    }).catch(() => {});

    return res.json({
      crop: parsedRecords[0].commodity,
      current_price: currentPrice,
      avg_price: avgPrice,
      min_price: allMin,
      max_price: allMax,
      unit: "per kg (₹)",
      market: marketName,
      city,
      source: "data.gov.in",
      total_records: parsedRecords.length,
      records: parsedRecords,
      forecast,
      best_sell_day: {
        day: forecast.labels[bestIdx],
        price: forecast.prices[bestIdx],
      },
      worst_sell_day: {
        day: forecast.labels[worstIdx],
        price: forecast.prices[worstIdx],
      },
      available_crops: Object.keys(BASE_PRICES),
    });
  } catch (err) {
    console.error("Prices error:", err.message);

    // On API failure, return fallback instead of crashing
    const { crop = "tomato", city = "Delhi" } = req.query;
    return res.json({
      ...getFallbackResponse(crop, city),
      warning: "Live API unavailable, showing estimated prices",
    });
  }
});

// GET /api/prices/markets?commodity=Tomato — all markets for a commodity
router.get("/markets", async (req, res) => {
  try {
    const { commodity = "Tomato", state } = req.query;
    const apiKey = process.env.MANDI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "MANDI_API_KEY not configured" });
    }

    const params = {
      "api-key": apiKey,
      format: "json",
      limit: 100,
      "filters[commodity]": commodity,
    };

    if (state) params["filters[state.keyword]"] = state;

    const response = await axios.get(
      `https://api.data.gov.in/resource/${RESOURCE_ID}`,
      { params, timeout: 8000 },
    );

    const records = (response.data.records || []).map((r) => ({
      state: r.state,
      district: r.district,
      market: r.market,
      commodity: r.commodity,
      variety: r.variety,
      arrival_date: r.arrival_date,
      min_price: quintalToKg(r.min_price),
      max_price: quintalToKg(r.max_price),
      modal_price: quintalToKg(r.modal_price),
    }));

    res.json({ commodity, total: records.length, records });
  } catch (err) {
    console.error("Markets error:", err.message);
    res.status(500).json({ error: "Failed to fetch market data" });
  }
});

module.exports = router;
