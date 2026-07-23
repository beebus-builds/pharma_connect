"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { NearbyPharmacyDTO } from "@/types";

// Custom professional marker for pharmacies
const pharmacyIcon = new L.DivIcon({
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-primary-500/20 rounded-full animate-ping"></div>
      <div class="relative w-6 h-6 bg-primary-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
    </div>
  `,
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  }, [lat, lng, map]);
  return null;
}

interface MapViewProps {
  userLocation: { lat: number; lng: number } | null;
  pharmacies: NearbyPharmacyDTO[];
}

export default function MapView({ userLocation, pharmacies }: MapViewProps) {
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [27.7041, 85.3145]; // Kathmandu fallback

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup className="custom-popup">
              <div className="text-sm font-medium text-slate-900">Your Current Location</div>
            </Popup>
          </Marker>
          <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
        </>
      )}

      {pharmacies.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pharmacyIcon}>
          <Popup className="custom-popup">
            <div className="p-1 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-primary-100 text-primary-600 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <p className="flex items-start gap-1">
                  <span className="opacity-60">📍</span> {p.address}
                </p>
                <p className="flex items-center gap-1">
                  <span className="opacity-60">📞</span> {p.phone}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-semibold text-primary-600">
                    {p.quantity} units
                  </span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                    {p.distanceKm.toFixed(1)} km
                  </span>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center mt-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-semibold hover:bg-primary-700 transition-colors"
              >
                Get Directions
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
