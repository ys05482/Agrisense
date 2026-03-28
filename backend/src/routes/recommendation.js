const express = require("express");
const controller = require("../controllers/recommendationController");

const router = express.Router();

// ── Routes ──────────────────────────────────────────────────

// Get market price forecast
router.get("/market-prices", controller.getMarketPrices);

// Get nearby agricultural locations (mandis, cold storages)
router.get("/nearby-locations", controller.getNearbyLocations);

// Get storage recommendations based on crop and conditions
router.post("/storage-recommendations", controller.getStorageRecommendations);

// Get best time to sell crop
router.get("/best-selling-time", controller.getBestSellingTime);

module.exports = router;
