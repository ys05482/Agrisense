import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/common/Navbar";
import OfflineBanner from "./components/common/OfflineBanner";
import HomePage from "./pages/HomePage";
import AnalyzePage from "./pages/AnalyzePage";
import SimulatorPage from "./pages/SimulatorPage";
import MapPage from "./pages/MapPage";
import MarketPage from "./pages/MarketPage";
import PestRiskPage from "./pages/PestRiskPage";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <OfflineBanner />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/simulate" element={<SimulatorPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/market" element={<MarketPage />} />
          <Route path="/pest-risk" element={<PestRiskPage />} />
        </Routes>
      </main>
    </div>
  );
}
