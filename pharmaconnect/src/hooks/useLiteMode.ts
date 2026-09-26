"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "pharmaconnect_lite_mode";
const SLOW_CONNECTION_TYPES = new Set(["slow-2g", "2g"]);

type NetworkConnection = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
};

type LiteModeRecommendation = {
  saveData: boolean;
  effectiveType?: string;
  smallScreen: boolean;
};

type LiteModeState = {
  lite: boolean;
  manual: boolean | null;
  ready: boolean;
};

type LiteModeContextValue = LiteModeState & {
  setMode: (value: boolean) => void;
};

const LiteModeContext = createContext<LiteModeContextValue | undefined>(undefined);

export function parseLiteModePreference(value: string | null): boolean | null {
  if (value === "1") return true;
  if (value === "0") return false;
  return null;
}

export function shouldUseLiteMode({ saveData, effectiveType, smallScreen }: LiteModeRecommendation): boolean {
  return saveData || SLOW_CONNECTION_TYPES.has(effectiveType ?? "") || smallScreen;
}

function getConnection(): NetworkConnection | undefined {
  const nav = navigator as NavigatorWithConnection;
  return nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
}

function readManualMode(): boolean | null {
  try {
    return parseLiteModePreference(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function getRecommendedMode(): boolean {
  const connection = getConnection();
  return shouldUseLiteMode({
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType,
    smallScreen: window.matchMedia?.("(max-width: 640px)").matches === true,
  });
}

export function LiteModeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LiteModeState>({ lite: false, manual: null, ready: false });

  useEffect(() => {
    const connection = getConnection();
    const smallScreen = window.matchMedia?.("(max-width: 640px)");

    const updateAutomaticMode = () => {
      setState((current) => {
        if (current.manual !== null) return current;
        return { lite: getRecommendedMode(), manual: null, ready: true };
      });
    };

    const updateStoredMode = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const manual = event.key === STORAGE_KEY ? parseLiteModePreference(event.newValue) : null;
      setState({ lite: manual ?? getRecommendedMode(), manual, ready: true });
    };

    let active = true;
    const initialManual = readManualMode();
    queueMicrotask(() => {
      if (!active) return;
      setState({ lite: initialManual ?? getRecommendedMode(), manual: initialManual, ready: true });
    });
    connection?.addEventListener("change", updateAutomaticMode);
    smallScreen?.addEventListener("change", updateAutomaticMode);
    window.addEventListener("storage", updateStoredMode);

    return () => {
      active = false;
      connection?.removeEventListener("change", updateAutomaticMode);
      smallScreen?.removeEventListener("change", updateAutomaticMode);
      window.removeEventListener("storage", updateStoredMode);
    };
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    document.documentElement.dataset.liteMode = state.lite ? "true" : "false";
    window.dispatchEvent(new Event("pharmaconnect:lite-mode-ready"));
  }, [state.lite, state.ready]);

  const setMode = useCallback((value: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {}
    setState({ lite: value, manual: value, ready: true });
  }, []);

  const value = useMemo(() => ({ ...state, setMode }), [state, setMode]);
  return createElement(LiteModeContext.Provider, { value }, children);
}

export function useLiteMode() {
  const context = useContext(LiteModeContext);
  if (!context) throw new Error("useLiteMode must be used within LiteModeProvider");
  return context;
}
