const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const analyzeRoutes = require("./routes/analyze");
const simulateRoutes = require("./routes/simulate");
const weatherRoutes = require("./routes/weather");
const pricesRoutes = require("./routes/prices");
const pestRoutes = require("./routes/pest");
const translateRoutes = require("./routes/translate");
const historyRoutes = require("./routes/history");

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ── Static uploads folder ─────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ── MongoDB Connection ────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/agrisense";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected:", "Successfully ✅"))
  .catch((err) => console.error("❌ MongoDB error:", err.message));

// ── Routes ────────────────────────────────────────────────────────────
app.use("/api/analyze", analyzeRoutes);
app.use("/api/simulate", simulateRoutes);
app.use("/api/weather", weatherRoutes);
app.use("/api/prices", pricesRoutes);
app.use("/api/pest", pestRoutes);
app.use("/api/translate", translateRoutes);
app.use("/api/history", historyRoutes);

// ── Health Check ─────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ── Global Error Handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`\n🌱 AgriSense Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});
