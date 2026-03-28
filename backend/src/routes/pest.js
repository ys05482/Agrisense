const express = require("express");
const { predictPest } = require("../controllers/pestController");

const router = express.Router();
router.post("/predict", predictPest);

module.exports = router;
