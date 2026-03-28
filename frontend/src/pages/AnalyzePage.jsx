import React, { useState, useRef, useCallback } from "react";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { uploadImage } from "../services/api";

const FRESH_CFG = {
  Fresh: {
    cls: "badge-fresh",
    bg: "bg-green-50",
    border: "border-green-300",
    icon: "✅",
  },
  Moderate: {
    cls: "badge-moderate",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    icon: "⚠️",
  },
  Spoiled: {
    cls: "badge-spoiled",
    bg: "bg-red-50",
    border: "border-red-300",
    icon: "❌",
  },
};

export default function AnalyzePage() {
  const { t } = useLang();
  const { setPrediction, setPredictionId, userLocation } = useApp();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fileRef = useRef();
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
    if (!file) {
      setError(t("noImage"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await uploadImage(file, userLocation.lat, userLocation.lon);
      setResult(res.data);
      setPrediction(res.data);
      setPredictionId(res.predictionId);
    } catch (err) {
      setError(
        err.response?.data?.message || "Analysis failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const cfg = result
    ? (FRESH_CFG[result.freshness] ?? FRESH_CFG.Moderate)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📷 {t("analyze")}</h1>

      {/* Upload Card */}
      <div className="card space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${
              dragging
                ? "border-primary bg-green-50"
                : "border-gray-300 hover:border-primary hover:bg-green-50"
            }`}
        >
          {preview ? (
            <img
              src={preview}
              alt="Preview"
              className="max-h-64 mx-auto rounded-lg object-contain shadow"
            />
          ) : (
            <div className="space-y-2 text-gray-400">
              <div className="text-6xl">📁</div>
              <p className="font-medium text-gray-600 text-lg">
                {t("dropImage")}
              </p>
              <p className="text-xs">{t("fileLimit")}</p>
            </div>
          )}
        </div>

        {/* Hidden Inputs */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current.click()}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            📁 {t("uploadImage")}
          </button>
          <button
            onClick={() => cameraRef.current.click()}
            className="flex-1 flex items-center justify-center gap-2
                       bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg
                       font-medium transition-colors"
          >
            📸 {t("capturePhoto")}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <button
          onClick={analyze}
          disabled={!file || loading}
          className="btn-primary w-full py-3 text-base font-semibold"
        >
          {loading ? `⏳ ${t("analyzing")}` : `🔍 ${t("analyze_btn")}`}
        </button>
      </div>

      {/* Results Dashboard */}
      {result && cfg && (
        <div className={`card border-2 ${cfg.border} ${cfg.bg} space-y-5`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold text-gray-800">
              📊 AI Results Dashboard
            </h2>
            <span className={cfg.cls}>
              {cfg.icon} {result.freshness}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: t("cropType"), value: result.cropType, icon: "🌱" },
              {
                label: t("confidence"),
                value: `${(result.confidenceScore * 100).toFixed(1)}%`,
                icon: "🎯",
              },
              {
                label: t("spoilageDays"),
                value: `${result.spoilageDays} ${t("days")}`,
                icon: "📅",
              },
              {
                label: "Humidity",
                value: `${result.weather?.humidity ?? "--"}%`,
                icon: "💧",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl p-4 text-center shadow-sm"
              >
                <div className="text-3xl mb-1">{s.icon}</div>
                <div className="font-bold text-xl text-gray-800">{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Spoilage Timeline Bar */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Spoilage Timeline</span>
              <span className="font-semibold">
                {result.spoilageDays} days remaining
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  result.freshness === "Fresh"
                    ? "bg-green-400"
                    : result.freshness === "Moderate"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                }`}
                style={{
                  width: `${Math.min((result.spoilageDays / 14) * 100, 100)}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Now</span>
              <span>14 days</span>
            </div>
          </div>

          {/* Pest & Disease */}
          <div className="grid sm:grid-cols-2 gap-4">
            <DetectionCard
              label={t("pestDetected")}
              icon="🐛"
              detected={result.pestDetected}
              detail={result.pestType}
              probability={result.pestProbability}
            />
            <DetectionCard
              label={t("diseaseDetected")}
              icon="🦠"
              detected={result.diseaseDetected}
              detail={result.diseaseType}
            />
          </div>

          {/* Recommendations */}
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
                    <span className="text-primary font-bold mt-0.5 shrink-0">
                      ✓
                    </span>{" "}
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weather */}
          {result.weather && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-700 mb-2">
                🌤️ Conditions at {result.weather.location}
              </h3>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                <span>🌡️ {result.weather.temperature}°C</span>
                <span>💧 {result.weather.humidity}%</span>
                <span>💨 {result.weather.windSpeed} m/s</span>
                <span className="capitalize">
                  ☁️ {result.weather.description}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetectionCard({ label, icon, detected, detail, probability }) {
  return (
    <div
      className={`bg-white rounded-xl p-4 shadow-sm border-l-4
      ${detected ? "border-red-400" : "border-green-400"}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="font-semibold text-gray-700 text-sm">{label}</span>
      </div>
      <div
        className={`text-xl font-bold ${detected ? "text-red-600" : "text-green-600"}`}
      >
        {detected ? "Detected" : "Safe ✓"}
      </div>
      {detected && detail && (
        <div className="text-sm text-gray-500 mt-1">{detail}</div>
      )}
      {detected && probability != null && (
        <div className="mt-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full"
              style={{ width: `${(probability * 100).toFixed(0)}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {(probability * 100).toFixed(0)}% probability
          </div>
        </div>
      )}
    </div>
  );
}
