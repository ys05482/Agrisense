const mlService = require("../services/mlService");
const Prediction = require("../models/Prediction");
const Simulation = require("../models/Simulation");

// ── Run Spoilage Simulation ─────────────────────────────────
async function runSimulation(req, res) {
  try {
    const {
      predictionId,
      temperature,
      humidity,
      storageType,
      cropType,
      freshness,
    } = req.body;

    // Validate required fields
    if (temperature == null || humidity == null || !storageType) {
      return res.status(400).json({
        success: false,
        message: "temperature, humidity, and storageType are required",
      });
    }

    // Validate temperature and humidity ranges
    if (temperature < -20 || temperature > 50) {
      return res.status(400).json({
        success: false,
        message: "Temperature must be between -20°C and 50°C",
      });
    }

    if (humidity < 0 || humidity > 100) {
      return res.status(400).json({
        success: false,
        message: "Humidity must be between 0% and 100%",
      });
    }

    let resolvedCropType = cropType || "Tomato";
    let resolvedFreshness = freshness || "Fresh";

    // If predictionId provided, use its crop type and freshness
    if (predictionId) {
      const prediction = await Prediction.findById(predictionId);
      if (prediction) {
        resolvedCropType = prediction.cropType;
        resolvedFreshness = prediction.freshness;
      }
    }

    // Run simulation
    const simulationResult = await mlService.simulateSpoilage({
      cropType: resolvedCropType,
      freshness: resolvedFreshness,
      temperature: Number(temperature),
      humidity: Number(humidity),
      storageType,
    });

    // Save simulation to database
    const simulation = await Simulation.create({
      predictionId: predictionId || null,
      cropType: resolvedCropType,
      baseFreshness: resolvedFreshness,
      inputs: {
        temperature: Number(temperature),
        humidity: Number(humidity),
        storageType,
      },
      result: {
        spoilageDays: simulationResult.spoilageDays,
        freshness: simulationResult.freshness,
        recommendations: simulationResult.recommendations,
        confidenceLevel: simulationResult.confidenceLevel,
      },
    });

    res.status(201).json({
      success: true,
      message: "Simulation completed successfully",
      data: {
        simulationId: simulation._id,
        cropType: resolvedCropType,
        inputs: {
          temperature,
          humidity,
          storageType,
        },
        result: simulationResult,
      },
    });
  } catch (err) {
    console.error("❌ runSimulation error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to run simulation",
    });
  }
}

// ── Get Simulation Details ──────────────────────────────────
async function getSimulation(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Simulation ID is required",
      });
    }

    const simulation = await Simulation.findById(id).populate("predictionId");

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: "Simulation not found",
      });
    }

    res.json({
      success: true,
      data: simulation,
    });
  } catch (err) {
    console.error("❌ getSimulation error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve simulation",
    });
  }
}

// ── Get All Simulations ─────────────────────────────────────
async function getAllSimulations(req, res) {
  try {
    const { page = 1, limit = 10, cropType, storageType } = req.query;

    const filter = {};
    if (cropType) filter.cropType = cropType;
    if (storageType) filter["inputs.storageType"] = storageType;

    const simulations = await Simulation.find(filter)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate("predictionId");

    const total = await Simulation.countDocuments(filter);

    res.json({
      success: true,
      data: simulations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
      },
    });
  } catch (err) {
    console.error("❌ getAllSimulations error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve simulations",
    });
  }
}

// ── Delete Simulation ───────────────────────────────────────
async function deleteSimulation(req, res) {
  try {
    const { id } = req.params;

    const simulation = await Simulation.findByIdAndDelete(id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        message: "Simulation not found",
      });
    }

    res.json({
      success: true,
      message: "Simulation deleted successfully",
    });
  } catch (err) {
    console.error("❌ deleteSimulation error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to delete simulation",
    });
  }
}

module.exports = {
  runSimulation,
  getSimulation,
  getAllSimulations,
  deleteSimulation,
};
