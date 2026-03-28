const mlService = require("../services/mlService");
const weatherService = require("../services/weatherService");
const Prediction = require("../models/Prediction");

// ── Upload and Analyze Image ────────────────────────────────
async function uploadAndAnalyze(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    const { lat, lon, cropType } = req.body;
    const startTime = Date.now();

    // Get weather data
    let weather;
    if (lat && lon) {
      weather = await weatherService.getWeatherByCoords(
        parseFloat(lat),
        parseFloat(lon),
      );
    } else {
      weather = await weatherService.getWeatherByCity("Delhi");
    }

    // Analyze image with ML service
    const mlResult = await mlService.analyzeImage(
      req.file.buffer,
      req.file.mimetype,
    );

    // Save prediction to database
    const prediction = await Prediction.create({
      imageUrl: req.file.originalname,
      cropType: cropType || mlResult.cropType,
      freshness: mlResult.freshness,
      confidenceScore: mlResult.confidenceScore,
      spoilageDays: mlResult.spoilageDays,
      pestDetected: mlResult.pestDetected,
      pestType: mlResult.pestType,
      pestProbability: mlResult.pestProbability,
      diseaseDetected: mlResult.diseaseDetected,
      diseaseType: mlResult.diseaseType,
      recommendations: mlResult.recommendations,
      weatherAtTime: {
        temperature: weather.temperature,
        humidity: weather.humidity,
        location: weather.location,
        description: weather.description,
      },
      userLocation:
        lat && lon ? { lat: parseFloat(lat), lon: parseFloat(lon) } : null,
      analysisMetadata: {
        modelVersion: "1.0",
        processingTime: Date.now() - startTime,
      },
    });

    res.status(201).json({
      success: true,
      message: "Image analyzed successfully",
      data: {
        predictionId: prediction._id,
        cropType: prediction.cropType,
        freshness: prediction.freshness,
        confidenceScore: prediction.confidenceScore,
        spoilageDays: prediction.spoilageDays,
        pestDetected: prediction.pestDetected,
        pestType: prediction.pestType,
        pestProbability: prediction.pestProbability,
        diseaseDetected: prediction.diseaseDetected,
        diseaseType: prediction.diseaseType,
        recommendations: prediction.recommendations,
        weather: {
          temperature: weather.temperature,
          humidity: weather.humidity,
          location: weather.location,
          description: weather.description,
        },
      },
    });
  } catch (err) {
    console.error("❌ uploadAndAnalyze error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to analyze image",
    });
  }
}

// ── Get Spoilage Prediction ─────────────────────────────────
async function getSpoilagePrediction(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Prediction ID is required",
      });
    }

    const prediction = await Prediction.findById(id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found",
      });
    }

    res.json({
      success: true,
      data: prediction,
    });
  } catch (err) {
    console.error("❌ getSpoilagePrediction error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve prediction",
    });
  }
}

// ── Assess Pest Risk ────────────────────────────────────────
async function assessPestRisk(req, res) {
  try {
    const { cropType, lat, lon } = req.body;

    if (!cropType) {
      return res.status(400).json({
        success: false,
        message: "cropType is required",
      });
    }

    // Get weather data
    let weather;
    if (lat && lon) {
      weather = await weatherService.getWeatherByCoords(
        parseFloat(lat),
        parseFloat(lon),
      );
    } else {
      weather = await weatherService.getWeatherByCity("Delhi");
    }

    // Get pest risk assessment
    const pestRisk = await mlService.getPestRisk({
      cropType,
      temperature: weather.temperature,
      humidity: weather.humidity,
      location: weather.location,
    });

    res.json({
      success: true,
      data: {
        cropType,
        pestRisk: {
          probability: pestRisk.probability,
          riskLevel: pestRisk.riskLevel,
          pestTypes: pestRisk.pestTypes,
          recommendations: pestRisk.recommendations,
        },
        weather: {
          temperature: weather.temperature,
          humidity: weather.humidity,
          description: weather.description,
          location: weather.location,
        },
      },
    });
  } catch (err) {
    console.error("❌ assessPestRisk error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to assess pest risk",
    });
  }
}

// ── Get All Predictions ─────────────────────────────────────
async function getAllPredictions(req, res) {
  try {
    const { page = 1, limit = 10, cropType, freshness } = req.query;

    const filter = {};
    if (cropType) filter.cropType = cropType;
    if (freshness) filter.freshness = freshness;

    const predictions = await Prediction.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Prediction.countDocuments(filter);

    res.json({
      success: true,
      data: predictions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("❌ getAllPredictions error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve predictions",
    });
  }
}

// ── Delete Prediction ───────────────────────────────────────
async function deletePrediction(req, res) {
  try {
    const { id } = req.params;

    const prediction = await Prediction.findByIdAndDelete(id);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found",
      });
    }

    res.json({
      success: true,
      message: "Prediction deleted successfully",
    });
  } catch (err) {
    console.error("❌ deletePrediction error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete prediction",
    });
  }
}

module.exports = {
  uploadAndAnalyze,
  getSpoilagePrediction,
  assessPestRisk,
  getAllPredictions,
  deletePrediction,
};
