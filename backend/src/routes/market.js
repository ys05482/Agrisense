const express = require("express");
const { getMarketForecast } = require("../controllers/marketController");

const router = express.Router();
router.get("/forecast", getMarketForecast);

module.exports = router;
