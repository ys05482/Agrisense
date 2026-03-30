const express = require("express");
const axios = require("axios");
const router = express.Router();

// Haversine formula to calculate distance
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const mandiList = [
  {
    id: 1,
    name: "Azadpur Mandi",
    city: "Delhi",
    lat: 28.7196,
    lng: 77.178,
    type: "Mandi",
  },
  {
    id: 2,
    name: "APMC Vashi",
    city: "Mumbai",
    lat: 19.0635,
    lng: 73.007,
    type: "Mandi",
  },
  {
    id: 3,
    name: "Yeshwanthpur APMC",
    city: "Bengaluru",
    lat: 13.0206,
    lng: 77.5369,
    type: "Mandi",
  },
  {
    id: 4,
    name: "Koyambedu Market",
    city: "Chennai",
    lat: 13.0694,
    lng: 80.1948,
    type: "Mandi",
  },
  {
    id: 5,
    name: "Chandausi Mandi",
    city: "Uttar Pradesh",
    lat: 28.4507,
    lng: 78.7787,
    type: "Mandi",
  },
  {
    id: 6,
    name: "Hapur Mandi",
    city: "Uttar Pradesh",
    lat: 28.7304,
    lng: 77.7762,
    type: "Mandi",
  },
  {
    id: 7,
    name: "Karnal Mandi",
    city: "Haryana",
    lat: 29.6857,
    lng: 76.9905,
    type: "Mandi",
  },
  {
    id: 8,
    name: "Ludhiana Grain Market",
    city: "Punjab",
    lat: 30.9,
    lng: 75.8573,
    type: "Mandi",
  },
  {
    id: 9,
    name: "Pune APMC",
    city: "Pune",
    lat: 18.5204,
    lng: 73.8567,
    type: "Mandi",
  },
  {
    id: 10,
    name: "Ahmedabad APMC",
    city: "Ahmedabad",
    lat: 23.0225,
    lng: 72.5714,
    type: "Mandi",
  },

  {
    id: 11,
    name: "Mother Dairy Cold Store",
    city: "Delhi",
    lat: 28.628,
    lng: 77.219,
    type: "Cold Storage",
  },
  {
    id: 12,
    name: "National Cold Chain",
    city: "Mumbai",
    lat: 19.1136,
    lng: 72.8697,
    type: "Cold Storage",
  },
  {
    id: 13,
    name: "Snowman Logistics",
    city: "Bengaluru",
    lat: 12.9716,
    lng: 77.5946,
    type: "Cold Storage",
  },
  {
    id: 14,
    name: "ColdEx Logistics",
    city: "Chennai",
    lat: 13.0827,
    lng: 80.2707,
    type: "Cold Storage",
  },
  {
    id: 15,
    name: "Agro Cold Store",
    city: "Lucknow",
    lat: 26.8467,
    lng: 80.9462,
    type: "Cold Storage",
  },

  {
    id: 16,
    name: "NAFED Warehouse",
    city: "Delhi",
    lat: 28.6448,
    lng: 77.2167,
    type: "Warehouse",
  },
  {
    id: 17,
    name: "FCI Warehouse",
    city: "Patna",
    lat: 25.5941,
    lng: 85.1376,
    type: "Warehouse",
  },
  {
    id: 18,
    name: "CWC Warehouse",
    city: "Kolkata",
    lat: 22.5726,
    lng: 88.3639,
    type: "Warehouse",
  },
  {
    id: 19,
    name: "State Warehousing Corp",
    city: "Jaipur",
    lat: 26.9124,
    lng: 75.7873,
    type: "Warehouse",
  },
  {
    id: 20,
    name: "Adani Agri Logistics",
    city: "Hyderabad",
    lat: 17.385,
    lng: 78.4867,
    type: "Warehouse",
  },
];

// GET nearest mandis based on user location
router.get("/nearest", (req, res) => {
  try {
    const { lat, lng, type } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: "Invalid latitude or longitude" });
    }

    let filteredMandis = mandiList;

    if (type && type !== "All") {
      filteredMandis = mandiList.filter((m) => m.type === type);
    }

    const sortedMandis = filteredMandis
      .map((mandi) => ({
        ...mandi,
        distance: parseFloat(
          getDistance(userLat, userLng, mandi.lat, mandi.lng).toFixed(1),
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    res.json(sortedMandis);
  } catch (error) {
    console.error("Error in /nearest:", error.message);
    res.status(500).json({ error: "Failed to fetch mandis" });
  }
});

// GET mandi prices from data.gov.in API
router.get("/prices", async (req, res) => {
  try {
    const apiKey = process.env.MANDI_API_KEY; // ✅ Fixed: matches your .env
    const { state, commodity } = req.query;

    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }

    const response = await axios.get(
      `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070`,
      {
        params: {
          "api-key": apiKey,
          format: "json",
          limit: 50,
          ...(state && { "filters[state.keyword]": state }),
          ...(commodity && { "filters[commodity]": commodity }),
        },
      },
    );

    if (!response.data || !response.data.records) {
      return res.status(404).json({ error: "No records found" });
    }

    res.json(response.data.records);
  } catch (error) {
    console.error("Error in /prices:", error.message);
    res.status(500).json({ error: "Failed to fetch mandi prices" });
  }
});

module.exports = router;
