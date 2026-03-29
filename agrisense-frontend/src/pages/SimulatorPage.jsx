import React, { useState } from "react";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { runSimulation } from "../services/api";

const ALL_CROPS = [
  "Tomato","Potato","Mango","Onion","Apple","Banana","Carrot","Cucumber",
  "Capsicum","Spinach","Cauliflower","Cabbage","Peas","Corn","Garlic","Ginger",
  "Lemon","Grapes","Watermelon","Pineapple","Kiwi","Pear","Pomegranate",
  "Strawberry","Okra","Eggplant","Beetroot","Radish","Lettuce","Soybean",
  "Chillipepper","Paprika","Ginger","Jalapeno","Sweetpotato","Sweetcorn",
  "Turnip","Bellpepper","Bittergourd","Orange",
].filter((v, i, a) => a.indexOf(v) === i).sort();

const FRESHNESS_OPTIONS = [
  { value: 0.95, label: "Very Fresh (95%)" },
  { value: 0.80, label: "Fresh (80%)"      },
  { value: 0.60, label: "Moderate (60%)"   },
  { value: 0.40, label: "Aging (40%)"      },
  { value: 0.20, label: "Near Spoilage (20%)" },
];

const STORAGE = [
  { value: "room",       icon: "🏠", labelKey: "room"       },
  { value: "cold",       icon: "❄️", labelKey: "cold"       },
  { value: "freezer",    icon: "🧊", labelKey: "freezer"    },
  { value: "controlled", icon: "🏭", labelKey: "controlled" },
];

const FRESH_BAR  = { Fresh:"bg-green-400", Moderate:"bg-yellow-400", Spoiled:"bg-red-400" };
const FRESH_CARD = { Fresh:"border-green-200 bg-green-50", Moderate:"border-yellow-200 bg-yellow-50", Spoiled:"border-red-200 bg-red-50" };

const SPOILAGE_COLORS = {
  "0-1 days":"#ef4444","1-2 days":"#f97316",
  "2-4 days":"#eab308","4-7 days":"#22c55e","7+ days":"#16a34a",
};

const STORAGE_DISPLAY = { room:"Room Temp", cold:"Cold Storage", freezer:"Freezer", controlled:"Controlled Atm" };

export default function SimulatorPage() {
  const { t } = useLang();
  const { prediction, predictionId, setSimulation, weather } = useApp();

  const [form, setForm] = useState({
    temperature: weather?.temperature || 25,
    humidity:    weather?.humidity    || 60,
    storageType: "room",
    cropType:    prediction?.cropType || "Tomato",
    freshness:   0.80,
  });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const simulate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await runSimulation({ ...form, predictionId });
      setResult(res.data);
      setSimulation(res.data);
    } catch (err) {
      setError(err.message || "Simulation failed. Make sure backend is running on port 3001.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🔬 {t("simulator")}</h1>

      {prediction && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          📌 Using your last analysis: <strong>{prediction.cropType}</strong> — {prediction.freshness}
        </div>
      )}

      {weather && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          📍 Auto-filled from {weather.city}: {weather.temperature}°C, {weather.humidity}% humidity
        </div>
      )}

      <div className="card space-y-6">
        {/* Crop selector */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("cropType")}</label>
            <select value={form.cropType} onChange={(e) => set("cropType", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary">
              {ALL_CROPS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t("freshness")}</label>
            <select value={form.freshness} onChange={(e) => set("freshness", parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary">
              {FRESHNESS_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Temperature */}
        <SliderField label={`🌡️ ${t("temperature")}`} value={form.temperature}
          min={-20} max={50} unit="°C" onChange={(v) => set("temperature", v)} />

        {/* Humidity */}
        <SliderField label={`💧 ${t("humidity")}`} value={form.humidity}
          min={0} max={100} unit="%" onChange={(v) => set("humidity", v)} />

        {/* Storage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">📦 {t("storageType")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORAGE.map((s) => (
              <button key={s.value} onClick={() => set("storageType", s.value)}
                className={`py-3 px-2 rounded-xl border-2 text-center transition
                  ${form.storageType === s.value
                    ? "border-primary bg-green-50 text-primary"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"}`}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-medium">{t(s.labelKey)}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg p-3">{error}</p>}

        <button onClick={simulate} disabled={loading}
          className="btn-primary w-full py-3 text-base font-semibold">
          {loading ? `⏳ ${t("simulating")}` : `🚀 ${t("simulate")}`}
        </button>
      </div>

      {/* ── Results ─────────────────────────────────────────────────── */}
      {result && (
        <div className={`card border-2 ${FRESH_CARD[result.freshness] ?? FRESH_CARD.Moderate} space-y-5`}>
          <h2 className="text-xl font-bold text-gray-800">📊 {t("updatedSpoilage")}</h2>

          {/* Main estimate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-800">{result.spoilageDays}</div>
              <div className="text-sm text-gray-500 mt-1">{t("days")} remaining</div>
              {result.predicted_spoilage && (
                <div className="text-sm font-semibold mt-2"
                  style={{ color: SPOILAGE_COLORS[result.predicted_spoilage] }}>
                  {result.predicted_spoilage}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-gray-800 mb-2">{result.freshness}</div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${FRESH_BAR[result.freshness] ?? "bg-gray-400"} rounded-full`}
                  style={{ width: `${Math.min((result.spoilageDays / 14) * 100, 100)}%` }} />
              </div>
              {result.confidence && (
                <div className="text-xs text-gray-400 mt-2">{t("confidence")}: {result.confidence}%</div>
              )}
            </div>
          </div>

          {/* Storage comparison */}
          {result.storage_comparison && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">📦 {t("storageComparison")}</h3>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(result.storage_comparison).map(([st, info]) => {
                  const storageLabel = { room_temp:"🏠 Room", refrigerator:"❄️ Fridge", freezer:"🧊 Freezer" };
                  return (
                    <div key={st} className="text-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-sm font-medium text-gray-600 mb-1">{storageLabel[st] || st}</div>
                      <div className="text-lg font-bold" style={{ color: SPOILAGE_COLORS[info.label] || "#374151" }}>
                        {info.label}
                      </div>
                      <div className="text-xs text-gray-400">~{info.days} {t("days")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Probability bars */}
          {result.probabilities && Object.keys(result.probabilities).length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">📈 {t("spoilageProb")}</h3>
              {Object.entries(result.probabilities)
                .sort((a, b) => b[1] - a[1])
                .map(([label, pct]) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className={label === result.predicted_spoilage ? "font-bold" : "text-gray-500"}>{label}</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: SPOILAGE_COLORS[label] || "#6b7280" }} />
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
                    <span className="text-primary font-bold shrink-0">✓</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SliderField({ label, value, min, max, unit, onChange }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-primary font-bold text-sm bg-green-50 px-2 py-0.5 rounded">
          {value}{unit}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-gray-200" />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}
