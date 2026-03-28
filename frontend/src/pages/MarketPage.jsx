import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useLang } from "../context/LanguageContext";
import { getMarketPrices } from "../services/api";
import { saveToCache, getFromCache } from "../utils/offline";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const CROPS = ["Tomato", "Potato", "Mango", "Onion", "Wheat", "Rice"];
const EMOJIS = {
  Tomato: "🍅",
  Potato: "🥔",
  Mango: "🥭",
  Onion: "🧅",
  Wheat: "🌾",
  Rice: "🍚",
};

export default function MarketPage() {
  const { t } = useLang();
  const [crop, setCrop] = useState("Tomato");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const KEY = `prices_${crop}`;
    const cached = getFromCache(KEY);
    if (cached) setData(cached);

    setLoading(true);
    setError("");
    getMarketPrices(crop, 14)
      .then((res) => {
        setData(res.data);
        saveToCache(KEY, res.data);
      })
      .catch(() => {
        if (!cached) setError("Could not load price data.");
      })
      .finally(() => setLoading(false));
  }, [crop]);

  const maxPrice = data ? Math.max(...data.predictedPrices) : 0;
  const minPrice = data ? Math.min(...data.predictedPrices) : 0;

  const chartData = data
    ? {
        labels: data.labels,
        datasets: [
          {
            label: `${crop} (${data.unit})`,
            data: data.predictedPrices,
            borderColor: "#16a34a",
            backgroundColor: "rgba(22,163,74,0.08)",
            pointBackgroundColor: data.predictedPrices.map((p) =>
              p === maxPrice ? "#ef4444" : "#16a34a",
            ),
            pointRadius: data.predictedPrices.map((p) =>
              p === maxPrice ? 8 : 4,
            ),
            tension: 0.4,
            fill: true,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: { label: (ctx) => `₹${ctx.parsed.y.toFixed(2)}/kg` },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v) => `₹${v}` },
        grid: { color: "rgba(0,0,0,0.04)" },
      },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📈 {t("market")}</h1>

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
              {EMOJIS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {loading && !data && (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-5xl mb-3 animate-pulse">📊</div>
          <p>Loading price forecast for {crop}…</p>
        </div>
      )}

      {error && !data && (
        <div className="card text-center text-red-600 py-8">{error}</div>
      )}

      {data && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                icon: "💰",
                label: t("currentPrice"),
                value: `₹${data.currentPrice}/kg`,
                color: "text-gray-800",
              },
              {
                icon: "📈",
                label: "Peak Price",
                value: `₹${maxPrice.toFixed(2)}/kg`,
                color: "text-green-600",
              },
              {
                icon: "📉",
                label: "Lowest Price",
                value: `₹${minPrice.toFixed(2)}/kg`,
                color: "text-red-500",
              },
              {
                icon: "⭐",
                label: t("bestSellTime"),
                value: data.bestSellDay,
                color: "text-primary",
              },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className={`font-bold text-lg leading-tight ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-xs text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              {EMOJIS[crop]} {crop} — {t("priceChart")}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              🔴 Red dot = best sell day
            </p>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Best Sell Highlight */}
          <div
            className="card flex items-center gap-4
                          bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200"
          >
            <div className="text-5xl shrink-0">💡</div>
            <div>
              <div className="font-bold text-green-800 text-lg">
                Best Time to Sell
              </div>
              <p className="text-green-700 text-sm mt-1">
                Sell your <strong>{crop}</strong> on{" "}
                <strong>{data.bestSellDay}</strong> for maximum profit. Expected
                price: <strong>₹{maxPrice.toFixed(2)}/kg</strong> (+₹
                {(maxPrice - data.currentPrice).toFixed(2)} vs today).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
