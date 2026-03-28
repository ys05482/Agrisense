const express = require("express");
const {
  predictSpoilageHandler,
  whatIfSimulator,
} = require("../controllers/spoilageController");

const router = express.Router();
router.post("/predict", predictSpoilageHandler);
router.post("/whatif", whatIfSimulator);

module.exports = router;
