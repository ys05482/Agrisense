const axios = require("axios");

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ── Get Weather by Coordinates ──────────────────────────────
async function getWeatherByCoords(lat, lon) {
  if (!API_KEY) {
    console.warn("⚠️  OPENWEATHER_API_KEY not set, using mock data");
    return _mockWeather();
  }

  try {
    const { data } = await axios.get(`${BASE_URL}/weather`, {
      params: {
        lat,
        lon,
        appid: API_KEY,
        units: "metric",
      },
      timeout: 10000,
    });

    return _formatWeatherData(data);
  } catch (err) {
    console.error("Weather API error:", err.message);
    return _mockWeather();
  }
}

// ── Get Weather by City ─────────────────────────────────────
async function getWeatherByCity(city) {
  if (!API_KEY) {
    console.warn("⚠️  OPENWEATHER_API_KEY not set, using mock data");
    return _mockWeather();
  }

  try {
    const { data } = await axios.get(`${BASE_URL}/weather`, {
      params: {
        q: city,
        appid: API_KEY,
        units: "metric",
      },
      timeout: 10000,
    });

    return _formatWeatherData(data);
  } catch (err) {
    console.error("Weather API error:", err.message);
    return _mockWeather();
  }
}

// ── Format Weather Data ─────────────────────────────────────
function _formatWeatherData(data) {
  return {
    temperature: data.main.temp,
    feelsLike: data.main.feels_like,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    windSpeed: data.wind.speed,
    windDegree: data.wind.deg,
    cloudiness: data.clouds.all,
    location: `${data.name}, ${data.sys.country}`,
    latitude: data.coord.lat,
    longitude: data.coord.lon,
    sunrise: new Date(data.sys.sunrise * 1000),
    sunset: new Date(data.sys.sunset * 1000),
  };
}

// ── Mock Weather Data ───────────────────────────────────────
function _mockWeather() {
  return {
    temperature: 28 + Math.random() * 8,
    feelsLike: 31 + Math.random() * 8,
    humidity: 65 + Math.random() * 25,
    pressure: 1013,
    description: "partly cloudy",
    icon: "02d",
    windSpeed: 3 + Math.random() * 4,
    windDegree: Math.random() * 360,
    cloudiness: 40 + Math.random() * 40,
    location: "Delhi, IN",
    latitude: 28.6139,
    longitude: 77.209,
    sunrise: new Date(new Date().getTime() - 6 * 60 * 60 * 1000),
    sunset: new Date(new Date().getTime() + 6 * 60 * 60 * 1000),
  };
}

module.exports = {
  getWeatherByCoords,
  getWeatherByCity,
};
