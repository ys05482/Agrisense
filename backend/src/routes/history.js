const express = require("express");
const {
  getHistory,
  getAnalysisById,
  getStats,
} = require("../controllers/historyController");

const router = express.Router();
// /stats must be declared before /:id to avoid being swallowed by the dynamic route
router.get("/stats", getStats);
router.get("/", getHistory);
router.get("/:id", getAnalysisById);

module.exports = router;
