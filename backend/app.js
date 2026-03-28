require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

// ── Import Routes ───────────────────────────────────────────
const analyzeRoutes = require("./src/routes/analyze");
const simulateRoutes = require("./src/routes/simulate");
const recommendationRoutes = require("./src/routes/recommendation");

const app = express();

console.log("ENV CHECK:", process.env.MONGODB_URI);

// ── Middleware ──────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Database Connection ─────────────────────────────────────
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/agrisense_db",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  )
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ── Routes ──────────────────────────────────────────────────
app.use("/api", analyzeRoutes);
app.use("/api", simulateRoutes);
app.use("/api", recommendationRoutes);

// ── Health Check ────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ── Global Error Handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ── Start Server ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 AgriSense Backend running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}\n`);
});

module.exports = app;
