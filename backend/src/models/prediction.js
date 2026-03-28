const mongoose = require("mongoose");

const PredictionSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: false,
    },
    cropType: {
      type: String,
      required: true,
      enum: ["Tomato", "Potato", "Mango", "Onion", "Wheat", "Rice", "Other"],
    },
    freshness: {
      type: String,
      required: true,
      enum: ["Fresh", "Moderate", "Spoiled"],
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    spoilageDays: {
      type: Number,
      required: true,
      min: 0,
    },
    pestDetected: {
      type: Boolean,
      default: false,
    },
    pestType: {
      type: String,
      default: null,
    },
    pestProbability: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    diseaseDetected: {
      type: Boolean,
      default: false,
    },
    diseaseType: {
      type: String,
      default: null,
    },
    recommendations: {
      type: [String],
      default: [],
    },
    weatherAtTime: {
      temperature: Number,
      humidity: Number,
      location: String,
      description: String,
    },
    userLocation: {
      lat: Number,
      lon: Number,
    },
    analysisMetadata: {
      modelVersion: String,
      processingTime: Number,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Prediction", PredictionSchema);
