import React, { useState } from "react";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { runSimulation } from "../services/api";

const CROPS = ["Tomato", "Potato", "Mango", "Onion", "Wheat", "Rice"];
const FRESHNESS = ["Fresh", "Moderate", "Spoiled"];
const STORAGE = [
  { value: "room", icon: "🏠", labelKey: "room" },
  { value: "cold", icon: "❄️", labelKey: "cold" },
  { value: "freezer", icon: "🧊", labelKey: "freezer" },
  { value: "controlled", icon: "🏭", labelKey: "controlled" },
];
const FRESH_BAR = {
  Fresh: "bg-green-400",
  Moderate: "bg-yellow-400",
  Spoiled: "bg-red-400",
};
const FRESH_CARD = {
  Fresh: "border-green-200 bg-green-50",
  Moderate: "border-yellow-200 bg-yellow-50",
  Spoiled: "border-red-200 bg-red-50",
};

export default function SimulatorPage() {
  const { t } = useLang();
  const { prediction, predictionId, setSimulation } = useApp();

  const [form, setForm] = useState({
    temperature: 25,
    humidity: 60,
    storageType: "room",
    cropType: prediction?.cropType || "Tomato",
    freshness: prediction?.freshness || "Fresh",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const simulate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await runSimulation({ ...form, predictionId });
      setResult(res.data);
      setSimulation(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || "Simulation failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🔬 {t("simulator")}</h1>

      {prediction && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
          📌 Using your last analysis: <strong>{prediction.cropType}</strong> —{" "}
          {prediction.freshness}
        </div>
      )}

      <div className="card space-y-6">
        {/* Crop & Freshness — only shown when no prediction loaded */}
        {!prediction && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("cropType")}
              </label>
              <select
                value={form.cropType}
                onChange={(e) => set("cropType", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CROPS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("freshness")}
              </label>
              <select
                value={form.freshness}
                onChange={(e) => set("freshness", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {FRESHNESS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Temperature Slider */}
        <SliderField
          label={`🌡️ ${t("temperature")}`}
          value={form.temperature}
          min={0}
          max={50}
          unit="°C"
          onChange={(v) => set("temperature", v)}
        />

        {/* Humidity Slider */}
        <SliderField
          label={`💧 ${t("humidity")}`}
          value={form.humidity}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set("humidity", v)}
        />

        {/* Storage Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            📦 {t("storageType")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORAGE.map((s) => (
              <button
                key={s.value}
                onClick={() => set("storageType", s.value)}
                className={`py-3 px-2 rounded-xl border-2 text-center transition
                  ${
                    form.storageType === s.value
                      ? "border-primary bg-green-50 text-primary"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-medium">{t(s.labelKey)}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          onClick={simulate}
          disabled={loading}
          className="btn-primary w-full py-3 text-base font-semibold"
        >
          {loading ? `⏳ ${t("simulating")}` : `🚀 ${t("simulate")}`}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div
          className={`card border-2 ${FRESH_CARD[result.freshness] ?? FRESH_CARD.Moderate} space-y-4`}
        >
          <h2 className="text-xl font-bold text-gray-800">
            📊 {t("updatedSpoilage")}
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-5 text-center shadow-sm">
              <div className="text-5xl font-bold text-gray-800">
                {result.spoilageDays}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {t("days")} remaining
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 text-center shadow-sm">
              <div className="text-3xl font-bold text-gray-800 mb-2">
                {result.freshness}
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${FRESH_BAR[result.freshness] ?? "bg-gray-400"} rounded-full`}
                  style={{
                    width: `${Math.min((result.spoilageDays / 14) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {result.recommendations?.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-3">
                💡 {t("recommendations")}
              </h3>
              <ul className="space-y-2">
                {result.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <span className="text-primary font-bold shrink-0">✓</span>{" "}
                    {r}
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
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-primary font-bold text-sm bg-green-50 px-2 py-0.5 rounded">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-gray-200"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}
