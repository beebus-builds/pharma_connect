"use client";

import { useCallback, useState } from "react";

const KEY = "pharmaconnect_lite_mode";

/** True when user wants (or needs) the light UI: no 3D, no tilt, no parallax. */
function detectInitial(): { lite: boolean; manual: boolean | null } {
  if (typeof window === "undefined") return { lite: false, manual: null };
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "1" || saved === "0") {
      const m = saved === "1";
      return { lite: m, manual: m };
    }
  } catch {
    // ignore
  }
  // Auto-detect: save-data, slow connection, or small screen
  const conn = (navigator as any)?.connection;
  const auto =
    conn?.saveData === true ||
    ["slow-2g", "2g"].includes(conn?.effectiveType) ||
    window.matchMedia("(max-width: 640px)").matches;
  return { lite: Boolean(auto), manual: null };
}

export function useLiteMode() {
  const [state, setState] = useState(detectInitial);
  const { lite, manual } = state;

  const setMode = useCallback((v: boolean) => {
    setState({ lite: v, manual: v });
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  return { lite, manual, setMode };
}
