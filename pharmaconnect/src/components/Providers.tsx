"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "next-auth";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LiteModeProvider } from "@/hooks/useLiteMode";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";
type SignOutOptions = { callbackUrl?: string };
type SessionContextValue = {
  data: Session | null;
  status: SessionStatus;
  update: () => Promise<Session | null>;
  signOut: (options?: SignOutOptions) => Promise<void>;
};

type ToastKind = "default" | "success" | "error";
type ToastOptions = { icon?: React.ReactNode };
type ToastItem = ToastOptions & { id: number; message: string; kind: ToastKind };
type ToastFunction = {
  (message: string, options?: ToastOptions): void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);
const TOAST_EVENT = "pharmaconnect:toast";
let nextToastId = 0;

function showToast(message: string, kind: ToastKind, options: ToastOptions = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ToastItem>(TOAST_EVENT, {
      detail: { id: ++nextToastId, message, kind, ...options },
    })
  );
}

export const appToast: ToastFunction = Object.assign(
  (message: string, options?: ToastOptions) => showToast(message, "default", options),
  {
    success: (message: string, options?: ToastOptions) => showToast(message, "success", options),
    error: (message: string, options?: ToastOptions) => showToast(message, "error", options),
  }
);

function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const timers = new Set<number>();
    const handleToast = (event: Event) => {
      const item = (event as CustomEvent<ToastItem>).detail;
      setToasts((current) => [...current, item].slice(-4));
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== item.id));
        timers.delete(timer);
      }, 4000);
      timers.add(timer);
    };
    window.addEventListener(TOAST_EVENT, handleToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleToast);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <div className="fixed top-4 left-1/2 z-[1001] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2" aria-live="polite">
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.kind === "error" ? "alert" : "status"}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            item.kind === "error" ? "bg-red-700" : "bg-primary-700"
          }`}
        >
          {item.icon && <span aria-hidden="true">{item.icon}</span>}
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

function AppSessionProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const update = useCallback(async (): Promise<Session | null> => {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) throw new Error("Session request failed");
      const session = (await response.json()) as Session | null;
      const nextData = session?.user ? session : null;
      setData(nextData);
      setStatus(nextData ? "authenticated" : "unauthenticated");
      return nextData;
    } catch {
      setData(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  const signOut = useCallback(async ({ callbackUrl = "/" }: SignOutOptions = {}) => {
    const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
    if (!csrfResponse.ok) throw new Error("Unable to start sign out");
    const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
    const response = await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csrfToken, callbackUrl }),
    });
    if (!response.ok) throw new Error("Unable to sign out");
    window.location.assign(callbackUrl);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void update();
    });
    const refresh = () => void update();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, [update]);

  const value = useMemo(() => ({ data, status, update, signOut }), [data, status, update, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within AppSessionProvider");
  return context;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppSessionProvider>
      <ThemeProvider>
        <LiteModeProvider>
          {children}
          <ToastViewport />
        </LiteModeProvider>
      </ThemeProvider>
    </AppSessionProvider>
  );
}
