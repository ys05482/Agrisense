// src/services/api.js
// All calls go through Vite proxy → http://localhost:3001/api

const BASE = "/api";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

// ── ANALYZE — POST multipart image ───────────────────────────────────
export async function uploadImage(file, lat, lon, storageType = "room_temp", weather = {}) {
  const form = new FormData();
  form.append("image", file);
  if (lat)          form.append("lat",          lat);
  if (lon)          form.append("lon",          lon);
  if (storageType)  form.append("storage_type", storageType);
  if (weather.temperature) form.append("temperature", weather.temperature);
  if (weather.humidity)    form.append("humidity",    weather.humidity);
  if (weather.city)        form.append("city",        weather.city);

  const res = await fetch(`${BASE}/analyze`, { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

  // Normalise response to match what AnalyzePage expects
  return {
    data: normaliseAnalysis(json),
    predictionId: json.id,
  };
}

// Map backend response → frontend shape
function normaliseAnalysis(d) {
  const freshPct = d.freshness_percent ?? (d.freshness_score * 100);
  const freshness =
    freshPct >= 65 ? "Fresh" :
    freshPct >= 35 ? "Moderate" : "Spoiled";

  return {
    cropType:         d.crop || "Unknown",
    freshness,
    freshness_percent: freshPct,
    confidenceScore:  (d.cnn_confidence ?? 75) / 100,
    spoilageDays:     Math.round(d.days_estimate ?? 3),
    predicted_spoilage: d.predicted_spoilage,
    refrigerated_estimate: d.refrigerated_estimate,
    spoilage_probabilities: d.spoilage_probabilities || {},
    spoilage_confidence: d.spoilage_confidence,
    cnn_top_predictions: d.cnn_top_predictions || [],
    pestDetected:     false,
    pestType:         null,
    pestProbability:  0,
    diseaseDetected:  false,
    diseaseType:      null,
    recommendations:  buildRecommendations(d),
    weather: d.temperature ? {
      location:    d.city || "Unknown",
      temperature: d.temperature,
      humidity:    d.humidity,
      windSpeed:   "—",
      description: "",
    } : null,
    image_url: d.image_url,
    storage_type: d.storage_type,
  };
}

function buildRecommendations(d) {
  const recs = [];
  const days = Math.round(d.days_estimate ?? 3);
  const crop = d.crop?.toLowerCase() || "crop";

  if (days <= 1) {
    recs.push(`⚡ Sell or consume your ${crop} immediately — it will spoil within 24 hours.`);
    recs.push("🧊 If possible, refrigerate immediately to extend shelf life.");
  } else if (days <= 3) {
    recs.push(`⚠️ Your ${crop} has ${days} days remaining. Plan to sell or use soon.`);
    recs.push("❄️ Cold storage can extend shelf life by 2–3x.");
  } else {
    recs.push(`✅ ${crop} is in good condition with ~${days} days remaining.`);
    recs.push("📦 Store in a cool, dry place away from direct sunlight.");
  }

  if ((d.humidity ?? 70) > 80) recs.push("💧 High humidity detected — ensure good ventilation during storage.");
  if ((d.temperature ?? 28) > 33) recs.push("🌡️ High temperature — consider cold storage to slow spoilage.");
  recs.push("📊 Use the Simulator to test different storage conditions.");
  return recs;
}

// ── SIMULATE ─────────────────────────────────────────────────────────
export async function runSimulation({ cropType, freshness, temperature, humidity, storageType, predictionId }) {
  const freshnessMap = { Fresh: 0.85, Moderate: 0.55, Spoiled: 0.20 };
  const freshnessScore = typeof freshness === "number" ? freshness : (freshnessMap[freshness] ?? 0.75);

  const storageMap = { room: "room_temp", cold: "cold_storage", freezer: "freezer", controlled: "controlled_atm" };
  const storageKey = storageMap[storageType] || storageType || "room_temp";

  const json = await req("/simulate", {
    method: "POST",
    body: JSON.stringify({
      crop:         cropType?.toLowerCase() || "tomato",
      freshness:    freshnessScore,
      temperature:  temperature ?? 25,
      humidity:     humidity ?? 60,
      storage_type: storageKey,
    }),
  });

  // Normalise to SimulatorPage shape
  const days = Math.round(json.days_estimate ?? 3);
  const freshPct = freshnessScore * 100;
  const freshnessLabel = freshPct >= 65 ? "Fresh" : freshPct >= 35 ? "Moderate" : "Spoiled";

  return {
    data: {
      spoilageDays:      days,
      freshness:         freshnessLabel,
      predicted_spoilage:json.predicted_spoilage,
      confidence:        json.confidence,
      storage_comparison:json.storage_comparison,
      probabilities:     json.probabilities,
      recommendations:   buildSimRecommendations(json),
    }
  };
}

function buildSimRecommendations(d) {
  const recs = [];
  const days = Math.round(d.days_estimate ?? 3);
  const comp = d.storage_comparison || {};

  if (comp.refrigerator?.days > days * 1.5)
    recs.push(`❄️ Refrigeration can extend shelf life to ~${comp.refrigerator.days} days.`);
  if (comp.freezer?.days > days * 3)
    recs.push(`🧊 Freezing can preserve for up to ~${comp.freezer.days} days.`);
  if (days <= 2) recs.push("🚨 Sell or consume immediately — spoilage is imminent.");
  else if (days <= 5) recs.push("⚠️ Plan your sale within the next few days for best price.");
  else recs.push("✅ Crop is in good condition. Monitor storage conditions daily.");
  return recs;
}

// ── PEST RISK ─────────────────────────────────────────────────────────
export async function getPestRisk(cropType, lat, lon) {
  const params = new URLSearchParams({ crop: cropType.toLowerCase() });
  if (lat) params.append("lat", lat);
  if (lon) params.append("lon", lon);

  const json = await req(`/pest?${params}`);

  // Normalise to PestRiskPage shape
  return {
    data: {
      cropType:      json.crop,
      riskLevel:     capitalise(json.risk_level),  // HIGH → High
      probability:   (json.risk_score ?? 50) / 100,
      pestTypes:     json.pests?.map(p => p.name) || [],
      recommendations: json.advice || [],
      pests:         json.pests || [],
      weather: {
        location:    json.city || "Unknown",
        temperature: json.temperature,
        humidity:    json.humidity,
        windSpeed:   "—",
      },
    }
  };
}

// ── MARKET PRICES ─────────────────────────────────────────────────────
export async function getMarketPrices(crop, days = 14) {
  const json = await req(`/prices?crop=${crop.toLowerCase()}&city=Delhi`);

  return {
    data: {
      currentPrice:    json.current_price,
      unit:            "₹/kg",
      labels:          json.forecast?.labels || [],
      predictedPrices: json.forecast?.prices || [],
      bestSellDay:     json.best_sell_day?.day || "—",
      worstSellDay:    json.worst_sell_day?.day || "—",
    }
  };
}

// ── WEATHER ───────────────────────────────────────────────────────────
export async function getWeather(lat, lon) {
  return req(`/weather?lat=${lat}&lon=${lon}`);
}

// ── NEARBY LOCATIONS (stub — returns empty for now) ────────────────────
export async function getNearbyLocations(lat, lon) {
  return { data: { mandis: [], coldStorages: [] } };
}

// ── TRANSLATE ─────────────────────────────────────────────────────────
export async function translateTexts(texts, targetLanguage = "hi") {
  return req("/translate", {
    method: "POST",
    body: JSON.stringify({ texts, target_language: targetLanguage }),
  });
}

// ── HISTORY ───────────────────────────────────────────────────────────
export async function getHistory(limit = 20) {
  return req(`/history?limit=${limit}`);
}

// ── helpers ───────────────────────────────────────────────────────────
function capitalise(str = "") {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// legacy export kept for compatibility
export const getPrediction = (id) => req(`/history/${id}`);
