const mlService = require("../services/mlService");
const mapsService = require("../services/mapsService");
const weatherService = require("../services/weatherService");

// ── Get Market Price Forecast ───────────────────────────────
async function getMarketPrices(req, res) {
  try {
    const { crop = "Tomato", days = 14 } = req.query;

    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Days must be between 1 and 365",
      });
    }

    const forecast = await mlService.getMarketPriceForecast({
      cropType: crop,
      days: parseInt(days),
    });

    res.json({
      success: true,
      data: forecast,
    });
  } catch (err) {
    console.error("❌ getMarketPrices error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch market prices",
    });
  }
}

// ── Get Nearby Agricultural Locations ───────────────────────
async function getNearbyLocations(req, res) {
  try {
    const { lat = 28.6139, lon = 77.209, radius = 25000 } = req.query;

    // Validate coordinates
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: "Latitude must be between -90 and 90",
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: "Longitude must be between -180 and 180",
      });
    }

    // Get locations and weather in parallel
    const [locations, weather] = await Promise.all([
      mapsService.getNearbyAgriLocations(latitude, longitude, parseInt(radius)),
      weatherService.getWeatherByCoords(latitude, longitude),
    ]);

    res.json({
      success: true,
      data: {
        userLocation: {
          lat: latitude,
          lon: longitude,
        },
        mandis: locations.mandis,
        coldStorages: locations.coldStorages,
        weather: {
          temperature: weather.temperature,
          humidity: weather.humidity,
          description: weather.description,
          location: weather.location,
        },
      },
    });
  } catch (err) {
    console.error("❌ getNearbyLocations error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch nearby locations",
    });
  }
}

// ── Get Storage Recommendations ─────────────────────────────
async function getStorageRecommendations(req, res) {
  try {
    const { cropType, freshness, temperature, humidity } = req.body;

    if (!cropType || !freshness) {
      return res.status(400).json({
        success: false,
        message: "cropType and freshness are required",
      });
    }

    const validCrops = [
      "Tomato",
      "Potato",
      "Mango",
      "Onion",
      "Wheat",
      "Rice",
      "Other",
    ];
    const validFreshness = ["Fresh", "Moderate", "Spoiled"];

    if (!validCrops.includes(cropType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cropType. Must be one of: ${validCrops.join(", ")}`,
      });
    }

    if (!validFreshness.includes(freshness)) {
      return res.status(400).json({
        success: false,
        message: `Invalid freshness. Must be one of: ${validFreshness.join(", ")}`,
      });
    }

    // Get weather data if not provided
    let weather;
    if (temperature != null && humidity != null) {
      weather = { temperature, humidity };
    } else {
      weather = await weatherService.getWeatherByCity("Delhi");
    }

    // Generate recommendations based on storage type
    const recommendations = _generateStorageRecommendations(
      cropType,
      freshness,
      weather.temperature,
      weather.humidity,
    );

    res.json({
      success: true,
      data: {
        cropType,
        freshness,
        weather: {
          temperature: weather.temperature,
          humidity: weather.humidity,
        },
        recommendations,
      },
    });
  } catch (err) {
    console.error("❌ getStorageRecommendations error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get storage recommendations",
    });
  }
}

// ── Get Best Selling Time ───────────────────────────────────
async function getBestSellingTime(req, res) {
  try {
    const { crop = "Tomato", days = 30 } = req.query;

    if (days < 7 || days > 365) {
      return res.status(400).json({
        success: false,
        message: "Days must be between 7 and 365 for price forecasting",
      });
    }

    const forecast = await mlService.getMarketPriceForecast({
      cropType: crop,
      days: parseInt(days),
    });

    const bestPrice = Math.max(...forecast.predictedPrices);
    const bestDayIndex = forecast.predictedPrices.indexOf(bestPrice);

    res.json({
      success: true,
      data: {
        cropType: crop,
        currentPrice: forecast.currentPrice,
        bestSellingDay: forecast.labels[bestDayIndex],
        bestPrice: bestPrice,
        expectedGain: (bestPrice - forecast.currentPrice).toFixed(2),
        gainPercentage: (
          ((bestPrice - forecast.currentPrice) / forecast.currentPrice) *
          100
        ).toFixed(2),
        priceHistory: {
          labels: forecast.labels,
          prices: forecast.predictedPrices,
        },
        unit: forecast.unit,
      },
    });
  } catch (err) {
    console.error("❌ getBestSellingTime error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch best selling time",
    });
  }
}

// ── Helper Function: Generate Storage Recommendations ───────
function _generateStorageRecommendations(
  cropType,
  freshness,
  temperature,
  humidity,
) {
  const recommendations = [];

  // Freshness-based recommendations
  if (freshness === "Fresh") {
    recommendations.push("✅ Crop is in excellent condition");
    recommendations.push("🕐 You have 5-7 days before spoilage");
    recommendations.push("💰 Best to sell within 3-4 days for maximum profit");
  } else if (freshness === "Moderate") {
    recommendations.push("⚠️  Crop showing signs of aging");
    recommendations.push("🕐 You have 2-3 days remaining");
    recommendations.push("💰 Sell within 1-2 days to minimize losses");
  } else if (freshness === "Spoiled") {
    recommendations.push("❌ Crop is significantly spoiled");
    recommendations.push("🕐 Must be sold immediately or processed");
    recommendations.push(
      "💰 Consider selling to processors or for animal feed",
    );
  }

  // Temperature-based recommendations
  if (temperature > 35) {
    recommendations.push(
      "🔥 High temperature detected — shift to cold storage immediately",
    );
    recommendations.push("❄️  Maintain 2-8°C for optimal preservation");
  } else if (temperature > 25) {
    recommendations.push("🌡️  Moderate temperature — monitor closely");
    recommendations.push("🔄 Consider moving to cool/shaded area");
  } else if (temperature < 0) {
    recommendations.push("❄️  Very low temperature — risk of frost damage");
    recommendations.push("⚠️  Adjust storage temperature to 5-10°C");
  }

  // Humidity-based recommendations
  if (humidity > 85) {
    recommendations.push("💧 High humidity — fungal growth risk");
    recommendations.push("🌬️  Improve ventilation immediately");
    recommendations.push("🧂 Use desiccants or moisture absorbers");
  } else if (humidity < 40) {
    recommendations.push("🏜️  Low humidity — risk of drying and shriveling");
    recommendations.push("💧 Maintain humidity at 60-75% for best results");
  }

  // Crop-specific recommendations
  const cropRecs = {
    Tomato: "🍅 Store away from ethylene-producing fruits",
    Potato: "🥔 Keep in dark, cool place to prevent sprouting and greening",
    Mango: "🥭 Allow to ripen at room temperature before cold storage",
    Onion: "🧅 Ensure good ventilation to prevent rot",
    Wheat: "🌾 Keep dry and protect from moisture and pests",
    Rice: "🍚 Maintain optimal moisture (11-14%) to prevent mold",
  };

  if (cropRecs[cropType]) {
    recommendations.push(cropRecs[cropType]);
  }

  recommendations.push("📋 Check crop condition daily");
  recommendations.push("🔍 Remove any damaged or spoiled items immediately");

  return recommendations;
}

module.exports = {
  getMarketPrices,
  getNearbyLocations,
  getStorageRecommendations,
  getBestSellingTime,
};
