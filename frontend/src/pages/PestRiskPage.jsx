import React, { useState, useEffect } from "react";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { getPestRisk } from "../services/api";

const CROPS = [
  "crop_tomato",
  "crop_potato",
  "crop_mango",
  "crop_onion",
  "crop_wheat",
  "crop_rice",
];
const EMOJIS = {
  crop_tomato: "🍅",
  crop_potato: "🥔",
  crop_mango: "🥭",
  crop_onion: "🧅",
  crop_wheat: "🌾",
  crop_rice: "🍚",
};

const RISK_CFG = {
  High: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-800",
    icon: "🚨",
  },
  Medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-700",
    bar: "bg-yellow-500",
    badge: "bg-yellow-100 text-yellow-800",
    icon: "⚠️",
  },
  Low: {
    bg: "bg-green-50",
    border: "border-green-300",
    text: "text-green-700",
    bar: "bg-green-500",
    badge: "bg-green-100 text-green-800",
    icon: "✅",
  },
};

const REC_ICONS = ["🚨", "⚠️", "✅", "💊", "🔍", "🌿", "🧪", "📋"];

export default function PestRiskPage() {
  const { t } = useLang();
  const { userLocation } = useApp();

  const [crop, setCrop] = useState("Tomato");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setData(null);
    getPestRisk(crop, userLocation.lat, userLocation.lon)
      .then((res) => setData(res.data))
      .catch(() => setError("Could not fetch pest risk. Please try again."))
      .finally(() => setLoading(false));
  }, [crop, userLocation]);

  const cfg = data ? (RISK_CFG[data.riskLevel] ?? RISK_CFG.Low) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🐛 {t("pestRisk")}</h1>

      {/* Crop Selector */}
      <div className="card">
        <p className="text-sm font-medium text-gray-600 mb-3">
          {t("selectCrop")}
        </p>
        <div className="flex flex-wrap gap-2">
          {CROPS.map((c) => (
            <button
              key={c}
              onClick={() => setCrop(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition
                ${
                  crop === c
                    ? "bg-primary text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {EMOJIS[c]} {t(c)}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-5xl mb-3 animate-pulse">🔍</div>
          <p>
            Analyzing pest risk for <strong>{crop}</strong>…
          </p>
        </div>
      )}

      {error && (
        <div className="card text-center text-red-600 py-8">{error}</div>
      )}

      {data && cfg && (
        <>
          {/* Main Risk Card */}
          <div className={`card border-2 ${cfg.border} ${cfg.bg} space-y-5`}>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-xl font-bold text-gray-800">
                {EMOJIS[data.cropType]} {data.cropType} — Pest Risk Assessment
              </h2>
              <span
                className={`text-lg font-bold px-4 py-1.5 rounded-full ${cfg.badge}`}
              >
                {cfg.icon} {data.riskLevel} Risk
              </span>
            </div>

            {/* Probability Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-gray-600">
                  {t("pestProbability")}
                </span>
                <span className={`font-bold text-lg ${cfg.text}`}>
                  {(data.probability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${cfg.bar} rounded-full transition-all duration-700 flex items-center justify-end pr-2`}
                  style={{ width: `${data.probability * 100}%` }}
                >
                  {data.probability > 0.15 && (
                    <span className="text-white text-xs font-bold">
                      {(data.probability * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Low Risk</span>
                <span>High Risk</span>
              </div>
            </div>

            {/* Pest Types */}
            {data.pestTypes?.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-700 mb-3">
                  🔬 {t("pestTypes")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.pestTypes.map((p) => (
                    <span
                      key={p}
                      className="bg-orange-100 text-orange-700 text-sm px-3 py-1.5 rounded-full font-medium"
                    >
                      🪲 {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Weather Conditions */}
          {data.weather && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">
                🌤️ Weather Conditions — {data.weather.location}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  {
                    icon: "🌡️",
                    value: `${data.weather.temperature}°C`,
                    label: "Temperature",
                    color: "bg-orange-50 text-orange-600",
                  },
                  {
                    icon: "💧",
                    value: `${data.weather.humidity}%`,
                    label: "Humidity",
                    color: "bg-blue-50   text-blue-600",
                  },
                  {
                    icon: "💨",
                    value: `${data.weather.windSpeed} m/s`,
                    label: "Wind Speed",
                    color: "bg-gray-50   text-gray-600",
                  },
                ].map((w) => (
                  <div key={w.label} className={`${w.color} rounded-xl p-4`}>
                    <div className="text-2xl mb-1">{w.icon}</div>
                    <div className={`text-2xl font-bold`}>{w.value}</div>
                    <div className="text-xs mt-1 opacity-70">{w.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center">
                High humidity (&gt;75%) and temperature (&gt;28°C) significantly
                increase pest risk.
              </p>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">
                💡 {t("recommendations")}
              </h3>
              <ul className="space-y-3">
                {data.recommendations.map((r, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-xl
                      ${
                        data.riskLevel === "High"
                          ? "bg-red-50"
                          : data.riskLevel === "Medium"
                            ? "bg-yellow-50"
                            : "bg-green-50"
                      }`}
                  >
                    <span className="text-xl shrink-0">
                      {REC_ICONS[i % REC_ICONS.length]}
                    </span>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {r}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
