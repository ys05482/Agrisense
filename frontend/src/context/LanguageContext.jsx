import React, { createContext, useContext, useState } from "react";

const T = {
  en: {
    appName: "AgriSense",
    tagline: "Smart Crop Intelligence for Indian Farmers",
    home: "Home",
    analyze: "Analyze Crop",
    simulator: "Simulator",
    map: "Market Map",
    market: "Market Prices",
    pestRisk: "Pest Risk",
    uploadImage: "Upload Image",
    capturePhoto: "Capture Photo",
    dropImage: "Drop image here or click to browse",
    analyzing: "Analyzing…",
    analyze_btn: "Analyze Crop",
    cropType: "Crop Type",
    freshness: "Freshness",
    confidence: "Confidence",
    spoilageDays: "Spoilage in",
    days: "days",
    pestDetected: "Pest Detected",
    diseaseDetected: "Disease Detected",
    recommendations: "Recommendations",
    temperature: "Temperature (°C)",
    humidity: "Humidity (%)",
    storageType: "Storage Type",
    room: "Room Temp",
    cold: "Cold Storage",
    freezer: "Freezer",
    controlled: "Controlled Atm.",
    simulate: "Simulate",
    simulating: "Simulating…",
    updatedSpoilage: "Updated Spoilage Estimate",
    nearbyMandis: "Nearby Mandis",
    coldStorage: "Cold Storage",
    priceChart: "Price Forecast (14 days)",
    bestSellTime: "Best Sell Time",
    currentPrice: "Current Price",
    selectCrop: "Select Crop",
    riskLevel: "Risk Level",
    pestProbability: "Pest Probability",
    pestTypes: "Potential Pests",
    noImage: "Please upload or capture an image first",
    offline: "You are offline — showing cached data",
    fileLimit: "Max 10 MB · JPG, PNG, WebP",
  },
  hi: {
    appName: "एग्रीसेंस",
    tagline: "भारतीय किसानों के लिए स्मार्ट फसल विश्लेषण",
    home: "होम",
    analyze: "फसल विश्लेषण",
    simulator: "सिमुलेटर",
    map: "बाज़ार मानचित्र",
    market: "बाज़ार भाव",
    pestRisk: "कीट जोखिम",
    uploadImage: "छवि अपलोड करें",
    capturePhoto: "फोटो लें",
    dropImage: "यहाँ छवि खींचें या ब्राउज़ करें",
    analyzing: "विश्लेषण हो रहा है…",
    analyze_btn: "फसल विश्लेषण करें",
    cropType: "फसल प्रकार",
    freshness: "ताजगी",
    confidence: "विश्वास स्कोर",
    spoilageDays: "खराब होने में",
    days: "दिन",
    pestDetected: "कीट मिला",
    diseaseDetected: "रोग मिला",
    recommendations: "सुझाव",
    temperature: "तापमान (°C)",
    humidity: "आर्द्रता (%)",
    storageType: "भंडारण प्रकार",
    room: "सामान्य तापमान",
    cold: "शीत भंडार",
    freezer: "फ्रीजर",
    controlled: "नियंत्रित वातावरण",
    simulate: "सिमुलेट करें",
    simulating: "सिमुलेट हो रहा है…",
    updatedSpoilage: "अनुमानित खराबी",
    nearbyMandis: "नजदीकी मंडियाँ",
    coldStorage: "शीत भंडारण",
    priceChart: "मूल्य पूर्वानुमान (14 दिन)",
    bestSellTime: "बेचने का सबसे अच्छा समय",
    currentPrice: "वर्तमान भाव",
    selectCrop: "फसल चुनें",
    riskLevel: "जोखिम स्तर",
    pestProbability: "कीट संभावना",
    pestTypes: "संभावित कीट",
    noImage: "कृपया पहले एक छवि अपलोड या कैप्चर करें",
    offline: "आप ऑफलाइन हैं — कैश डेटा दिखाया जा रहा है",
    fileLimit: "अधिकतम 10 MB · JPG, PNG, WebP",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem("agrisense_lang") || "en",
  );
  const t = (key) => T[lang][key] ?? key;
  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("agrisense_lang", next);
  };
  return (
    <LanguageContext.Provider value={{ lang, t, toggle }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
