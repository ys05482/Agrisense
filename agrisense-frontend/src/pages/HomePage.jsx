import React from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LanguageContext";

const FEATURES = [
  {
    icon: "📷",
    path: "/analyze",
    bg: "bg-green-50  border-green-200",
    title: "Crop Analysis",
    desc: "Instantly identify crop type, freshness & spoilage timeline from a single photo.",
  },
  {
    icon: "🔬",
    path: "/simulate",
    bg: "bg-blue-50   border-blue-200",
    title: "What-If Simulator",
    desc: "Adjust temperature, humidity & storage type to model exactly how shelf life changes.",
  },
  {
    icon: "🗺️",
    path: "/map",
    bg: "bg-yellow-50 border-yellow-200",
    title: "Market Map",
    desc: "Locate nearby mandis and cold storage facilities on an interactive map.",
  },
  {
    icon: "📈",
    path: "/market",
    bg: "bg-purple-50 border-purple-200",
    title: "Price Forecast",
    desc: "14-day AI price predictions to help you decide the perfect day to sell.",
  },
  {
    icon: "🐛",
    path: "/pest-risk",
    bg: "bg-red-50    border-red-200",
    title: "Pest Risk Alerts",
    desc: "Real-time pest probability scores based on local weather conditions.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: "📷",
    title: "Upload Photo",
    desc: "Take a photo or upload from gallery.",
  },
  {
    step: "2",
    icon: "🤖",
    title: "AI Analysis",
    desc: "ML model identifies crop & freshness.",
  },
  {
    step: "3",
    icon: "💡",
    title: "Get Recommendations",
    desc: "Storage tips, market prices & more.",
  },
];

export default function HomePage() {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center py-14 bg-gradient-to-br from-green-600 to-green-800 rounded-3xl text-white px-6">
        <div className="text-7xl mb-4">🌾</div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-3">{t("appName")}</h1>
        <p className="text-xl text-green-100 mb-8 max-w-xl mx-auto">
          {t("tagline")}
        </p>
        <button
          onClick={() => navigate("/analyze")}
          className="bg-white text-primary font-bold px-8 py-3 rounded-full
                     hover:bg-green-50 transition shadow-lg text-lg"
        >
          {t("analyze_btn")} →
        </button>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-5 text-center">
          What can AgriSense do?
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <button
              key={f.path}
              onClick={() => navigate(f.path)}
              className={`card border-2 ${f.bg} text-left hover:shadow-md transition-shadow`}
            >
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-gray-800 text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          How It Works
        </h2>
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="space-y-3 relative">
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[60%] w-[80%] h-0.5 bg-green-200" />
              )}
              <div
                className="w-10 h-10 bg-primary text-white rounded-full flex items-center
                              justify-center font-bold mx-auto text-lg relative z-10"
              >
                {s.step}
              </div>
              <div className="text-3xl">{s.icon}</div>
              <h3 className="font-semibold text-gray-800">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
