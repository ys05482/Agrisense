const { predictPestOutbreak } = require("../services/mlService");

const predictPest = async (req, res) => {
  try {
    const { cropType, location } = req.body;
    if (!cropType)
      return res.status(400).json({ error: "cropType is required" });
    const result = await predictPestOutbreak({
      cropType,
      location: location || {},
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { predictPest };
