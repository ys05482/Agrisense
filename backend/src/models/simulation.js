const mongoose = require("mongoose");

const SimulationSchema = new mongoose.Schema(
  {
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
      default: null,
    },
    cropType: {
      type: String,
      required: true,
      enum: ["Tomato", "Potato", "Mango", "Onion", "Wheat", "Rice", "Other"],
    },
    baseFreshness: {
      type: String,
      enum: ["Fresh", "Moderate", "Spoiled"],
    },
    inputs: {
      temperature: {
        type: Number,
        required: true,
      },
      humidity: {
        type: Number,
        required: true,
      },
      storageType: {
        type: String,
        required: true,
        enum: ["room", "cold", "freezer", "controlled"],
      },
    },
    result: {
      spoilageDays: Number,
      freshness: {
        type: String,
        enum: ["Fresh", "Moderate", "Spoiled"],
      },
      recommendations: [String],
      confidenceLevel: {
        type: String,
        enum: ["High", "Medium", "Low"],
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Simulation", SimulationSchema);
