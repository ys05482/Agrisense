const axios = require("axios");

const MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPS_BASE_URL =
  "https://maps.googleapis.com/maps/api/place/nearbysearch/json";

// ── Get Nearby Agricultural Locations ───────────────────────
async function getNearbyAgriLocations(lat, lon, radius = 25000) {
  if (!MAPS_API_KEY) {
    console.warn("⚠️  GOOGLE_MAPS_API_KEY not set, using mock data");
    return _mockLocations(lat, lon);
  }

  try {
    const [mandisData, coldStoragesData] = await Promise.all([
      axios.get(MAPS_BASE_URL, {
        params: {
          location: `${lat},${lon}`,
          radius,
          keyword: "vegetable mandi market",
          key: MAPS_API_KEY,
        },
        timeout: 10000,
      }),
      axios.get(MAPS_BASE_URL, {
        params: {
          location: `${lat},${lon}`,
          radius,
          keyword: "cold storage warehouse",
          key: MAPS_API_KEY,
        },
        timeout: 10000,
      }),
    ]);

    const mandis = mandisData.data.results
      .slice(0, 5)
      .map((p) => _formatLocation(p, "mandi"));
    const coldStorages = coldStoragesData.data.results
      .slice(0, 5)
      .map((p) => _formatLocation(p, "cold_storage"));

    return { mandis, coldStorages, success: true };
  } catch (err) {
    console.error("Maps API error:", err.message);
    return _mockLocations(lat, lon);
  }
}

// ── Format Location Data ────────────────────────────────────
function _formatLocation(place, type) {
  return {
    id: place.place_id,
    name: place.name,
    address: place.vicinity,
    rating: place.rating || null,
    openNow: place.opening_hours?.open_now || null,
    latitude: place.geometry.location.lat,
    longitude: place.geometry.location.lng,
    type,
    distance: "N/A",
  };
}

// ── Mock Locations ──────────────────────────────────────────
function _mockLocations(lat, lon) {
  const offset = () => (Math.random() - 0.5) * 0.1;

  return {
    mandis: [
      {
        id: "m1",
        name: "Azadpur Mandi",
        address: "Azadpur, Delhi",
        rating: 4.1,
        openNow: true,
        latitude: lat + offset(),
        longitude: lon + offset(),
        type: "mandi",
        distance: "2.5 km",
      },
      {
        id: "m2",
        name: "Okhla Sabzi Mandi",
        address: "Okhla, Delhi",
        rating: 3.9,
        openNow: true,
        latitude: lat + offset(),
        longitude: lon + offset(),
        type: "mandi",
        distance: "5.2 km",
      },
      {
        id: "m3",
        name: "Ghazipur Mandi",
        address: "Ghazipur, Delhi",
        rating: 4.2,
        openNow: false,
        latitude: lat + offset(),
        longitude: lon + offset(),
        type: "mandi",
        distance: "7.8 km",
      },
    ],
    coldStorages: [
      {
        id: "c1",
        name: "Snowflake Cold Storage",
        address: "Sector 12, Noida",
        rating: 4.5,
        openNow: true,
        latitude: lat + offset(),
        longitude: lon + offset(),
        type: "cold_storage",
        distance: "8.3 km",
      },
      {
        id: "c2",
        name: "AgroFreeze Pvt Ltd",
        address: "Narela, Delhi",
        rating: 4.0,
        openNow: true,
        latitude: lat + offset(),
        longitude: lon + offset(),
        type: "cold_storage",
        distance: "12.1 km",
      },
    ],
    success: true,
  };
}

module.exports = {
  getNearbyAgriLocations,
};
