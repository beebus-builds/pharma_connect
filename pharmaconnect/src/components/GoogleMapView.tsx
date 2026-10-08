"use client";

import { MapPin, Navigation } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";

interface GoogleMapViewProps {
  lat: number;
  lng: number;
  name?: string;
  compact?: boolean;
}

/** Google Maps embed + View / Directions links so patients can observe the pin. */
export default function GoogleMapView({ lat, lng, name, compact = false }: GoogleMapViewProps) {
  const viewUrl = `https://www.google.com/maps/?q=${lat},${lng}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const embedSrc = `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=en&output=embed`;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-line bg-surface-sunken">
        <iframe
          title={name ? `Google Maps location of ${name}` : `Google Maps location ${lat}, ${lng}`}
          src={embedSrc}
          className={`w-full border-0 ${compact ? "h-40" : "h-56"}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ size: "sm", variant: "secondary" })}
          aria-label={name ? `View ${name} on Google Maps` : "View on Google Maps"}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          View on Google Maps
        </a>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClasses({ size: "sm" })}
          aria-label={name ? `Get directions to ${name}` : "Get directions"}
        >
          <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
          Directions
        </a>
      </div>
    </div>
  );
}
