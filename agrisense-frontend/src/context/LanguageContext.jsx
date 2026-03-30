import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ── Static translations (fallback + instant load) ─────────────────────
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
    locationAccess: "Allow location for better predictions",
    gettingLocation: "Getting your location…",
    locationGranted: "Location acquired",
    locationDenied: "Location denied — using default",
    storageComparison: "Storage Comparison",
    spoilageProb: "Spoilage Probability",
    refrigerated: "If Refrigerated",
    roomTemp: "Room Temperature",
    highRisk: "High Risk",
    mediumRisk: "Medium Risk",
    lowRisk: "Low Risk",
    fetchingPest: "Analyzing pest risk…",
    loadingPrices: "Loading price forecast…",
    bestSellDay: "Best day to sell",
    peakPrice: "Peak Price",
    lowestPrice: "Lowest Price",
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
    locationAccess: "बेहतर पूर्वानुमान के लिए स्थान की अनुमति दें",
    gettingLocation: "आपका स्थान प्राप्त हो रहा है…",
    locationGranted: "स्थान प्राप्त हो गया",
    locationDenied: "स्थान अस्वीकृत — डिफ़ॉल्ट उपयोग हो रहा है",
    storageComparison: "भंडारण तुलना",
    spoilageProb: "खराबी संभावना",
    refrigerated: "अगर फ्रिज में रखें",
    roomTemp: "सामान्य तापमान",
    highRisk: "उच्च जोखिम",
    mediumRisk: "मध्यम जोखिम",
    lowRisk: "कम जोखिम",
    fetchingPest: "कीट जोखिम विश्लेषण…",
    loadingPrices: "मूल्य पूर्वानुमान लोड हो रहा है…",
    bestSellDay: "बेचने का सबसे अच्छा दिन",
    peakPrice: "सर्वोच्च मूल्य",
    lowestPrice: "न्यूनतम मूल्य",
  },
  mr: {
    appName: "एग्रीसेन्स",
    tagline: "भारतीय शेतकऱ्यांसाठी स्मार्ट पिक बुद्धिमत्ता",
    home: "मुख्यपृष्ठ",
    analyze: "पिकाचे विश्लेषण",
    simulator: "सिम्युलेटर",
    map: "बाजार नकाशा",
    market: "बाजार भाव",
    pestRisk: "कीड धोका",
    uploadImage: "प्रतिमा अपलोड करा",
    capturePhoto: "फोटो घ्या",
    dropImage: "येथे प्रतिमा टाका किंवा ब्राउझ करा",
    analyzing: "विश्लेषण होत आहे…",
    analyze_btn: "पिकाचे विश्लेषण करा",
    cropType: "पिकाचा प्रकार",
    freshness: "ताजेपणा",
    confidence: "विश्वास गुण",
    spoilageDays: "खराब होण्यास",
    days: "दिवस",
    pestDetected: "कीड आढळली",
    diseaseDetected: "रोग आढळला",
    recommendations: "शिफारसी",
    temperature: "तापमान (°C)",
    humidity: "आर्द्रता (%)",
    storageType: "साठवणूक प्रकार",
    room: "खोलीचे तापमान",
    cold: "शीत साठवण",
    freezer: "फ्रीजर",
    controlled: "नियंत्रित वातावरण",
    simulate: "सिम्युलेट करा",
    simulating: "सिम्युलेट होत आहे…",
    updatedSpoilage: "अद्यतनित खराबी अंदाज",
    nearbyMandis: "जवळील बाजार",
    coldStorage: "शीत साठवण",
    priceChart: "किंमत अंदाज (14 दिवस)",
    bestSellTime: "विकण्याची सर्वोत्तम वेळ",
    currentPrice: "सध्याची किंमत",
    selectCrop: "पीक निवडा",
    riskLevel: "धोका पातळी",
    pestProbability: "कीड शक्यता",
    pestTypes: "संभाव्य कीड",
    noImage: "कृपया आधी एक प्रतिमा अपलोड किंवा कॅप्चर करा",
    offline: "तुम्ही ऑफलाइन आहात — कॅश डेटा दाखवत आहे",
    fileLimit: "जास्तीत जास्त 10 MB · JPG, PNG, WebP",
    locationAccess: "चांगल्या अंदाजासाठी स्थान परवानगी द्या",
    gettingLocation: "तुमचे स्थान मिळवत आहे…",
    locationGranted: "स्थान मिळाले",
    locationDenied: "स्थान नाकारले — डीफॉल्ट वापरत आहे",
    storageComparison: "साठवणूक तुलना",
    spoilageProb: "खराबी शक्यता",
    refrigerated: "फ्रिजमध्ये ठेवल्यास",
    roomTemp: "खोलीचे तापमान",
    highRisk: "उच्च धोका",
    mediumRisk: "मध्यम धोका",
    lowRisk: "कमी धोका",
    fetchingPest: "कीड धोका विश्लेषण…",
    loadingPrices: "किंमत अंदाज लोड होत आहे…",
    bestSellDay: "विकण्याचा सर्वोत्तम दिवस",
    peakPrice: "सर्वोच्च किंमत",
    lowestPrice: "सर्वात कमी किंमत",
  },
};

const LANG_OPTIONS = [
  { code: "en", label: "English",  native: "English" },
  { code: "hi", label: "Hindi",    native: "हिंदी" },
  { code: "mr", label: "Marathi",  native: "मराठी" },
];

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem("agrisense_lang") || "en"
  );
  const [dynamicTranslations, setDynamicTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);

  // t() — returns static translation first, then dynamic (API) override
  const t = useCallback(
    (key) => dynamicTranslations[key] ?? T[lang]?.[key] ?? T["en"]?.[key] ?? key,
    [lang, dynamicTranslations]
  );

  // Change language and optionally call translation API
  const setLanguage = useCallback(async (code) => {
    setLang(code);
    localStorage.setItem("agrisense_lang", code);
    setDynamicTranslations({}); // clear old dynamic translations

    // If not English, try to get API translations to fill any gaps
    if (code !== "en") {
      try {
        setIsTranslating(true);
        // Get keys that need translation (ones not in static dict)
        const keysToTranslate = Object.keys(T.en);
        const textsToTranslate = keysToTranslate.map(k => T.en[k]);

        const resp = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            texts: textsToTranslate,
            target_language: code,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.translations && data.source === "google") {
            // Only use API translations for keys missing from static dict
            const apiDict = {};
            keysToTranslate.forEach((key, i) => {
              // Only override if static dict doesn't have it
              if (!T[code]?.[key]) {
                apiDict[key] = data.translations[i];
              }
            });
            setDynamicTranslations(apiDict);
          }
        }
      } catch {
        // Silent fallback to static translations
      } finally {
        setIsTranslating(false);
      }
    }
  }, []);

  // Cycle: en → hi → mr → en
  const toggle = useCallback(() => {
    const order = ["en", "hi", "mr"];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLanguage(next);
  }, [lang, setLanguage]);

  // Label for the toggle button
  const nextLangLabel = {
    en: "हिंदी",
    hi: "मराठी",
    mr: "English",
  }[lang];

  return (
    <LanguageContext.Provider
      value={{ lang, t, toggle, setLanguage, nextLangLabel, isTranslating, LANG_OPTIONS }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
