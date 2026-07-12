"use client";

import { MapPin, Phone, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StockBadge, DistanceBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { NearbyPharmacyDTO } from "@/types";

interface PharmacyCardProps {
  pharmacy: NearbyPharmacyDTO;
  onRequest?: (pharmacy: NearbyPharmacyDTO) => void;
  requesting?: boolean;
  canRequest?: boolean;
}

export default function PharmacyCard({ pharmacy, onRequest, requesting, canRequest = true }: PharmacyCardProps) {
  return (
    <Card className="p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{pharmacy.name}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {pharmacy.address}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {pharmacy.phone}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <DistanceBadge km={pharmacy.distanceKm} />
          <StockBadge status={pharmacy.stockStatus} />
        </div>
      </div>

       <div className="mt-3 flex items-center justify-between gap-3">
         <p className="text-xs text-slate-500">
           {pharmacy.medicine.genericName} ({pharmacy.medicine.brandName} {pharmacy.medicine.strength}) &middot;{" "}
           {pharmacy.quantity} units available
         </p>
         <div className="flex gap-2">
           <a
             href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
             target="_blank"
             rel="noopener noreferrer"
             className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1"
           >
             <MapPin className="h-3 w-3" />
             Directions
           </a>
           {canRequest && onRequest && (
             <Button
               variant="secondary"
               className="text-xs px-3 py-1.5"
               loading={requesting}
               onClick={() => onRequest(pharmacy)}
             >
               <Send className="h-3.5 w-3.5" />
               Request
             </Button>
           )}
         </div>
       </div>
    </Card>
  );
}
