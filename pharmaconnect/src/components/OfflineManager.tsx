"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useLocale } from "@/components/LocaleProvider";

/**
 * Registers the service worker (production only) and shows the offline banner.
 * Kept out of the critical path — no impact on first paint in lite mode.
 */
export default function OfflineManager() {
  const { t } = useLocale();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration failure must never break the app.
      });
    };

    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[1002] -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-3 text-sm font-medium text-white shadow-xl"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("offline.banner")}</span>
    </div>
  );
}
