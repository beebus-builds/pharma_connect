"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, ExternalLink, MapPin, Search } from "lucide-react";

declare global {
  interface Window {
    google?: any;
    __gmpLoading?: Promise<void>;
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

interface GoogleMapPickerProps {
  value: LatLng | null;
  onChange: (pos: LatLng) => void;
  error?: string;
}

const KATHMANDU: LatLng = { lat: 27.7172, lng: 85.324 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps) return Promise.resolve();
  if (window.__gmpLoading) return window.__gmpLoading;
  window.__gmpLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return window.__gmpLoading;
}

/** Interactive Google Maps pinpoint picker (keyed) with a no-key fallback. */
export default function GoogleMapPicker({ value, onChange, error }: GoogleMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState(value?.lat.toString() ?? "");
  const [manualLng, setManualLng] = useState(value?.lng.toString() ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Keep manual inputs in sync when value changes externally (e.g. geolocation)
  useEffect(() => {
    if (!value) return;
    const latStr = String(value.lat);
    const lngStr = String(value.lng);
    setManualLat((prev) => (prev === latStr ? prev : latStr));
    setManualLng((prev) => (prev === lngStr ? prev : lngStr));
    // Intentionally keyed on lat/lng only — syncs when the pin moves externally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  // Keyed interactive map
  useEffect(() => {
    if (!API_KEY || !mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google) return;
        const center = value ?? KATHMANDU;
        const map = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: value ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
        });
        const marker = new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
          title: "Drag to your pharmacy location",
        });
        mapObj.current = map;
        markerObj.current = marker;

        map.addListener("click", (e: any) => {
          const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(pos);
          onChangeRef.current(pos);
        });
        marker.addListener("dragend", () => {
          const p = marker.getPosition();
          if (p) onChangeRef.current({ lat: p.lat(), lng: p.lng() });
        });

        // Places search (progressive enhancement — silently skip if unavailable)
        try {
          if (searchRef.current && window.google.maps.places) {
            const autocomplete = new window.google.maps.places.Autocomplete(searchRef.current, {
              componentRestrictions: { country: "np" },
              fields: ["geometry", "formatted_address"],
            });
            autocomplete.addListener("place_changed", () => {
              const place = autocomplete.getPlace();
              const loc = place?.geometry?.location;
              if (!loc) return;
              const pos = { lat: loc.lat(), lng: loc.lng() };
              map.setCenter(pos);
              map.setZoom(16);
              marker.setPosition(pos);
              onChangeRef.current(pos);
            });
          }
        } catch {
          // ignore — search box simply won't autocomplete
        }
      })
      .catch(() => {
        if (!cancelled) setMapError("Could not load Google Maps. Check your API key or connection.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan keyed map when value changes externally
  useEffect(() => {
    if (!API_KEY || !mapObj.current || !markerObj.current || !value) return;
    markerObj.current.setPosition(value);
    mapObj.current.panTo(value);
    // Intentionally keyed on lat/lng only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  const useMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setMapError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChangeRef.current(next);
        mapObj.current?.setCenter(next);
        mapObj.current?.setZoom(16);
        markerObj.current?.setPosition(next);
        setLocating(false);
      },
      () => {
        setMapError("Could not detect location. Pick the point on the map instead.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const commitManual = useCallback(() => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      onChangeRef.current({ lat, lng });
      setMapError(null);
    } else {
      setMapError("Enter a valid latitude (-90…90) and longitude (-180…180).");
    }
  }, [manualLat, manualLng]);

  // Free address search (OpenStreetMap Nominatim — no key, no billing).
  // Recenters the Google Maps preview on the best match inside Nepal.
  const searchAddress = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q || searching) return;
    setSearching(true);
    setMapError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=np&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error("search failed");
      const results = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!results.length) {
        setMapError("No match in Nepal — try a nearby landmark, then fine-tune with Pick on Google Maps.");
        return;
      }
      onChangeRef.current({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
    } catch {
      setMapError("Address search is unavailable right now — use your location or Pick on Google Maps.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, searching]);

  const googleMapsLink = value
    ? `https://www.google.com/maps/?q=${value.lat},${value.lng}`
    : "https://www.google.com/maps/?q=Kathmandu,Nepal";
  const embedSrc = value
    ? `https://maps.google.com/maps?q=${value.lat},${value.lng}&z=16&output=embed`
    : "https://maps.google.com/maps?q=Kathmandu,Nepal&z=12&output=embed";

  // ---------- No-key fallback: Google embed + free search (no billing) ----------
  if (!API_KEY) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Pinpoint your pharmacy on Google Maps
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchAddress();
              }
            }}
            placeholder="Search address, e.g. New Road, Kathmandu"
            aria-label="Search address in Nepal"
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
          <button
            type="button"
            onClick={() => void searchAddress()}
            disabled={searching || !searchQuery.trim()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
          >
            <Search className="h-3.5 w-3.5" />
            {searching ? "…" : "Find"}
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <iframe
            title={value ? `Map preview for ${value.lat}, ${value.lng}` : "Map preview of Kathmandu"}
            src={embedSrc}
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              placeholder="Latitude, e.g. 27.7172"
              aria-label="Latitude"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              onBlur={commitManual}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div>
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              placeholder="Longitude, e.g. 85.3240"
              aria-label="Longitude"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              onBlur={commitManual}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
        </div>
        {(error || mapError) && <p className="text-xs text-red-600">{error ?? mapError}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {locating ? "Detecting…" : "Use my location"}
          </button>
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Pick on Google Maps
          </a>
          {value && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl">
              <MapPin className="h-3.5 w-3.5" />
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400">
          Free forever — no API key or billing needed. Search an address, use your location, or open
          Google Maps → right-click your shop → “What’s here?” → paste the numbers above.
        </p>
      </div>
    );
  }

  // ---------- Keyed interactive picker ----------
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Pinpoint your pharmacy on Google Maps
      </label>
      <input
        ref={searchRef}
        type="text"
        placeholder="Search address, e.g. New Road, Kathmandu"
        aria-label="Search address"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
      />
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
        <div ref={mapRef} className="h-56 w-full" role="application" aria-label="Google Maps location picker" />
      </div>
      {(error || mapError) && <p className="text-xs text-red-600">{error ?? mapError}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-60"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {locating ? "Detecting…" : "Use my location"}
        </button>
        {value && (
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 rounded-xl">
            <MapPin className="h-3.5 w-3.5" />
            {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-400">Click the map or drag the pin to set the exact shop entrance.</p>
    </div>
  );
}
