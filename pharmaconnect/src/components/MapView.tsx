"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/components/ThemeProvider";
import { VerifiedBadge } from "@/components/ui/Badge";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import { FALLBACK_CENTER, filterValidPharmacies, isValidLocation } from "@/lib/geo";
import type { NearbyPharmacyDTO } from "@/types";

// Custom professional marker for pharmacies (scales up when active)
function makePharmacyIcon(active: boolean) {
  return new L.DivIcon({
    html: `
      <div class="relative flex items-center justify-center ${active ? "scale-125 z-[999]" : ""} transition-transform">
        <div class="absolute ${active ? "w-10 h-10 bg-primary-500/30" : "w-8 h-8 bg-primary-500/20"} rounded-full animate-ping"></div>
        <div class="relative ${active ? "w-8 h-8" : "w-6 h-6"} ${active ? "bg-primary-500 ring-4 ring-primary-500/40" : "bg-primary-600"} rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
    `,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
const pharmacyIcon = makePharmacyIcon(false);
const activePharmacyIcon = makePharmacyIcon(true);

const userIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
      <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function FitBounds({
  userLocation,
  pharmacies,
}: {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!userLocation && pharmacies.length === 0) return;

    // If only user location and no pharmacies, fly to user
    if (pharmacies.length === 0 && userLocation) {
      map.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.2 });
      return;
    }

    // Build bounds from all points
    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    pharmacies.forEach((p) => bounds.extend([p.latitude, p.longitude]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [40, 40],
        maxZoom: 15,
        animate: true,
        duration: 1.2,
      });
    }
  }, [userLocation, pharmacies, map]);
  return null;
}

/** Handles all imperative map reactions to list hover/selection changes. */
function ActiveMarkerSync({
  userLocation,
  pharmacies,
  activeId,
}: {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
  activeId: string | null;
}) {
  const map = useMap();
  const lastActiveRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeId) {
      lastActiveRef.current = null;
      return;
    }
    const p = pharmacies.find((x) => x.id === activeId);
    if (!p) return;
    const isSelectionChange = lastActiveRef.current !== activeId;
    lastActiveRef.current = activeId;
    if (!isSelectionChange) return; // only fly on change, not on every hover
    map.flyTo([p.latitude, p.longitude], Math.max(map.getZoom(), 14), {
      duration: 0.6,
      easeLinearity: 0.2,
    });
  }, [activeId, pharmacies, map]);

  // Re-fit bounds when a selection is cleared so all pins come back into view
  useEffect(() => {
    if (activeId || pharmacies.length === 0) return;
    const bounds = L.latLngBounds([]);
    if (userLocation) bounds.extend([userLocation.lat, userLocation.lng]);
    pharmacies.forEach((p) => bounds.extend([p.latitude, p.longitude]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, duration: 0.8 });
    }
  }, [activeId, userLocation, pharmacies, map]);

  return null;
}

interface MapViewProps {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
  /** Pharmacy currently hovered/selected in the results list. */
  activePharmacyId?: string | null;
  /** Called when a pharmacy marker is clicked on the map. */
  onSelectPharmacy?: (id: string) => void;
}

export default function MapView({ userLocation, pharmacies, activePharmacyId, onSelectPharmacy }: MapViewProps) {
  const { theme } = useTheme();
  // Never hand Leaflet a NaN — a single bad coordinate used to crash the whole page.
  const safeUserLocation = isValidLocation(userLocation) ? userLocation : null;
  const safePharmacies = useMemo(() => filterValidPharmacies(pharmacies), [pharmacies]);
  const center: [number, number] = safeUserLocation
    ? [safeUserLocation.lat, safeUserLocation.lng]
    : [FALLBACK_CENTER.lat, FALLBACK_CENTER.lng];

  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom zoomControl={false}>
      <TileLayer attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>' url={tileUrl} />
      <ZoomControl position="bottomright" />
      <FitBounds userLocation={safeUserLocation} pharmacies={safePharmacies} />
      <ActiveMarkerSync
        userLocation={safeUserLocation}
        pharmacies={safePharmacies}
        activeId={activePharmacyId ?? null}
      />

      {safeUserLocation && (
        <Marker position={[safeUserLocation.lat, safeUserLocation.lng]} icon={userIcon} alt="Your location">
          <Popup className="custom-popup">
            <div className="text-sm font-medium text-slate-900">Your Current Location</div>
            <p className="text-xs text-slate-500">{safeUserLocation.lat.toFixed(4)}, {safeUserLocation.lng.toFixed(4)}</p>
          </Popup>
        </Marker>
      )}

      {safePharmacies.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={activePharmacyId === p.id ? activePharmacyIcon : pharmacyIcon}
          alt={p.name}
          eventHandlers={{ click: () => onSelectPharmacy?.(p.id) }}
        >
          <Popup className="custom-popup" maxWidth={240}>
            <div className="p-1 min-w-[200px]">
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1.5 bg-primary-100 text-primary-600 rounded-lg shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 leading-tight text-sm flex items-center gap-1.5 flex-wrap">
                    <a href={`/pharmacies/${p.id}`} className="hover:text-primary-600 hover:underline underline-offset-2">
                      {p.name}
                    </a>
                    {p.verified && <VerifiedBadge />}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-2">{p.address}</p>
                </div>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <span className="opacity-60 shrink-0">📞</span>
                  <a href={`tel:${p.phone}`} className="hover:text-primary-600 hover:underline underline-offset-2">
                    {p.phone}
                  </a>
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  <span className="font-semibold text-primary-600 text-xs">
                    {p.quantity} units · {p.medicine.genericName}
                  </span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0">
                    {p.distanceKm < 1 ? `${Math.round(p.distanceKm * 1000)} m` : `${p.distanceKm.toFixed(1)} km`}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <a
                  href={`https://www.google.com/maps/?q=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                  View on Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                >
                  Get Directions
                </a>
              </div>
              {(whatsappUrl(p.phone, p.name) || viberUrl(p.phone)) && (
                <div className="flex gap-2 mt-2">
                  {whatsappUrl(p.phone, p.name) && (
                    <a
                      href={whatsappUrl(p.phone, p.name)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                    >
                      WhatsApp — no account needed
                    </a>
                  )}
                  {viberUrl(p.phone) && (
                    <a
                      href={viberUrl(p.phone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
                    >
                      Viber
                    </a>
                  )}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
