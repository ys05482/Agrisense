const express = require("express");
const router = express.Router();
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
const { Analysis } = require("../models");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

// ── Multer config ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `crop_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error("Only JPG, PNG, WebP images allowed"));
  },
});

// ── POST /api/analyze ─────────────────────────────────────────────────
router.post("/", upload.single("image"), async (req, res) => {
  try {
    if (!req.file && !req.body.image_base64) {
      return res.status(400).json({ error: "No image provided" });
    }

    const {
      storage_type = "room_temp",
      temperature,
      humidity,
      city,
      lat,
      lon,
    } = req.body;

    // Fetch weather if lat/lon provided but no temp/humidity
    let temp = temperature ? parseFloat(temperature) : 28.0;
    let hum = humidity ? parseFloat(humidity) : 65.0;
    let cityName = city || "Unknown";

    if (lat && lon && (!temperature || !humidity)) {
      try {
        const wResp = await axios.get(
          `http://api.openweathermap.org/data/2.5/weather`,
          {
            params: {
              lat,
              lon,
              appid: process.env.OPENWEATHER_API_KEY,
              units: "metric",
            },
            timeout: 5000,
          },
        );
        temp = wResp.data.main.temp;
        hum = wResp.data.main.humidity;
        cityName = wResp.data.name || cityName;
      } catch (e) {
        console.warn("Weather fetch failed, using defaults:", e.message);
      }
    }

    // ── Call ML microservice (UNIFIED JSON APPROACH) ──────────────────
    let mlResult;
    let imageBase64 = req.body.image_base64;

    // If file was uploaded, convert to base64
    if (req.file) {
      imageBase64 = fs.readFileSync(req.file.path, { encoding: "base64" });
      // Optional: Delete the file after reading to save space
      fs.unlinkSync(req.file.path);
    }

    const mlResp = await axios.post(
      `${ML_SERVICE_URL}/predict/image`,
      {
        image: imageBase64, // Standardize key as 'image'
        storage_type,
        temperature: temp,
        humidity: hum,
        city: cityName,
      },
      { timeout: 30000, headers: { "Content-Type": "application/json" } },
    );
    mlResult = mlResp.data.prediction; // Note: accessing the 'prediction' object from your Flask response

    // ── Save to MongoDB ─────────────────────────────────────────────
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const saved = await Analysis.create({
      crop: mlResult.crop,
      is_fresh: mlResult.is_fresh,
      freshness_score: mlResult.freshness_score,
      freshness_percent: mlResult.freshness_percent,
      predicted_spoilage: mlResult.predicted_spoilage,
      spoilage_confidence: mlResult.spoilage_confidence,
      days_estimate: mlResult.days_estimate,
      storage_type,
      temperature: temp,
      humidity: hum,
      city: cityName,
      image_url: imageUrl,
    });

    return res.json({
      success: true,
      id: saved._id,
      ...mlResult,
      image_url: imageUrl,
    });
  } catch (err) {
    console.error("Analyze error:", err.message);
    if (err.code === "ECONNREFUSED") {
      return res.status(503).json({
        error:
          "ML service unavailable. Make sure python ml_service.py is running on port 5001.",
      });
    }
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
