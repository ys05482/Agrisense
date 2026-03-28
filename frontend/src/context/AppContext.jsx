import React, { createContext, useContext, useState, useEffect } from "react";
import { saveToCache, getFromCache } from "../utils/offline";

const AppContext = createContext();

export function AppProvider({ children }) {
  const [prediction, setPrediction] = useState(null);
  const [predictionId, setPredictionId] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userLocation, setUserLocation] = useState({
    lat: 28.6139,
    lon: 77.209,
  }); // Default: Delhi

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Try to get real location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setUserLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
          }),
        () => {}, // silently fall back to Delhi
      );
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Cache last prediction for offline access
  useEffect(() => {
    if (prediction)
      saveToCache("last_prediction", { prediction, predictionId });
  }, [prediction, predictionId]);

  // Restore from cache when offline
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
        prediction,
        setPrediction,
        predictionId,
        setPredictionId,
        simulation,
        setSimulation,
        userLocation,
        isOnline,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
