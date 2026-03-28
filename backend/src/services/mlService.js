const axios = require("axios");
const FormData = require("form-data");

const ML_URL = process.env.ML_SERVICE_URL;

function isMlServiceReady() {
  return Boolean(ML_URL);
}

// ── Analyze Image ───────────────────────────────────────────
async function analyzeImage(imageBuffer, mimetype) {
  if (isMlServiceReady()) {
    try {
      const form = new FormData();
      form.append("image", imageBuffer, {
        contentType: mimetype,
        filename: "crop.jpg",
      });

      const { data } = await axios.post(`${ML_URL}/predict/analyze`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      return data;
    } catch (err) {
      console.error("ML Service error:", err.message);
      return _mockAnalysis();
    }
  }

  return _mockAnalysis();
}

// ── Simulate Spoilage ───────────────────────────────────────
async function simulateSpoilage({
  cropType,
  freshness,
  temperature,
  humidity,
  storageType,
}) {
  if (isMlServiceReady()) {
    try {
      const { data } = await axios.post(`${ML_URL}/predict/simulate`, {
        cropType,
        freshness,
        temperature,
        humidity,
        storageType,
      });
      return data;
    } catch (err) {
      console.error("ML Service error:", err.message);
      return _mockSimulation(freshness, temperature, humidity, storageType);
    }
  }

  return _mockSimulation(freshness, temperature, humidity, storageType);
}

// ── Get Pest Risk ───────────────────────────────────────────
async function getPestRisk({ cropType, temperature, humidity, location }) {
  if (isMlServiceReady()) {
    try {
      const { data } = await axios.post(`${ML_URL}/predict/pest-risk`, {
        cropType,
        temperature,
        humidity,
        location,
      });
      return data;
    } catch (err) {
      console.error("ML Service error:", err.message);
      return _mockPestRisk(temperature, humidity);
    }
  }

  return _mockPestRisk(temperature, humidity);
}

// ── Get Market Price Forecast ───────────────────────────────
async function getMarketPriceForecast({ cropType, days = 14 }) {
  if (isMlServiceReady()) {
    try {
      const { data } = await axios.post(`${ML_URL}/predict/prices`, {
        cropType,
        days,
      });
      return data;
    } catch (err) {
      console.error("ML Service error:", err.message);
      return _mockPrices(cropType, days);
    }
  }

  return _mockPrices(cropType, days);
}

// ── Mock Functions ──────────────────────────────────────────

function _mockAnalysis() {
  const crops = ["Tomato", "Potato", "Mango", "Onion", "Wheat", "Rice"];
  const freshness = ["Fresh", "Moderate", "Spoiled"];
  const pests = ["Aphids", "Fruit Borer", "Whitefly", "Mites"];
  const diseases = [
    "Early Blight",
    "Late Blight",
    "Leaf Spot",
    "Powdery Mildew",
  ];

  const pickedFreshness =
    freshness[Math.floor(Math.random() * freshness.length)];
  const hasPest = Math.random() > 0.65;
  const hasDisease = Math.random() > 0.75;

  return {
    cropType: crops[Math.floor(Math.random() * crops.length)],
    freshness: pickedFreshness,
    confidenceScore: parseFloat((0.75 + Math.random() * 0.24).toFixed(2)),
    spoilageDays:
      pickedFreshness === "Fresh"
        ? 7 + Math.floor(Math.random() * 3)
        : pickedFreshness === "Moderate"
          ? 3 + Math.floor(Math.random() * 2)
          : 1,
    pestDetected: hasPest,
    pestType: hasPest ? pests[Math.floor(Math.random() * pests.length)] : null,
    pestProbability: hasPest ? parseFloat((Math.random() * 0.8).toFixed(2)) : 0,
    diseaseDetected: hasDisease,
    diseaseType: hasDisease
      ? diseases[Math.floor(Math.random() * diseases.length)]
      : null,
    recommendations: [
      "Store in cool, dry place",
      "Keep away from direct sunlight",
      "Check moisture levels every 24 hours",
      "Ensure proper ventilation",
    ],
  };
}

function _mockSimulation(freshness, temperature, humidity, storageType) {
  let spoilageDays =
    freshness === "Fresh" ? 7 : freshness === "Moderate" ? 3 : 1;

  if (storageType === "cold") spoilageDays = Math.floor(spoilageDays * 2);
  if (storageType === "freezer") spoilageDays = Math.floor(spoilageDays * 4);
  if (storageType === "controlled") spoilageDays = Math.floor(spoilageDays * 3);

  if (temperature > 35)
    spoilageDays = Math.max(1, Math.floor(spoilageDays * 0.5));
  if (humidity > 85) spoilageDays = Math.max(1, Math.floor(spoilageDays * 0.7));

  const newFreshness =
    spoilageDays >= 5 ? "Fresh" : spoilageDays >= 2 ? "Moderate" : "Spoiled";

  return {
    spoilageDays,
    freshness: newFreshness,
    confidenceLevel:
      spoilageDays >= 5 ? "High" : spoilageDays >= 2 ? "Medium" : "Low",
    recommendations: _getStorageRecommendations(
      storageType,
      temperature,
      humidity,
      newFreshness,
    ),
  };
}

function _mockPestRisk(temperature, humidity) {
  let probability = 0.15;
  if (humidity > 75) probability += 0.3;
  if (temperature > 28) probability += 0.2;
  probability = Math.min(probability + Math.random() * 0.1, 0.99);

  const riskLevel =
    probability > 0.6 ? "High" : probability > 0.3 ? "Medium" : "Low";
  const pestTypes = [
    "Aphids",
    "Fruit Borer",
    "Whitefly",
    "Mites",
    "Caterpillar",
  ];

  return {
    probability: parseFloat(probability.toFixed(2)),
    riskLevel,
    pestTypes: pestTypes.slice(0, Math.floor(Math.random() * 3 + 1)),
    recommendations: _getPestRecommendations(riskLevel),
  };
}

function _mockPrices(cropType, days) {
  const basePrices = {
    Tomato: 25,
    Potato: 18,
    Mango: 60,
    Onion: 22,
    Wheat: 30,
    Rice: 35,
    Other: 20,
  };

  const basePrice = basePrices[cropType] || 25;
  const labels = [];
  const predicted = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    labels.push(
      d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    );

    const variance = (Math.random() - 0.4) * 8;
    const trend = i * 0.3;
    predicted.push(parseFloat((basePrice + variance + trend).toFixed(2)));
  }

  const bestPrice = Math.max(...predicted);
  const bestIdx = predicted.indexOf(bestPrice);

  return {
    cropType,
    labels,
    currentPrice: basePrice,
    predictedPrices: predicted,
    bestSellDay: labels[bestIdx],
    bestPrice: bestPrice,
    unit: "₹/kg",
  };
}

