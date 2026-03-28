import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

export async function uploadImage(file, lat, lon) {
  const form = new FormData();
  form.append("image", file);
  if (lat) form.append("lat", lat);
  if (lon) form.append("lon", lon);
  const { data } = await api.post("/upload-image", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getPrediction(id) {
  const { data } = await api.get(`/predict-spoilage/${id}`);
  return data;
}

export async function getPestRisk(cropType, lat, lon) {
  const { data } = await api.post("/pest-risk", { cropType, lat, lon });
  return data;
}

export async function runSimulation(payload) {
  const { data } = await api.post("/simulate", payload);
  return data;
}

export async function getMarketPrices(crop, days = 14) {
  const { data } = await api.get("/market-prices", { params: { crop, days } });
  return data;
}

export async function getNearbyLocations(lat, lon) {
  const { data } = await api.get("/nearby-locations", { params: { lat, lon } });
  return data;
}
