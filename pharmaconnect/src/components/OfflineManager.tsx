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
      className="fixed inset-x-0 bottom-0 z-[1002] animate-slideUp motion-reduce:animate-none"
    >
      <div className="mx-auto mb-[calc(0.75rem+env(safe-area-inset-bottom))] flex w-[calc(100%-1.5rem)] max-w-md items-center gap-2.5 rounded-2xl border border-amber-500/25 bg-surface px-4 py-3 text-sm shadow-overlay">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 text-fg-muted">{t("offline.banner")}</p>
        <a
          href="/offline"
          className="shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          {t("offline.retry")}
        </a>
      </div>
    </div>
  );
}
