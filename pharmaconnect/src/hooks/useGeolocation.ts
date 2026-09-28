"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";

interface GeoState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

const UNSUPPORTED: MessageKey = "geo.unsupported";
const UNREADABLE: MessageKey = "geo.unreadable";
const GENERIC: MessageKey = "geo.failed";
const DENIED: MessageKey = "geo.denied";
const UNAVAILABLE: MessageKey = "geo.unavailable";
const TIMEOUT: MessageKey = "geo.timeout";

export function useGeolocation() {
  const { t } = useLocale();
  const [state, setState] = useState<GeoState>({ location: null, error: null, loading: false });
  // Error copy is resolved at throw time, not render time, so the latest locale
  // must be readable without making it a dependency of the permission callback.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ location: null, error: tRef.current(UNSUPPORTED), loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        // Some devices/drivers return NaN/Infinity — never let those reach the map.
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          setState({ location: null, error: tRef.current(UNREADABLE), loading: false });
          return;
        }
        setState({
          location: { lat: latitude, lng: longitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        let key: MessageKey = GENERIC;
        if (err.code === err.PERMISSION_DENIED) key = DENIED;
        else if (err.code === err.POSITION_UNAVAILABLE) key = UNAVAILABLE;
        else if (err.code === err.TIMEOUT) key = TIMEOUT;
        setState({ location: null, error: tRef.current(key), loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  return { ...state, requestLocation };
}
