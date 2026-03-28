import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import { useLang } from "../context/LanguageContext";
import { useApp } from "../context/AppContext";
import { getNearbyLocations } from "../services/api";
import { saveToCache, getFromCache } from "../utils/offline";

// Fix Leaflet icon paths broken by Vite bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const colorIcon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

const ICONS = { user: "red", mandi: "green", cold_storage: "blue" };

const TABS = [
  { value: "all", label: "📍 All" },
  { value: "mandi", label: "🏪 Mandis" },
  { value: "cold_storage", label: "❄️ Cold Storage" },
];

export default function MapPage() {
  const { t } = useLang();
  const { userLocation, isOnline } = useApp();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const KEY = "nearby_locations";
    const cached = getFromCache(KEY);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
    if (!isOnline && cached) return;

    setLoading(true);
    getNearbyLocations(userLocation.lat, userLocation.lon)
      .then((res) => {
        setData(res.data);
        saveToCache(KEY, res.data);
      })
      .catch(() => {
        if (!cached) setError("Could not load nearby locations.");
      })
      .finally(() => setLoading(false));
  }, [userLocation, isOnline]);

  const locations = data
    ? [...(data.mandis || []), ...(data.coldStorages || [])].filter(
        (l) => tab === "all" || l.type === tab,
      )
    : [];

  const center = [userLocation.lat, userLocation.lon];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">🗺️ {t("map")}</h1>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((tb) => (
          <button
            key={tb.value}
            onClick={() => setTab(tb.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${
                tab === tb.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-primary"
              }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card text-center py-12 text-gray-500">
          <div className="text-5xl mb-3 animate-pulse">🗺️</div>
          <p>Finding nearby locations…</p>
        </div>
      )}

      {error && !data && (
        <div className="card text-center text-red-600 py-8">{error}</div>
      )}

      {data && (
        <>
          {/* Map */}
          <div
            className="rounded-2xl overflow-hidden shadow border border-gray-200"
            style={{ height: 420 }}
          >
            <MapContainer
              center={center}
              zoom={12}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* User marker */}
              <Marker position={center} icon={colorIcon(ICONS.user)}>
                <Popup>
                  <strong>📍 Your Location</strong>
                </Popup>
              </Marker>
              <Circle
                center={center}
                radius={25000}
                color="#16a34a"
                fillColor="#16a34a"
                fillOpacity={0.05}
              />

              {/* Location markers */}
              {locations.map((loc) => (
                <Marker
                  key={loc.id}
                  position={[loc.lat, loc.lon]}
                  icon={colorIcon(ICONS[loc.type])}
                >
                  <Popup>
                    <div className="space-y-1 text-sm min-w-[160px]">
                      <div className="font-bold text-gray-800">{loc.name}</div>
                      <div className="text-gray-500">{loc.address}</div>
                      {loc.rating && <div>⭐ {loc.rating} / 5</div>}
                      <span
                        className={`text-xs font-semibold
                        ${loc.type === "mandi" ? "text-green-600" : "text-blue-600"}`}
                      >
                        {loc.type === "mandi" ? "🏪 Mandi" : "❄️ Cold Storage"}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Location Cards */}
          {locations.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl shrink-0">
                      {loc.type === "mandi" ? "🏪" : "❄️"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {loc.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {loc.address}
                      </p>
                      {loc.rating && (
                        <div className="text-sm text-yellow-500 mt-1">
                          {"★".repeat(Math.round(loc.rating))}
                          {"☆".repeat(5 - Math.round(loc.rating))}
                          <span className="text-gray-400 text-xs ml-1">
                            {loc.rating}
                          </span>
                        </div>
                      )}
                      <span
                        className={`text-xs font-medium mt-2 inline-block px-2 py-0.5 rounded-full
                        ${
                          loc.type === "mandi"
                            ? "bg-green-100 text-green-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {loc.type === "mandi" ? "Mandi" : "Cold Storage"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center text-gray-500 py-8">
              No locations found for this filter.
            </div>
          )}

          {/* Weather Widget */}
          {data.weather && (
            <div className="card bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-100">
              <h3 className="font-semibold text-gray-700 mb-4">
                🌤️ Current Weather — {data.weather.location}
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  {
                    value: `${data.weather.temperature}°C`,
                    label: "Temperature",
                    icon: "🌡️",
                  },
                  {
                    value: `${data.weather.humidity}%`,
                    label: "Humidity",
                    icon: "💧",
                  },
                  {
                    value: `${data.weather.windSpeed} m/s`,
                    label: "Wind Speed",
                    icon: "💨",
                  },
                ].map((w) => (
                  <div
                    key={w.label}
                    className="bg-white rounded-xl p-3 shadow-sm"
                  >
                    <div className="text-xl mb-1">{w.icon}</div>
                    <div className="text-xl font-bold text-gray-800">
                      {w.value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{w.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
