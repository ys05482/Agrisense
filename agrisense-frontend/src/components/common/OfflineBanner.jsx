import React from "react";
import { useApp } from "../../context/AppContext";
import { useLang } from "../../context/LanguageContext";

export default function OfflineBanner() {
  const { isOnline } = useApp();
  const { t } = useLang();
  if (isOnline) return null;
  return (
    <div className="bg-amber-400 text-amber-900 text-center py-2 px-4 text-sm font-medium">
      📡 {t("offline")}
    </div>
  );
}
