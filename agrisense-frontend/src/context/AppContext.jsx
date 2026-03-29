import React, { createContext, useContext, useState, useEffect } from "react";
import { saveToCache, getFromCache } from "../utils/offline";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [prediction,    setPrediction]    = useState(null);
  const [predictionId,  setPredictionId]  = useState(null);
  const [simulation,    setSimulation]    = useState(null);
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [weather,       setWeather]       = useState(null);
  const [locationStatus,setLocationStatus]= useState("idle"); // idle | asking | granted | denied
  const [userLocation,  setUserLocation]  = useState({
    lat: 28.6139,
    lon: 77.209,
    city: "Delhi",
  });

  // ── Online/Offline listener ─────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Ask for location on mount ───────────────────────────────────────
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("asking");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(prev => ({ ...prev, ...loc }));
        setLocationStatus("granted");

        // Fetch weather for location
        try {
          const resp = await fetch(
            `/api/weather?lat=${loc.lat}&lon=${loc.lon}`
          );
          if (resp.ok) {
            const w = await resp.json();
            setWeather(w);
            setUserLocation({ lat: loc.lat, lon: loc.lon, city: w.city || "Unknown" });
          }
        } catch {}
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  };

  // ── Cache last prediction ───────────────────────────────────────────
  useEffect(() => {
    if (prediction)
      saveToCache("last_prediction", { prediction, predictionId });
  }, [prediction, predictionId]);

  useEffect(() => {
    if (!isOnline) {
      const cached = getFromCache("last_prediction");
      if (cached && !prediction) {
        setPrediction(cached.prediction);
        setPredictionId(cached.predictionId);
      }
    }
  }, [isOnline]);

  return (
    <AppContext.Provider
      value={{
        prediction, setPrediction,
        predictionId, setPredictionId,
        simulation, setSimulation,
        userLocation, setUserLocation,
        weather, setWeather,
        locationStatus, requestLocation,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
