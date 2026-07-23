"use client";

import { useState } from "react";
import { MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { StockBadge, DistanceBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
    <Card className="p-4 hover:shadow-md transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary-600">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-row items-center gap-2 mb-2">
          <StockBadge status={pharmacy.stockStatus} />
          <DistanceBadge km={pharmacy.distanceKm} />
        </div>
        <div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{pharmacy.name}</h3>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {pharmacy.address}
          </p>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {pharmacy.phone}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{pharmacy.quantity} units</span>{" "}
          <span className="text-slate-500">available of</span>{" "}
          <span className="font-medium text-slate-800 dark:text-slate-200">{pharmacy.medicine.genericName}</span>
        </p>
        <div className="flex gap-2">
          <a
            href={`tel:${pharmacy.phone}`}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            aria-label={`Call ${pharmacy.name}`}
          >
            <Phone className="h-3 w-3" />
            Call
          </a>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
            aria-label={`Get directions to ${pharmacy.name}`}
          >
            <MapPin className="h-3 w-3" />
            Directions
          </a>
          {canRequest && onRequest && (
            <Button
              variant={isSent ? "primary" : "secondary"}
              className={cn("text-xs px-3 py-1.5 min-w-[90px]", isSent && "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20")}
              loading={requesting}
              onClick={handleRequestClick}
              disabled={isSent}
            >
              {isSent ? (
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="flex items-center gap-1"
                >
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
      </div>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
