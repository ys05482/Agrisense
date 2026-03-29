// ============================================================
// src/pages/Simulator.jsx — Drop-in replacement
// ============================================================

import { useState, useEffect } from 'react';
import { simulate, fetchWeather, getUserLocation } from '../services/api';

const ALL_CROPS = [
  'apple','banana','bellpepper','bittergourd','capsicum','carrot','cucumber',
  'mango','okra','orange','potato','strawberry','tomato','pear','grapes','kiwi',
  'watermelon','pomegranate','pineapple','onion','lemon','radish','beetroot',
  'cabbage','lettuce','spinach','soybean','cauliflower','chillipepper','turnip',
  'corn','sweetcorn','sweetpotato','paprika','jalapeno','ginger','garlic','peas','eggplant'
].sort();

const STORAGE_OPTIONS = [
  { value: 'room_temp',     label: '🏠 Room Temp',      color: '#f59e0b' },
  { value: 'cold_storage',  label: '❄️ Cold Storage',   color: '#06b6d4' },
  { value: 'freezer',       label: '🧊 Freezer',        color: '#6366f1' },
  { value: 'controlled_atm',label: '🏭 Controlled Atm', color: '#8b5cf6' },
];

const SPOILAGE_COLORS = {
  '0-1 days':'#ef4444','1-2 days':'#f97316',
  '2-4 days':'#eab308','4-7 days':'#22c55e','7+ days':'#16a34a'
};

export default function Simulator({ language = 'en' }) {
  const [crop,        setCrop]        = useState('tomato');
  const [freshness,   setFreshness]   = useState(0.80);
  const [temperature, setTemperature] = useState(25);
  const [humidity,    setHumidity]    = useState(60);
  const [storageType, setStorageType] = useState('room_temp');
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState('');
  const [weather,     setWeather]     = useState(null);

  // Auto-fill weather from location
  useEffect(() => {
    (async () => {
      try {
        const loc = await getUserLocation();
        const w   = await fetchWeather({ lat: loc.lat, lon: loc.lon });
        setWeather(w);
        setTemperature(Math.round(w.temperature));
        setHumidity(w.humidity);
      } catch {}
    })();
  }, []);

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await simulate({ crop, freshness, temperature, humidity, storageType });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const storageLabels = { room_temp: 'Room Temp', cold_storage: 'Cold Storage',
                          freezer: 'Freezer', controlled_atm: 'Controlled Atm' };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>🔬 Simulator</h1>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24, marginBottom: 20 }}>

        {/* Weather auto-fill notice */}
        {weather && (
          <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 14px',
                        fontSize: 13, color: '#1e40af', marginBottom: 20 }}>
            📍 Auto-filled from {weather.city}: {weather.temperature}°C, {weather.humidity}% humidity
          </div>
        )}

        {/* Crop + Freshness */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              🌿 Crop Type
            </label>
            <select value={crop} onChange={e => setCrop(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
                       border: '1px solid #d1d5db', fontSize: 14 }}>
              {ALL_CROPS.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              ✨ Freshness: {Math.round(freshness * 100)}%
            </label>
            <select value={freshness} onChange={e => setFreshness(parseFloat(e.target.value))}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8,
                       border: '1px solid #d1d5db', fontSize: 14 }}>
              <option value={0.95}>Very Fresh (95%)</option>
              <option value={0.80}>Fresh (80%)</option>
              <option value={0.60}>Moderate (60%)</option>
              <option value={0.40}>Aging (40%)</option>
              <option value={0.20}>Near Spoilage (20%)</option>
            </select>
          </div>
        </div>

        {/* Temperature slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>🌡️ Temperature (°C)</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{temperature}°C</span>
          </div>
          <input type="range" min={-20} max={50} value={temperature}
            onChange={e => setTemperature(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#ef4444' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
            <span>-20°C</span><span>50°C</span>
          </div>
        </div>

        {/* Humidity slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>💧 Humidity (%)</label>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>{humidity}%</span>
          </div>
          <input type="range" min={0} max={100} value={humidity}
            onChange={e => setHumidity(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#06b6d4' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
            <span>0%</span><span>100%</span>
          </div>
        </div>

        {/* Storage type */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            🏠 Storage Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {STORAGE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setStorageType(opt.value)}
                style={{ padding: '12px 8px', borderRadius: 8, border: '2px solid',
                         borderColor: storageType === opt.value ? opt.color : '#e5e7eb',
                         background: storageType === opt.value ? `${opt.color}15` : '#fff',
                         cursor: 'pointer', fontWeight: storageType === opt.value ? 700 : 400,
                         fontSize: 13, color: storageType === opt.value ? opt.color : '#374151' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSimulate} disabled={loading}
          style={{ width: '100%', padding: '14px 0', borderRadius: 8, border: 'none',
                   background: loading ? '#d1d5db' : '#16a34a', color: '#fff',
                   fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Simulating...' : '🚀 Simulate'}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2',
                        border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────────── */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
            📊 Results for {result.crop}
          </h2>

          {/* Main result */}
          <div style={{ textAlign: 'center', padding: '20px', background: '#f9fafb',
                        borderRadius: 10, marginBottom: 20,
                        borderLeft: `4px solid ${SPOILAGE_COLORS[result.predicted_spoilage] || '#6b7280'}` }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Predicted Spoilage ({storageLabels[storageType]})</div>
            <div style={{ fontSize: 32, fontWeight: 700,
                          color: SPOILAGE_COLORS[result.predicted_spoilage] || '#1f2937' }}>
              {result.predicted_spoilage}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Confidence: {result.confidence}%</div>
          </div>

          {/* Storage comparison */}
          {result.storage_comparison && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                📦 Storage Comparison
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {Object.entries(result.storage_comparison).map(([st, info]) => {
                  const opt = STORAGE_OPTIONS.find(o => o.value === st) || STORAGE_OPTIONS[0];
                  return (
                    <div key={st} style={{ background: st === storageType ? '#f0fdf4' : '#f9fafb',
                                           borderRadius: 10, padding: '12px 10px', textAlign: 'center',
                                           border: `2px solid ${st === storageType ? '#16a34a' : '#e5e7eb'}` }}>
                      <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.label.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                        {storageLabels[st]}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700,
                                    color: SPOILAGE_COLORS[info.label] || '#374151' }}>
                        {info.label}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>~{info.days} days</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bar chart of probabilities */}
          {result.probabilities && Object.keys(result.probabilities).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                📈 Probability Distribution
              </h3>
              {Object.entries(result.probabilities)
                .sort((a, b) => b[1] - a[1])
                .map(([label, pct]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: label === result.predicted_spoilage ? 700 : 400 }}>{label}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 99, height: 10 }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99,
                                  background: SPOILAGE_COLORS[label] || '#6b7280',
                                  transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
