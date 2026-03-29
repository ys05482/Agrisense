// ============================================================
// src/pages/Analyze.jsx  — Drop-in replacement for your current Analyze page
// Connects to Node.js backend at localhost:3001
// ============================================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { analyzeCrop, fetchWeather, getUserLocation } from '../services/api';

const STORAGE_OPTIONS = [
  { value: 'room_temp',    label: '🏠 Room Temp',     labelHi: 'कमरे का तापमान', labelMr: 'खोलीचे तापमान' },
  { value: 'cold_storage', label: '❄️ Cold Storage',  labelHi: 'कोल्ड स्टोरेज',  labelMr: 'शीत साठवण' },
  { value: 'freezer',      label: '🧊 Freezer',       labelHi: 'फ्रीजर',          labelMr: 'फ्रीजर' },
  { value: 'controlled_atm',label:'🏭 Controlled Atm',labelHi: 'नियंत्रित वातावरण',labelMr: 'नियंत्रित वातावरण' },
];

const SPOILAGE_COLORS = {
  '0-1 days': '#ef4444', '1-2 days': '#f97316',
  '2-4 days': '#eab308', '4-7 days': '#22c55e', '7+ days': '#16a34a'
};

export default function Analyze({ language = 'en' }) {
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [storageType,  setStorageType]  = useState('room_temp');
  const [loading,      setLoading]      = useState(false);
  const [result,       setResult]       = useState(null);
  const [error,        setError]        = useState('');
  const [weather,      setWeather]      = useState(null);
  const [location,     setLocation]     = useState(null);
  const [locationMsg,  setLocationMsg]  = useState('');
  const [cameraActive, setCameraActive] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);

  // ── Ask for location on mount ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setLocationMsg('📍 Getting your location for accurate predictions...');
        const loc = await getUserLocation();
        setLocation(loc);

        const w = await fetchWeather({ lat: loc.lat, lon: loc.lon });
        setWeather(w);
        setLocationMsg(`📍 ${w.city} — ${w.temperature}°C, ${w.humidity}% humidity`);
      } catch {
        setLocationMsg('📍 Location access denied — using default weather values');
      }
    })();
  }, []);

  // ── Image selection ────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setResult(null);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /image/.test(file.type)) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  // ── Camera ────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch { setError('Camera access denied'); }
  };

  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(URL.createObjectURL(blob));
      streamRef.current?.getTracks().forEach(t => t.stop());
      setCameraActive(false);
      setResult(null);
    }, 'image/jpeg', 0.92);
  };

  // ── Analyze ───────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!imageFile) { setError('Please upload or capture an image first'); return; }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await analyzeCrop({
        imageFile,
        storageType,
        lat:         location?.lat,
        lon:         location?.lon,
        temperature: weather?.temperature,
        humidity:    weather?.humidity,
        city:        weather?.city,
      });
      setResult(data);
    } catch (err) {
      setError(err.message || 'Analysis failed. Make sure the ML service is running.');
    } finally {
      setLoading(false);
    }
  };

  // ── Result card colour ────────────────────────────────────────────
  const spoilageColor = result ? (SPOILAGE_COLORS[result.predicted_spoilage] || '#6b7280') : '#6b7280';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>📷 Analyze Crop</h1>

      {/* Location bar */}
      {locationMsg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
                      padding: '8px 14px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
          {locationMsg}
        </div>
      )}

      {/* Upload / Camera */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
                    padding: 24, marginBottom: 16 }}>

        {/* Drop zone */}
        {!cameraActive && (
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed #d1d5db', borderRadius: 10, padding: 32,
                     textAlign: 'center', cursor: 'pointer', marginBottom: 16,
                     background: imagePreview ? '#f9fafb' : '#fff' }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview"
                style={{ maxHeight: 240, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📁</div>
                <p style={{ color: '#6b7280', margin: 0 }}>Drop image here or click to browse</p>
                <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0' }}>JPG, PNG, WebP · Max 10MB</p>
              </>
            )}
          </div>
        )}

        {/* Camera preview */}
        {cameraActive && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <video ref={videoRef} autoPlay playsInline
              style={{ width: '100%', maxHeight: 300, borderRadius: 10, background: '#000' }} />
          </div>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange}
          style={{ display: 'none' }} />

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={() => fileInputRef.current?.click()}
            style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none',
                     padding: '12px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            📁 Upload Image
          </button>
          {!cameraActive ? (
            <button onClick={startCamera}
              style={{ flex: 1, background: '#2563eb', color: '#fff', border: 'none',
                       padding: '12px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              📸 Capture Photo
            </button>
          ) : (
            <button onClick={capturePhoto}
              style={{ flex: 1, background: '#7c3aed', color: '#fff', border: 'none',
                       padding: '12px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              🟢 Take Photo
            </button>
          )}
        </div>

        {/* Storage type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            🏠 Storage Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {STORAGE_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setStorageType(opt.value)}
                style={{ padding: '10px 8px', borderRadius: 8, border: '2px solid',
                         borderColor: storageType === opt.value ? '#16a34a' : '#e5e7eb',
                         background: storageType === opt.value ? '#f0fdf4' : '#fff',
                         color: storageType === opt.value ? '#166534' : '#374151',
                         cursor: 'pointer', fontWeight: storageType === opt.value ? 700 : 400,
                         fontSize: 13, textAlign: 'center' }}>
                {language === 'hi' ? opt.labelHi : language === 'mr' ? opt.labelMr : opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Analyze button */}
        <button onClick={handleAnalyze} disabled={loading || !imageFile}
          style={{ width: '100%', padding: '14px 0', borderRadius: 8, border: 'none',
                   background: loading || !imageFile ? '#d1d5db' : '#16a34a',
                   color: '#fff', fontWeight: 700, fontSize: 16,
                   cursor: loading || !imageFile ? 'not-allowed' : 'pointer' }}>
          {loading ? '⏳ Analyzing...' : '🔍 Analyze Crop'}
        </button>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef2f2',
                        border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>
            ❌ {error}
          </div>
        )}
      </div>

      {/* ── Result Card ────────────────────────────────────────────── */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 12, border: `2px solid ${spoilageColor}`,
                      padding: 24, animation: 'fadeIn 0.3s ease' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ background: result.is_fresh ? '#f0fdf4' : '#fef2f2', borderRadius: 10,
                          padding: '10px 16px', fontSize: 22 }}>
              {result.is_fresh ? '✅' : '⚠️'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{result.crop}</h2>
              <p style={{ margin: 0, color: result.is_fresh ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {result.is_fresh ? '✅ Fresh' : '⚠️ Rotten'} · {result.freshness_percent}% freshness
              </p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>CNN Confidence</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.cnn_confidence}%</div>
            </div>
          </div>

          {/* Freshness bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13,
                          color: '#6b7280', marginBottom: 4 }}>
              <span>Freshness Score</span>
              <span>{result.freshness_percent}%</span>
            </div>
            <div style={{ background: '#e5e7eb', borderRadius: 99, height: 10 }}>
              <div style={{ width: `${result.freshness_percent}%`, height: '100%', borderRadius: 99,
                            background: result.freshness_percent > 60 ? '#22c55e'
                              : result.freshness_percent > 30 ? '#eab308' : '#ef4444',
                            transition: 'width 0.6s ease' }} />
            </div>
          </div>

          {/* Spoilage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#fef3f2', border: `1px solid ${spoilageColor}`, borderRadius: 10,
                          padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>⚠️ Estimated Spoilage</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: spoilageColor }}>
                {result.predicted_spoilage}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>({storageType.replace('_', ' ')})</div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10,
                          padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>✅ If Refrigerated</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
                {result.refrigerated_estimate}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>refrigerator</div>
            </div>
          </div>

          {/* Weather context */}
          {weather && (
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 14px',
                          fontSize: 13, color: '#1e40af', marginBottom: 16 }}>
              🌡️ {weather.city}: {weather.temperature}°C · 💧 {weather.humidity}% humidity · {weather.description}
            </div>
          )}

          {/* Probabilities */}
          {result.spoilage_probabilities && Object.keys(result.spoilage_probabilities).length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                📊 Spoilage Probability Distribution
              </div>
              {Object.entries(result.spoilage_probabilities)
                .sort((a, b) => b[1] - a[1])
                .map(([label, pct]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, color: '#6b7280', marginBottom: 3 }}>
                    <span>{label}</span><span>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 99, height: 7 }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99,
                                  background: SPOILAGE_COLORS[label] || '#6b7280' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Model confidence */}
          <div style={{ marginTop: 16, padding: '8px 12px', background: '#f9fafb',
                        borderRadius: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            XGBoost confidence: {result.spoilage_confidence}% · CNN: {result.cnn_confidence}%
          </div>
        </div>
      )}
    </div>
  );
}
