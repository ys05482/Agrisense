import React from "react";
import { useApp } from "../../context/AppContext";
import { useLang } from "../../context/LanguageContext";

export default function LocationBanner() {
  const { locationStatus, userLocation, weather, requestLocation } = useApp();
  const { t } = useLang();

  if (locationStatus === "idle") return null;

  if (locationStatus === "asking") {
    return (
      <div className="bg-blue-50 border-b border-blue-100 text-blue-800 text-center py-2 px-4 text-sm">
        <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent
                         rounded-full animate-spin mr-2 align-middle" />
        {t("gettingLocation")}
      </div>
    );
  }

  if (locationStatus === "denied") {
    return (
      <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-center py-2 px-4 text-sm">
        📍 {t("locationDenied")} —&nbsp;
        <button onClick={requestLocation} className="underline font-medium hover:text-amber-900">
          {t("locationAccess")}
        </button>
      </div>
    );
  }

  if (locationStatus === "granted" && weather) {
    return (
      <div className="bg-green-50 border-b border-green-100 text-green-800 text-center py-2 px-4 text-sm">
        📍 {weather.city} &nbsp;·&nbsp; 🌡️ {weather.temperature}°C &nbsp;·&nbsp;
        💧 {weather.humidity}% &nbsp;·&nbsp; {weather.description}
      </div>
    );
  }

  return null;
}
