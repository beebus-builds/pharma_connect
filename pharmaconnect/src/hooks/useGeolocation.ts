"use client";

import { useCallback, useState } from "react";

interface GeoState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ location: null, error: null, loading: false });

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ location: null, error: "Geolocation is not supported by your browser", loading: false });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        let message = "Unable to retrieve your location";
        if (err.code === err.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable it in your browser settings or search manually.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable right now.";
        } else if (err.code === err.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }
        setState({ location: null, error: message, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setState({ location: { lat, lng }, error: null, loading: false });
  }, []);

  return { ...state, requestLocation, setManualLocation };
}
