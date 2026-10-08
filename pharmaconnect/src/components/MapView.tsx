"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { Phone, Stethoscope } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { VerifiedBadge } from "@/components/ui/Badge";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import { FALLBACK_CENTER, filterValidPharmacies, isValidLocation } from "@/lib/geo";
import type { NearbyPharmacyDTO } from "@/types";

// Markers are DivIcons, so their colours are baked into markup rather than
// coming from the theme. These two hues are the accent ramp in both themes.
const PIN = "#175e4c";
const PIN_STRONG = "#123f35";

function makePharmacyIcon(active: boolean) {
  return new L.DivIcon({
    html: `
      <div class="relative flex items-center justify-center ${active ? "scale-125" : ""}" style="transition: transform 200ms cubic-bezier(0.22,1,0.36,1)">
        <div class="absolute rounded-full" style="width:${active ? 40 : 32}px;height:${active ? 40 : 32}px;background:${PIN};opacity:0.25;animation: pcPing 2s cubic-bezier(0,0,0.2,1) infinite"></div>
        <div class="relative rounded-full flex items-center justify-center text-white" style="width:${active ? 32 : 24}px;height:${active ? 32 : 24}px;background:${active ? PIN_STRONG : PIN};border:2px solid #fff;box-shadow:0 2px 8px rgb(20 28 26 / 0.35)">
          <svg xmlns="http://www.w3.org/2000/svg" width="${active ? 14 : 12}" height="${active ? 14 : 12}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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
      <div class="absolute rounded-full" style="width:24px;height:24px;background:#2563eb;opacity:0.28;animation: pcPing 2s cubic-bezier(0,0,0.2,1) infinite"></div>
      <div class="relative rounded-full" style="width:16px;height:16px;background:#2563eb;border:2px solid #fff;box-shadow:0 1px 4px rgb(20 28 26 / 0.3)"></div>
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
          <Popup>
            <div className="font-medium">Your location</div>
            <p className="tabular text-fg-muted">
              {safeUserLocation.lat.toFixed(4)}, {safeUserLocation.lng.toFixed(4)}
            </p>
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
          <Popup maxWidth={260}>
            <div className="min-w-[210px]">
              <div className="mb-2 flex items-start gap-2">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold leading-tight">
                    <a
                      href={`/pharmacies/${p.id}`}
                      className="rounded hover:text-accent hover:underline"
                    >
                      {p.name}
                    </a>
                    {p.verified && <VerifiedBadge />}
                  </p>
                  <p className="line-clamp-2 text-xs text-fg-muted">{p.address}</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-fg-muted">
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 opacity-60" aria-hidden="true" />
                  <a
                    href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}
                    className="rounded tabular hover:text-accent hover:underline"
                  >
                    {p.phone}
                  </a>
                </p>
                <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                  <span className="text-xs font-semibold text-accent">
                    {p.quantity} units · {p.medicine.genericName}
                  </span>
                  <span className="tabular shrink-0 rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium">
                    {p.distanceKm < 1
                      ? `${Math.round(p.distanceKm * 1000)} m`
                      : `${p.distanceKm.toFixed(1)} km`}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-lg bg-accent px-2 py-2 text-center text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  Directions
                </a>
                <a
                  href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}
                  className="flex-1 rounded-lg border border-line px-2 py-2 text-center text-xs font-semibold text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                >
                  Call
                </a>
              </div>

              {(whatsappUrl(p.phone, p.name) || viberUrl(p.phone)) && (
                <div className="mt-2 flex gap-2">
                  {whatsappUrl(p.phone, p.name) && (
                    <a
                      href={whatsappUrl(p.phone, p.name)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg border border-line px-2 py-2 text-center text-xs font-semibold text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      WhatsApp
                    </a>
                  )}
                  {viberUrl(p.phone) && (
                    <a
                      href={viberUrl(p.phone)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-lg border border-line px-2 py-2 text-center text-xs font-semibold text-fg transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
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
