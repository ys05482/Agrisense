const express = require("express");
const controller = require("../controllers/simulateController");

const router = express.Router();

// ── Routes ──────────────────────────────────────────────────

// Run spoilage simulation
router.post("/simulate", controller.runSimulation);

// Get simulation details
router.get("/simulation/:id", controller.getSimulation);

// Get all simulations with pagination and filters
router.get("/all-simulations", controller.getAllSimulations);

// Delete a simulation
router.delete("/simulation/:id", controller.deleteSimulation);

module.exports = router;
