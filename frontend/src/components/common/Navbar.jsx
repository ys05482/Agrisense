import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useLang } from "../../context/LanguageContext";

export default function Navbar() {
  const { t, lang, toggle } = useLang();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("home"), end: true },
    { to: "/analyze", label: t("analyze") },
    { to: "/simulate", label: t("simulator") },
    { to: "/map", label: t("map") },
    { to: "/market", label: t("market") },
    { to: "/pest-risk", label: t("pestRisk") },
  ];

  const cls = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary text-white"
        : "text-gray-600 hover:text-primary hover:bg-green-50"
    }`;

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🌾</span>
            <span className="font-bold text-primary text-lg hidden sm:block">
              {t("appName")}
            </span>
          </NavLink>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={cls}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              className="text-sm border border-primary text-primary px-3 py-1.5 rounded-full
                         font-medium hover:bg-green-50 transition shrink-0"
            >
              {lang === "en" ? "हिंदी" : "English"}
            </button>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 text-xl"
              aria-label="Toggle menu"
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {open && (
          <div className="lg:hidden pb-4 flex flex-col gap-1 border-t border-gray-100 pt-3">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={cls}
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
