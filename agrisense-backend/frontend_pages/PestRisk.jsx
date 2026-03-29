// ============================================================
// src/pages/PestRisk.jsx — Drop-in replacement (fixes "Could not fetch pest risk")
// ============================================================

import { useState, useEffect } from 'react';
import { fetchPestRisk, getUserLocation } from '../services/api';

const CROPS = [
  { name: 'Tomato',  emoji: '🍅', value: 'tomato'  },
  { name: 'Potato',  emoji: '🥔', value: 'potato'  },
  { name: 'Mango',   emoji: '🥭', value: 'mango'   },
  { name: 'Onion',   emoji: '🧅', value: 'onion'   },
  { name: 'Wheat',   emoji: '🌾', value: 'wheat'   },
  { name: 'Rice',    emoji: '🌾', value: 'rice'    },
];

const RISK_STYLE = {
  HIGH:   { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '🔴' },
  MEDIUM: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', icon: '🟡' },
  LOW:    { bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '🟢' },
};

export default function PestRisk({ language = 'en' }) {
  const [selectedCrop, setSelectedCrop] = useState('tomato');
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [location,     setLocation]     = useState(null);
  const [locationMsg,  setLocationMsg]  = useState('');

  // Get location on mount
  useEffect(() => {
    (async () => {
      try {
        setLocationMsg('📍 Getting location...');
        const loc = await getUserLocation();
        setLocation(loc);
        setLocationMsg('📍 Location acquired');
      } catch {
        setLocationMsg('📍 Using default location (India)');
      }
    })();
  }, []);

  // Auto-fetch when crop or location changes
  useEffect(() => {
    fetchRisk();
  }, [selectedCrop, location]);

  const fetchRisk = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchPestRisk({
        crop: selectedCrop,
        lat:  location?.lat,
        lon:  location?.lon,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Could not fetch pest risk.');
    } finally {
      setLoading(false);
    }
  };

  const style  = result ? (RISK_STYLE[result.risk_level] || RISK_STYLE.LOW) : RISK_STYLE.LOW;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>🐛 Pest Risk</h1>

      {locationMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                      padding: '8px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
          {locationMsg}
        </div>
      )}

      {/* Crop selector */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                    padding: 20, marginBottom: 16 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 10 }}>
          Select Crop
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CROPS.map(crop => (
            <button key={crop.value}
              onClick={() => setSelectedCrop(crop.value)}
              style={{ padding: '8px 16px', borderRadius: 20, border: '2px solid',
                       borderColor: selectedCrop === crop.value ? '#16a34a' : '#e5e7eb',
                       background: selectedCrop === crop.value ? '#16a34a' : '#fff',
                       color: selectedCrop === crop.value ? '#fff' : '#374151',
                       cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {crop.emoji} {crop.name}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {loading && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                      padding: 40, textAlign: 'center', color: '#6b7280' }}>
          ⏳ Fetching pest risk data...
        </div>
      )}

      {error && !loading && (
        <div style={{ background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca',
                      padding: 20, color: '#dc2626', textAlign: 'center' }}>
          ❌ {error}
          <br />
          <button onClick={fetchRisk} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 6,
                                               border: '1px solid #dc2626', background: '#fff',
                                               color: '#dc2626', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

      {result && !loading && (
        <div>
          {/* Risk level card */}
          <div style={{ background: style.bg, border: `2px solid ${style.border}`, borderRadius: 12,
                        padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 36 }}>{style.icon}</div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Risk Level for {result.crop}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: style.text }}>{result.risk_level} RISK</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>Score: {result.risk_score}/100</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                <div>📍 {result.city}</div>
                <div>🌡️ {result.temperature}°C</div>
                <div>💧 {result.humidity}%</div>
              </div>
            </div>

            {/* Risk bar */}
            <div style={{ background: '#e5e7eb', borderRadius: 99, height: 12, marginBottom: 12 }}>
              <div style={{ width: `${result.risk_score}%`, height: '100%', borderRadius: 99,
                            background: result.risk_score >= 70 ? '#ef4444'
                              : result.risk_score >= 40 ? '#f59e0b' : '#22c55e',
                            transition: 'width 0.6s ease' }} />
            </div>

            {/* Advice */}
            {result.advice?.map((tip, i) => (
              <div key={i} style={{ fontSize: 13, color: '#374151', padding: '6px 0',
                                    borderTop: i > 0 ? '1px solid #e5e7eb' : 'none' }}>
                💡 {tip}
              </div>
            ))}
          </div>

          {/* Individual pests */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#374151', marginBottom: 16 }}>
              🔍 Pest-by-Pest Analysis
            </h3>
            {result.pests?.map((pest, i) => {
              const pStyle = pest.probability >= 70 ? RISK_STYLE.HIGH
                : pest.probability >= 40 ? RISK_STYLE.MEDIUM : RISK_STYLE.LOW;
              return (
                <div key={i} style={{ marginBottom: 16, padding: 14, background: '#f9fafb',
                                      borderRadius: 10, borderLeft: `4px solid ${pStyle.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{pest.name}</span>
                    <span style={{ fontSize: 13, color: pStyle.text, fontWeight: 700 }}>
                      {pest.probability}%
                    </span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 99, height: 8, marginBottom: 8 }}>
                    <div style={{ width: `${pest.probability}%`, height: '100%', borderRadius: 99,
                                  background: pStyle.text }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{pest.description}</div>
                  <div style={{ fontSize: 11, color: pStyle.text, marginTop: 4,
                                textTransform: 'uppercase', fontWeight: 600 }}>
                    {pest.severity} severity
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
