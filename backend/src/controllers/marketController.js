const { forecastMarketPrice } = require("../services/mlService");

const getMarketForecast = async (req, res) => {
  try {
    const { cropType, lat, lng } = req.query;
    if (!cropType)
      return res.status(400).json({ error: "cropType is required" });
    const result = await forecastMarketPrice({
      cropType,
      location: { lat: parseFloat(lat) || null, lng: parseFloat(lng) || null },
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getMarketForecast };
