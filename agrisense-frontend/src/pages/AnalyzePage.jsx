import React, { useState, useRef, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { uploadImage } from "../services/api";

const FRESH_CFG = {
  Fresh:    { cls: "badge-fresh",    bg: "bg-green-50",  border: "border-green-300",  icon: "✅" },
  Moderate: { cls: "badge-moderate", bg: "bg-yellow-50", border: "border-yellow-300", icon: "⚠️" },
  Spoiled:  { cls: "badge-spoiled",  bg: "bg-red-50",    border: "border-red-300",    icon: "❌" },
};

const STORAGE_OPTIONS = [
  { value: "room_temp",     icon: "🏠", labelKey: "room" },
  { value: "cold_storage",  icon: "❄️", labelKey: "cold" },
  { value: "freezer",       icon: "🧊", labelKey: "freezer" },
  { value: "controlled_atm",icon: "🏭", labelKey: "controlled" },
];

const SPOILAGE_COLORS = {
  "0-1 days": "#ef4444", "1-2 days": "#f97316",
  "2-4 days": "#eab308", "4-7 days": "#22c55e", "7+ days": "#16a34a",
};

export default function AnalyzePage() {
  const { t } = useLang();
  const { setPrediction, setPredictionId, userLocation, weather } = useApp();

  const [file,        setFile]        = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [dragging,    setDragging]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [result,      setResult]      = useState(null);
  const [error,       setError]       = useState("");
  const [storageType, setStorageType] = useState("room_temp");

  const fileRef   = useRef();
  const cameraRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError("");
    setPreview(URL.createObjectURL(f));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f?.type.startsWith("image/")) handleFile(f);
  }, []);

  const analyze = async () => {
    if (!file) { setError(t("noImage")); return; }
    setLoading(true);
    setError("");
    try {
      const res = await uploadImage(
        file,
        userLocation.lat,
        userLocation.lon,
        storageType,
        weather || {}
      );
      setResult(res.data);
      setPrediction(res.data);
      setPredictionId(res.predictionId);
    } catch (err) {
      setError(err.message || "Analysis failed. Make sure the ML service is running on port 5001.");
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? (FRESH_CFG[result.freshness] ?? FRESH_CFG.Moderate) : null;
  const spoilageColor = result ? (SPOILAGE_COLORS[result.predicted_spoilage] || "#6b7280") : "#6b7280";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📷 {t("analyze")}</h1>

      {/* Upload Card */}
      <div className="card space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragging ? "border-primary bg-green-50" : "border-gray-300 hover:border-primary hover:bg-green-50"}`}
        >
          {preview ? (
            <img src={preview} alt="Preview"
              className="max-h-64 mx-auto rounded-lg object-contain shadow" />
          ) : (
            <div className="space-y-2 text-gray-400">
              <div className="text-6xl">📁</div>
              <p className="font-medium text-gray-600 text-lg">{t("dropImage")}</p>
              <p className="text-xs">{t("fileLimit")}</p>
            </div>
          )}
        </div>

        {/* Hidden Inputs */}
        <input ref={fileRef}   type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFile(e.target.files[0])} />

        {/* Upload / Capture buttons */}
        <div className="flex gap-3">
          <button onClick={() => fileRef.current.click()}
            className="btn-primary flex-1 flex items-center justify-center gap-2">
            📁 {t("uploadImage")}
          </button>
          <button onClick={() => cameraRef.current.click()}
            className="flex-1 flex items-center justify-center gap-2
                       bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg
                       font-medium transition-colors">
            📸 {t("capturePhoto")}
          </button>
        </div>

        {/* Storage type selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📦 {t("storageType")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORAGE_OPTIONS.map((s) => (
              <button key={s.value} onClick={() => setStorageType(s.value)}
                className={`py-3 px-2 rounded-xl border-2 text-center transition
                  ${storageType === s.value
                    ? "border-primary bg-green-50 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-medium">{t(s.labelKey)}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg p-3">{error}</p>}

        <button onClick={analyze} disabled={!file || loading}
          className="btn-primary w-full py-3 text-base font-semibold">
          {loading ? `⏳ ${t("analyzing")}` : `🔍 ${t("analyze_btn")}`}
        </button>
      </div>

      {/* ── Results Dashboard ───────────────────────────────────────── */}
      {result && cfg && (
        <div className={`card border-2 ${cfg.border} ${cfg.bg} space-y-5`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-gray-800">📊 AI Results Dashboard</h2>
            <span className={cfg.cls}>{cfg.icon} {result.freshness}</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t("cropType"),    value: result.cropType,                             icon: "🌱" },
              { label: t("confidence"),  value: `${(result.confidenceScore * 100).toFixed(1)}%`, icon: "🎯" },
              { label: t("spoilageDays"),value: `${result.spoilageDays} ${t("days")}`,       icon: "📅" },
              { label: t("humidity"),    value: `${result.weather?.humidity ?? weather?.humidity ?? "--"}%`, icon: "💧" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 text-center shadow-sm">
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="font-bold text-xl text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Freshness bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>{t("freshness")}</span>
              <span className="font-semibold">{result.freshness_percent?.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700
                ${result.freshness === "Fresh" ? "bg-green-400"
                  : result.freshness === "Moderate" ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${Math.min(result.freshness_percent, 100)}%` }} />
            </div>
          </div>

          {/* Spoilage estimate cards */}
          {result.predicted_spoilage && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border-l-4"
                style={{ borderColor: spoilageColor }}>
                <div className="text-xs text-gray-500 mb-1">⚠️ {t("spoilageDays")} ({t(STORAGE_OPTIONS.find(s => s.value === storageType)?.labelKey || "room")})</div>
                <div className="text-2xl font-bold" style={{ color: spoilageColor }}>
                  {result.predicted_spoilage}
                </div>
                <div className="text-xs text-gray-400 mt-1">{t("confidence")}: {result.spoilage_confidence}%</div>
              </div>
              {result.refrigerated_estimate && (
                <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">
                  <div className="text-xs text-gray-500 mb-1">✅ {t("refrigerated")}</div>
                  <div className="text-2xl font-bold text-green-600">{result.refrigerated_estimate}</div>
                  <div className="text-xs text-gray-400 mt-1">{t("cold")}</div>
                </div>
              )}
            </div>
          )}

          {/* Spoilage probability bars */}
          {result.spoilage_probabilities && Object.keys(result.spoilage_probabilities).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">📊 {t("spoilageProb")}</h3>
              {Object.entries(result.spoilage_probabilities)
                .sort((a, b) => b[1] - a[1])
                .map(([label, pct]) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span className={label === result.predicted_spoilage ? "font-bold" : ""}>{label}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: SPOILAGE_COLORS[label] || "#6b7280" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Spoilage timeline bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Spoilage Timeline</span>
              <span className="font-semibold">{result.spoilageDays} {t("days")} remaining</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700
                ${result.freshness === "Fresh" ? "bg-green-400"
                  : result.freshness === "Moderate" ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${Math.min((result.spoilageDays / 14) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Now</span><span>14 {t("days")}</span>
            </div>
          </div>

          {/* CNN top predictions */}
          {result.cnn_top_predictions?.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">🤖 CNN Top Predictions</h3>
              {result.cnn_top_predictions.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm mb-2">
                  <span className={i === 0 ? "font-semibold" : "text-gray-500"}>{p.label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full"
                        style={{ width: `${p.confidence}%` }} />
                    </div>
                    <span className="text-gray-500 w-10 text-right">{p.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">💡 {t("recommendations")}</h3>
              <ul className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-primary font-bold mt-0.5 shrink-0">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weather context */}
          {(result.weather || weather) && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-2">
                🌤️ Conditions at {result.weather?.location || weather?.city}
              </h3>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <span>🌡️ {result.weather?.temperature || weather?.temperature}°C</span>
                <span>💧 {result.weather?.humidity || weather?.humidity}%</span>
                <span className="capitalize">☁️ {result.weather?.description || weather?.description}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
