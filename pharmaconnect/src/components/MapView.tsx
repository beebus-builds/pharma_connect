"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { NearbyPharmacyDTO } from "@/types";

// Fix default marker icons (Next.js/webpack breaks Leaflet's default asset paths)
const pharmacyIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.DivIcon({
  html: `<div style="background:#2f9480;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px #2f9480;"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {userLocation && (
        <>
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>You are here</Popup>
          </Marker>
          <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
        </>
      )}

      {pharmacies.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pharmacyIcon}>
          <Popup>
            <div className="text-sm space-y-1">
              <p className="font-semibold">{p.name}</p>
              <p>{p.address}</p>
              <p>{p.phone}</p>
              <p>
                {p.medicine.genericName} &middot; {p.quantity} units &middot; {p.distanceKm.toFixed(1)} km
              </p>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-primary-600 font-medium hover:underline"
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
