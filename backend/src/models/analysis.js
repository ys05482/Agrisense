const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    // Base64 stored for demo purposes — swap for Cloudinary URL in production
    imageBase64: { type: String },
    cropType: { type: String, required: true },
    freshnessGrade: {
      type: String,
      enum: ["Fresh", "Moderate", "Spoiled"],
      required: true,
    },
    confidence: { type: Number },
    pestMarkers: [String],

    conditions: {
      temperature: Number,
      humidity: Number,
      storageType: {
        type: String,
        enum: ["open_air", "warehouse", "cold_storage"],
      },
    },

    location: {
      lat: Number,
      lng: Number,
      address: String,
    },

    spoilagePrediction: {
      daysUntilSpoilage: Number,
      confidence: Number,
    },

    recommendation: {
      action: String,
      urgency: { type: String, enum: ["low", "medium", "high"] },
      details: String,
    },

    marketPrice: {
      currentPrice: Number,
      forecastPrices: [{ day: Number, price: Number, date: String }],
      optimalSellDay: Number,
      currency: String,
    },

    pestRisk: {
      probability: Number,
      riskLevel: { type: String, enum: ["low", "moderate", "high"] },
      likelyPests: [String],
      forecastDays: Number,
    },

    nearbyStorage: [
      {
        name: String,
        type: String,
        distance: Number,
        address: String,
        contact: String,
      },
    ],
    nearbyMarkets: [
      { name: String, distance: Number, currentPrice: Number, address: String },
    ],
  },
  { timestamps: true },
);

analysisSchema.index({ createdAt: -1 });
analysisSchema.index({ cropType: 1 });

module.exports = mongoose.model("Analysis", analysisSchema);
