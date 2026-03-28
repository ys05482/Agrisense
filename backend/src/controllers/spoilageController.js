const { predictSpoilage } = require("../services/mlService");

const predictSpoilageHandler = async (req, res) => {
  try {
    const { cropType, freshnessGrade, temperature, humidity, storageType } =
      req.body;
    if (!cropType || !freshnessGrade) {
      return res
        .status(400)
        .json({ error: "cropType and freshnessGrade are required" });
    }
    const result = await predictSpoilage({
      cropType,
      freshnessGrade,
      temperature,
      humidity,
      storageType,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const whatIfSimulator = async (req, res) => {
  try {
    const { cropType, freshnessGrade, scenarios } = req.body;
    if (!cropType || !freshnessGrade) {
      return res
        .status(400)
        .json({ error: "cropType and freshnessGrade are required" });
    }

    const defaultScenarios = scenarios || [
      {
        storageType: "open_air",
        temperature: 30,
        humidity: 70,
        label: "Open Air — Hot",
      },
      {
        storageType: "open_air",
        temperature: 22,
        humidity: 55,
        label: "Open Air — Cool",
      },
      {
        storageType: "warehouse",
        temperature: 25,
        humidity: 60,
        label: "Warehouse — Standard",
      },
      {
        storageType: "warehouse",
        temperature: 20,
        humidity: 55,
        label: "Warehouse — Optimised",
      },
      {
        storageType: "cold_storage",
        temperature: 8,
        humidity: 85,
        label: "Cold Storage",
      },
    ];

    const results = await Promise.all(
      defaultScenarios.map(async (scenario) => {
        const prediction = await predictSpoilage({
          cropType,
          freshnessGrade,
          ...scenario,
        });
        return {
          ...scenario,
          daysUntilSpoilage: prediction.daysUntilSpoilage,
          confidence: prediction.confidence,
        };
      }),
    );

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { predictSpoilageHandler, whatIfSimulator };
