"use client";

import { useState } from "react";
import { MapPin, Phone, Send, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { StockBadge, DistanceBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { NearbyPharmacyDTO } from "@/types";

interface PharmacyCardProps {
  pharmacy: NearbyPharmacyDTO;
  onRequest?: (pharmacy: NearbyPharmacyDTO) => Promise<void>;
  requesting?: boolean;
  canRequest?: boolean;
}

export default function PharmacyCard({ pharmacy, onRequest, requesting, canRequest = true }: PharmacyCardProps) {
  const [isSent, setIsSent] = useState(false);

  async function handleRequestClick() {
    if (!onRequest) return;
    try {
      await onRequest(pharmacy);
      setIsSent(true);
      setTimeout(() => setIsSent(false), 5000);
    } catch (e) {
      // Error handled by parent
    }
  }

  return (
    <Card className="group p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary-600 focus-within:border-l-primary-600 focus-within:shadow-md">
      {/* Header: badges + title */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StockBadge status={pharmacy.stockStatus} />
        <DistanceBadge km={pharmacy.distanceKm} />
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          Updated just now
        </span>
      </div>

      <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors">
        {pharmacy.name}
      </h3>
      <p className="text-sm text-slate-500 flex items-start gap-1.5 mt-1.5 line-clamp-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span className="truncate">{pharmacy.address}</span>
      </p>
      <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
        <Phone className="h-3.5 w-3.5 shrink-0" />
        <a href={`tel:${pharmacy.phone}`} className="hover:text-primary-600 hover:underline underline-offset-2">
          {pharmacy.phone}
        </a>
      </p>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 border border-slate-200 dark:border-slate-700">
          <span className="font-bold text-slate-900 dark:text-slate-100">{pharmacy.quantity} units</span>
          <span className="text-slate-500 hidden sm:inline">available</span>
          <span className="text-slate-300">·</span>
          <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{pharmacy.medicine.genericName}</span>
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`tel:${pharmacy.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          aria-label={`Call ${pharmacy.name}`}
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          aria-label={`Get directions to ${pharmacy.name}`}
        >
          <MapPin className="h-3.5 w-3.5" />
          Directions
        </a>
        {canRequest && onRequest && (
          <Button
            variant={isSent ? "primary" : "secondary"}
            className={cn(
              "text-xs px-4 py-2 min-w-[108px] ml-auto sm:ml-0",
              isSent && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            )}
            loading={requesting}
            onClick={handleRequestClick}
            disabled={isSent}
            aria-label={isSent ? "Request sent" : `Request ${pharmacy.medicine.genericName} from ${pharmacy.name}`}
          >
            {isSent ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Sent
              </motion.div>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Request
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
