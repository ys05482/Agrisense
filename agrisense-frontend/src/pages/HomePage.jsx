import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { getHistory } from "../services/api";

const FEATURES = [
  { icon:"📷", path:"/analyze",   bg:"bg-green-50 border-green-200",   titleKey:"analyze",   desc:"Instantly identify crop type, freshness & spoilage timeline from a single photo." },
  { icon:"🔬", path:"/simulate",  bg:"bg-blue-50 border-blue-200",     titleKey:"simulator", desc:"Adjust temperature, humidity & storage to model exactly how shelf life changes." },
  { icon:"🗺️", path:"/map",       bg:"bg-yellow-50 border-yellow-200", titleKey:"map",       desc:"Locate nearby mandis and cold storage facilities on an interactive map." },
  { icon:"📈", path:"/market",    bg:"bg-purple-50 border-purple-200", titleKey:"market",    desc:"14-day AI price predictions to help you decide the perfect day to sell." },
  { icon:"🐛", path:"/pest-risk", bg:"bg-red-50 border-red-200",       titleKey:"pestRisk",  desc:"Real-time pest probability scores based on local weather conditions." },
];

export default function HomePage() {
  const { t } = useLang();
  const { weather, locationStatus, userLocation, prediction } = useApp();
  const navigate = useNavigate();
  const [recentCount, setRecentCount] = useState(null);

  useEffect(() => {
    getHistory(5).then(r => setRecentCount(r.total ?? 0)).catch(() => {});
  }, []);

  return (
    <div className="space-y-10 animate-fadeup">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 text-white px-6 py-14 text-center">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage:"radial-gradient(circle at 20% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize:"40px 40px" }} />

        <div className="relative z-10">
          <div className="text-7xl mb-5 animate-fadeup">🌾</div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 tracking-tight">{t("appName")}</h1>
          <p className="text-lg text-green-100 mb-8 max-w-lg mx-auto leading-relaxed">{t("tagline")}</p>

          {/* Live weather pill */}
          {weather && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm mb-6">
              <span className="live-dot" />
              <span>📍 {weather.city}</span>
              <span>·</span>
              <span>🌡️ {weather.temperature}°C</span>
              <span>·</span>
              <span>💧 {weather.humidity}%</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate("/analyze")}
              className="bg-white text-green-700 font-bold px-8 py-3 rounded-full
                         hover:bg-green-50 transition shadow-lg text-base">
              {t("analyze_btn")} →
            </button>
            {prediction && (
              <button onClick={() => navigate("/simulate")}
                className="bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-3 rounded-full
                           hover:bg-white/30 transition border border-white/40 text-base">
                🔬 {t("simulator")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick stats ──────────────────────────────────────────── */}
      {(prediction || recentCount !== null || weather) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            prediction && { icon:"🌱", value: prediction.cropType, label:"Last analyzed crop" },
            prediction && { icon:"📅", value: `${prediction.spoilageDays} ${t("days")}`, label:"Spoilage estimate" },
            weather    && { icon:"🌡️", value: `${weather.temperature}°C`, label:`${weather.city} temp` },
            recentCount !== null && { icon:"🔍", value: recentCount, label:"Total analyses" },
          ].filter(Boolean).map((s, i) => (
            <div key={i} className="card text-center hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-bold text-xl text-gray-800 truncate">{s.value}</div>
              <div className="text-xs text-gray-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Last analysis banner ─────────────────────────────────── */}
      {prediction && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 flex items-center gap-4 flex-wrap">
          <div className="text-4xl">📌</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-green-900">Continue from your last analysis</p>
            <p className="text-sm text-green-700">
              <strong>{prediction.cropType}</strong> — {prediction.freshness} · {prediction.spoilageDays} {t("days")} remaining
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/simulate")}
              className="btn-primary text-sm py-2 px-4">
              Run Simulator
            </button>
            <button onClick={() => navigate("/market")}
              className="text-sm py-2 px-4 border-2 border-green-700 text-green-700 rounded-xl font-semibold hover:bg-green-50 transition">
              Check Prices
            </button>
          </div>
        </div>
      )}

      {/* ── Feature Grid ─────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-5 text-center">
          What can {t("appName")} do?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <button key={f.path} onClick={() => navigate(f.path)}
              className={`card border-2 ${f.bg} text-left hover:shadow-md hover:-translate-y-0.5 transition-all`}>
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">{t(f.titleKey)}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">{t("howItWorks")}</h2>
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {[
            { step:"1", icon:"📷", titleKey:"step1Title", descKey:"step1Desc" },
            { step:"2", icon:"🤖", titleKey:"step2Title", descKey:"step2Desc" },
            { step:"3", icon:"💡", titleKey:"step3Title", descKey:"step3Desc" },
          ].map((s, i, arr) => (
            <div key={s.step} className="relative space-y-3">
              {i < arr.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[60%] w-[80%] h-0.5 bg-green-200 z-0" />
              )}
              <div className="w-10 h-10 bg-green-700 text-white rounded-full flex items-center
                              justify-center font-bold mx-auto text-lg relative z-10 shadow-sm">
                {s.step}
              </div>
              <div className="text-3xl">{s.icon}</div>
              <h3 className="font-semibold text-gray-800">{t(s.titleKey)}</h3>
              <p className="text-gray-500 text-sm">{t(s.descKey)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ML model info ────────────────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon:"🧠", title:"CNN Image Model", desc:"MobileNetV2-based classifier. Identifies Fresh/Rotten across 39 crop types with 81.9% accuracy.", color:"bg-blue-50 border-blue-200" },
          { icon:"📊", title:"XGBoost Spoilage", desc:"Predicts spoilage bucket (0-1 to 7+ days) using 9 engineered features including weather, storage & freshness.", color:"bg-purple-50 border-purple-200" },
          { icon:"🌤️", title:"Live Weather", desc:"Real-time OpenWeather data auto-fills temperature & humidity for accurate location-aware predictions.", color:"bg-amber-50 border-amber-200" },
        ].map(m => (
          <div key={m.title} className={`card border-2 ${m.color}`}>
            <div className="text-3xl mb-3">{m.icon}</div>
            <h3 className="font-bold text-gray-800 mb-2">{m.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
