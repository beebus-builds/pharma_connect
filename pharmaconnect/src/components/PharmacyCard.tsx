"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MapPin, Phone, Send, CheckCircle2, Clock, MessageCircle, PhoneCall, Flag } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { StockBadge, DistanceBadge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import type { NearbyPharmacyDTO } from "@/types";

const REPORT_REASONS = [
  { value: "WRONG_STOCK", label: "Stock info is wrong" },
  { value: "CLOSED", label: "Shop is closed / doesn't exist" },
  { value: "WRONG_LOCATION", label: "Pin is in the wrong place" },
  { value: "FAKE_LISTING", label: "Fake or duplicate listing" },
  { value: "OTHER", label: "Something else" },
];

interface PharmacyCardProps {
  pharmacy: NearbyPharmacyDTO;
  onRequest?: (pharmacy: NearbyPharmacyDTO) => Promise<void>;
  requesting?: boolean;
  canRequest?: boolean;
  /** Set when this pharmacy's pin is hovered/selected on the map. */
  highlighted?: boolean;
}

export default function PharmacyCard({
  pharmacy,
  onRequest,
  requesting,
  canRequest = true,
  highlighted = false,
}: PharmacyCardProps) {
  const [isSent, setIsSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("WRONG_STOCK");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const waLink = whatsappUrl(pharmacy.phone, pharmacy.name);
  const viberLink = viberUrl(pharmacy.phone);

  function openReport() {
    if (!session) {
      toast.error("Please log in as a patient to report a listing");
      router.push("/login");
      return;
    }
    if (session.user.role !== "PATIENT") {
      toast.error("Only patient accounts can file reports");
      return;
    }
    setReportOpen(true);
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: pharmacy.id, reason: reportReason, details: reportDetails || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit report");
      toast.success(data.message || "Report submitted — thank you");
      setReportOpen(false);
      setReportDetails("");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setReporting(false);
    }
  }

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
    <Card
      className={cn(
        "group p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 border-l-4 border-l-transparent hover:border-l-primary-600 focus-within:border-l-primary-600 focus-within:shadow-md",
        highlighted &&
          "border-l-primary-600 shadow-lg shadow-primary-600/10 ring-2 ring-primary-500/30 -translate-y-0.5 bg-primary-50/30 dark:bg-primary-950/20"
      )}
      data-pharmacy-card={pharmacy.id}
    >
      {/* Header: badges + title */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <StockBadge status={pharmacy.stockStatus} />
        <DistanceBadge km={pharmacy.distanceKm} />
        {pharmacy.verified && <VerifiedBadge />}
        <span className="ml-auto flex items-center gap-1 text-xs text-slate-400">
          <Clock className="h-3 w-3" />
          Updated just now
        </span>
        <button
          type="button"
          onClick={openReport}
          className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          aria-label={`Report ${pharmacy.name}`}
          title="Report this listing"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
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
          href={`https://www.google.com/maps/?q=${pharmacy.latitude},${pharmacy.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
          aria-label={`View ${pharmacy.name} on Google Maps`}
        >
          <MapPin className="h-3.5 w-3.5" />
          View Map
        </a>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            aria-label={`Chat with ${pharmacy.name} on WhatsApp — no account needed`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        )}
        {viberLink && (
          <a
            href={viberLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            aria-label={`Chat with ${pharmacy.name} on Viber — no account needed`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Viber
          </a>
        )}
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
      {reportOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setReportOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Report ${pharmacy.name}`}
        >
          <form
            onSubmit={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl"
          >
            <h3 className="font-bold text-base mb-1">Report this listing</h3>
            <p className="text-xs text-slate-500 mb-4">{pharmacy.name} · reports are reviewed by our team</p>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              What&apos;s wrong?
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Details (optional)
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="e.g. Visited yesterday, shop was closed at 2pm"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={reporting} className="flex-1 text-xs">
                Submit report
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
}
