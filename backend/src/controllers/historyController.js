const Analysis = require("../models/analysis");

const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 9, cropType, freshnessGrade } = req.query;
    const filter = {};
    if (cropType) filter.cropType = { $regex: cropType, $options: "i" };
    if (freshnessGrade) filter.freshnessGrade = freshnessGrade;

    const total = await Analysis.countDocuments(filter);
    const analyses = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-imageBase64"); // exclude heavy base64 from list view

    res.json({
      success: true,
      data: analyses,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getAnalysisById = async (req, res) => {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getStats = async (req, res) => {
  try {
    const [total, fresh, moderate, spoiled, recent] = await Promise.all([
      Analysis.countDocuments(),
      Analysis.countDocuments({ freshnessGrade: "Fresh" }),
      Analysis.countDocuments({ freshnessGrade: "Moderate" }),
      Analysis.countDocuments({ freshnessGrade: "Spoiled" }),
      Analysis.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select(
          "cropType freshnessGrade spoilagePrediction recommendation createdAt conditions",
        ),
    ]);

    res.json({
      success: true,
      data: { total, fresh, moderate, spoiled, recent },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getHistory, getAnalysisById, getStats };
