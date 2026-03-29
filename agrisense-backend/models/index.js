const mongoose = require('mongoose');

// ── Crop Analysis History ─────────────────────────────────────────────
const analysisSchema = new mongoose.Schema({
  crop:             { type: String, required: true },
  is_fresh:         { type: Boolean },
  freshness_score:  { type: Number },
  freshness_percent:{ type: Number },
  predicted_spoilage: { type: String },
  spoilage_confidence:{ type: Number },
  days_estimate:    { type: Number },
  storage_type:     { type: String },
  temperature:      { type: Number },
  humidity:         { type: Number },
  city:             { type: String },
  image_url:        { type: String },
  created_at:       { type: Date, default: Date.now },
});

// ── Pest Risk Log ─────────────────────────────────────────────────────
const pestLogSchema = new mongoose.Schema({
  crop:         { type: String, required: true },
  risk_level:   { type: String },
  risk_score:   { type: Number },
  temperature:  { type: Number },
  humidity:     { type: Number },
  city:         { type: String },
  pests:        [{ name: String, probability: Number, description: String }],
  created_at:   { type: Date, default: Date.now },
});

// ── Market Price Log ──────────────────────────────────────────────────
const priceLogSchema = new mongoose.Schema({
  crop:      { type: String, required: true },
  price:     { type: Number },
  unit:      { type: String, default: 'per kg' },
  market:    { type: String },
  city:      { type: String },
  source:    { type: String, default: 'simulated' },
  created_at:{ type: Date, default: Date.now },
});

module.exports = {
  Analysis: mongoose.model('Analysis', analysisSchema),
  PestLog:  mongoose.model('PestLog',  pestLogSchema),
  PriceLog: mongoose.model('PriceLog', priceLogSchema),
};
