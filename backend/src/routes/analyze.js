const express = require("express");
const multer = require("multer");
const controller = require("../controllers/analyzeController");

const router = express.Router();

// ── Multer Configuration ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }
  },
});

// ── Routes ──────────────────────────────────────────────────

// Upload image and get analysis
router.post(
  "/upload-image",
  upload.single("image"),
  controller.uploadAndAnalyze,
);

// Get specific prediction by ID
router.get("/predict-spoilage/:id", controller.getSpoilagePrediction);

// Get all predictions with pagination and filters
router.get("/all-predictions", controller.getAllPredictions);

// Assess pest risk for a crop
router.post("/pest-risk", controller.assessPestRisk);

// Delete a prediction
router.delete("/prediction/:id", controller.deletePrediction);

module.exports = router;
