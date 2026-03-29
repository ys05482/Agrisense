// ============================================================
// AgriSense Frontend API Service
// Place this file at: src/services/api.js
// ============================================================

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ── Helper ────────────────────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err.message);
    throw err;
  }
}

// ══════════════════════════════════════════════════════════════════════
// WEATHER
// ══════════════════════════════════════════════════════════════════════
export const fetchWeather = async ({ lat, lon, city } = {}) => {
  const params = new URLSearchParams();
  if (lat && lon) { params.append('lat', lat); params.append('lon', lon); }
  else if (city)    params.append('city', city);
  return apiFetch(`/weather?${params.toString()}`);
};

// ══════════════════════════════════════════════════════════════════════
// CROP ANALYSIS
// ══════════════════════════════════════════════════════════════════════
export const analyzeCrop = async ({ imageFile, imageBase64, storageType, lat, lon, temperature, humidity, city }) => {
  const url = `${BASE_URL}/analyze`;

  if (imageFile) {
    // Multipart upload
    const form = new FormData();
    form.append('image', imageFile);
    if (storageType)  form.append('storage_type', storageType);
    if (lat)          form.append('lat', lat);
    if (lon)          form.append('lon', lon);
    if (temperature)  form.append('temperature', temperature);
    if (humidity)     form.append('humidity', humidity);
    if (city)         form.append('city', city);

    const res = await fetch(url, { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } else {
    // Base64 JSON
    return apiFetch('/analyze', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, storage_type: storageType,
                             lat, lon, temperature, humidity, city }),
    });
  }
};

// ══════════════════════════════════════════════════════════════════════
// SIMULATOR
// ══════════════════════════════════════════════════════════════════════
export const simulate = async ({ crop, freshness, temperature, humidity, storageType }) => {
  return apiFetch('/simulate', {
    method: 'POST',
    body: JSON.stringify({
      crop,
      freshness:    parseFloat(freshness)    || 0.80,
      temperature:  parseFloat(temperature)  || 25,
      humidity:     parseFloat(humidity)     || 60,
      storage_type: storageType || 'room_temp',
    }),
  });
};

// ══════════════════════════════════════════════════════════════════════
// MARKET PRICES
// ══════════════════════════════════════════════════════════════════════
export const fetchPrices = async ({ crop, city }) => {
  const params = new URLSearchParams({ crop: crop || 'tomato', city: city || 'Delhi' });
  return apiFetch(`/prices?${params.toString()}`);
};

// ══════════════════════════════════════════════════════════════════════
// PEST RISK
// ══════════════════════════════════════════════════════════════════════
export const fetchPestRisk = async ({ crop, lat, lon, city }) => {
  const params = new URLSearchParams({ crop: crop || 'tomato' });
  if (lat && lon) { params.append('lat', lat); params.append('lon', lon); }
  if (city)         params.append('city', city);
  return apiFetch(`/pest?${params.toString()}`);
};

// ══════════════════════════════════════════════════════════════════════
// TRANSLATION
// ══════════════════════════════════════════════════════════════════════
export const translateTexts = async (texts, targetLanguage = 'hi') => {
  return apiFetch('/translate', {
    method: 'POST',
    body: JSON.stringify({ texts, target_language: targetLanguage }),
  });
};

// ══════════════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════════════
export const fetchHistory = async ({ limit = 20, crop, page = 1 } = {}) => {
  const params = new URLSearchParams({ limit, page });
  if (crop) params.append('crop', crop);
  return apiFetch(`/history?${params.toString()}`);
};

export const deleteHistory = async (id) => {
  return apiFetch(`/history/${id}`, { method: 'DELETE' });
};

// ══════════════════════════════════════════════════════════════════════
// GEOLOCATION HELPER (browser)
// ══════════════════════════════════════════════════════════════════════
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
};

export default {
  fetchWeather, analyzeCrop, simulate,
  fetchPrices, fetchPestRisk, translateTexts,
  fetchHistory, deleteHistory, getUserLocation,
};