function _getStorageRecommendations(
  storageType,
  temperature,
  humidity,
  freshness,
) {
  const recommendations = [];

  if (freshness === "Spoiled")
    recommendations.push(
      "❌ Consider immediate sale or processing — spoilage imminent",
    );

  if (storageType === "room" && temperature > 30)
    recommendations.push(
      "🔄 Move to cold storage immediately to extend shelf life",
    );

  if (humidity > 80)
    recommendations.push(
      "💧 High humidity detected — reduce immediately, fungal growth risk",
    );

  if (storageType === "cold")
    recommendations.push("❄️ Maintain 2–8°C for optimal results");

  if (temperature < 0 && storageType !== "freezer")
    recommendations.push("⚠️ Temperature too low for this storage type");

  recommendations.push(
    "📋 Inspect produce every 24 hours for early spoilage signs",
  );

  return recommendations;
}

function _getPestRecommendations(riskLevel) {
  if (riskLevel === "High") {
    return [
      "🚨 Apply recommended pesticide immediately",
      "🔒 Isolate affected crop sections",
      "📞 Consult local agricultural officer",
      "👁️ Monitor field every 6 hours",
    ];
  }

  if (riskLevel === "Medium") {
    return [
      "🛡️ Apply preventive pesticide spray",
      "📊 Increase field monitoring frequency to 12 hours",
      "✂️ Remove visibly infected leaves or fruits",
      "🌿 Use neem-based spray as secondary prevention",
    ];
  }

  return [
    "✅ Continue regular field monitoring (daily)",
    "🚰 Maintain field hygiene and proper drainage",
    "🌱 Use neem-based preventive spray weekly",
    "📚 Monitor weather patterns for pest activity",
  ];
}

module.exports = {
  analyzeImage,
  simulateSpoilage,
  getPestRisk,
  getMarketPriceForecast,
};
