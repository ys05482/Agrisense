import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons for different types
const mandiIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const userIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Component to recenter map
function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 10);
    }
  }, [lat, lng]);
  return null;
}

const MapPage = () => {
  const [userLocation, setUserLocation] = useState({
    lat: 20.5937,
    lng: 78.9629,
  });
  const [mandis, setMandis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [locationGranted, setLocationGranted] = useState(false);
  const [error, setError] = useState(null);

  // Fetch nearest mandis from backend
  const fetchNearestMandis = useCallback(async (lat, lng, type) => {
    try {
      setError(null);
      const params = { lat, lng };
      if (type !== "All") params.type = type;

      const response = await axios.get(
        `http://localhost:5000/api/mandi/nearest`,
        { params },
      );
      setMandis(response.data);
    } catch (err) {
      console.error("Error fetching mandis:", err);
      setError("Could not load nearby mandis. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user's current location
  const getUserLocation = useCallback(() => {
    setLoading(true);
    setError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLocationGranted(true);
          fetchNearestMandis(latitude, longitude, activeFilter);
        },
        (error) => {
          console.error("Location error:", error);
          setError("Please enable location access to find nearby mandis.");
          setLoading(false);
        },
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, [activeFilter, fetchNearestMandis]);

  // Handle filter change
  const handleFilterChange = (type) => {
    setActiveFilter(type);
    if (locationGranted) {
      setLoading(true);
      fetchNearestMandis(userLocation.lat, userLocation.lng, type);
    }
  };

  // Get location on component mount
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  return (
    <div className="market-map-container">
      <h1>📍 Market Map</h1>

      {/* Filter Buttons */}
      <div className="filter-buttons">
        {["All", "Mandi", "Cold Storage", "Warehouse"].map((type) => (
          <button
            key={type}
            className={activeFilter === type ? "active" : ""}
            onClick={() => handleFilterChange(type)}
          >
            {type}
          </button>
        ))}
        <button onClick={getUserLocation} className="location-btn">
          📍 Your Location
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p style={{ color: "red", marginTop: "8px", fontWeight: "500" }}>
          ⚠️ {error}
        </p>
      )}

      {/* Map */}
      <div className="map-wrapper" style={{ height: "400px", width: "100%" }}>
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />

          {/* User Location Marker */}
          {locationGranted && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            >
              <Popup>📍 Your Location</Popup>
            </Marker>
          )}

          {/* Mandi Markers */}
          {mandis.map((mandi, index) => (
            <Marker
              key={mandi.id ?? index}
              position={[mandi.lat, mandi.lng]}
              icon={mandiIcon}
            >
              <Popup>
                <strong>{mandi.name}</strong>
                <br />
                {mandi.city}
                <br />
                <span style={{ color: "green" }}>
                  {mandi.distance.toFixed(1)} km away
                </span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Mandi Cards List */}
      <div className="mandi-cards">
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <div className="spinner" />
            <p>Loading nearest mandis...</p>
          </div>
        ) : mandis.length === 0 && !error ? (
          <p style={{ textAlign: "center", color: "#888", marginTop: "16px" }}>
            No mandis found nearby. Try a different filter.
          </p>
        ) : (
          mandis.map((mandi, index) => (
            <div key={mandi.id ?? index} className="mandi-card">
              <span className="type-badge">{mandi.type}</span>
              <h3>{mandi.name}</h3>
              <p>📍 {mandi.city}</p>
              <p>🚗 {mandi.distance.toFixed(1)} km away</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MapPage;
