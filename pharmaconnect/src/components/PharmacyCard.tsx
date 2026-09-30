"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import { MapPin, Phone, Send, CheckCircle2, Clock, MessageCircle, PhoneCall, Flag, Store, ChevronDown, Facebook } from "lucide-react";
import { StockBadge, DistanceBadge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { facebookShareUrl } from "@/lib/seo";
import { viberUrl, whatsappUrl } from "@/lib/contact";
import { useLocale } from "@/components/LocaleProvider";
import type { MessageKey } from "@/lib/i18n";
import type { NearbyPharmacyDTO } from "@/types";

const REPORT_REASON_KEYS: Record<string, MessageKey> = {
  WRONG_STOCK: "report.reasonWrongStock",
  CLOSED: "report.reasonClosed",
  WRONG_LOCATION: "report.reasonWrongLocation",
  FAKE_LISTING: "report.reasonFake",
  OTHER: "report.reasonOther",
};

interface PharmacyCardProps {
  pharmacy: NearbyPharmacyDTO;
  onRequest?: (pharmacy: NearbyPharmacyDTO) => Promise<void>;
  requesting?: boolean;
  canRequest?: boolean;
  /** Set when this pharmacy's pin is hovered/selected on the map. */
  highlighted?: boolean;
  /** Current user location — used to show distance on the storefront page. */
  userLocation?: { lat: number; lng: number } | null;
  lite?: boolean;
}

export default function PharmacyCard({
  pharmacy,
  onRequest,
  requesting,
  canRequest = true,
  highlighted = false,
  userLocation = null,
  lite = false,
}: PharmacyCardProps) {
  const [isSent, setIsSent] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("WRONG_STOCK");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const { data: session } = useSession();
  const { t } = useLocale();
  const router = useRouter();
  const waLink = whatsappUrl(pharmacy.phone, pharmacy.name);
  const viberLink = viberUrl(pharmacy.phone);

  function openReport() {
    if (!session) {
      toast.error(t("report.loginRequired"));
      router.push("/login");
      return;
    }
    if (session.user.role !== "PATIENT") {
      toast.error(t("report.patientsOnly"));
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
      if (!res.ok) throw new Error(data.error || t("report.failed"));
      toast.success(data.message || t("report.submitted"));
      setReportOpen(false);
      setReportDetails("");
    } catch (err: any) {
      toast.error(err.message || t("report.genericError"));
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
    <article
      className={cn(
        "group border-t rule py-5 first:border-t-0 first:pt-1 transition-colors",
        highlighted && "bg-primary-50/60 dark:bg-primary-500/5 -mx-3 px-3 rounded-xl"
      )}
      data-pharmacy-card={pharmacy.id}
    >
      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <StockBadge status={pharmacy.stockStatus} />
        <DistanceBadge km={pharmacy.distanceKm} />
        {pharmacy.verified && <VerifiedBadge />}
        {pharmacy.sponsored && (
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Sponsored</span>
        )}
        <span className="ml-auto flex items-center gap-1 text-[11px] tabular-nums text-stone-400">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(pharmacy.stockUpdatedAt)}
        </span>
        <button
          type="button"
          onClick={openReport}
          className="p-1.5 rounded-md text-stone-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
          aria-label={t("card.reportAria", { name: pharmacy.name })}
          title={t("home.report")}
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-start gap-3">
        <Link
          href={
            userLocation
              ? `/pharmacies/${pharmacy.id}?lat=${userLocation.lat}&lng=${userLocation.lng}`
              : `/pharmacies/${pharmacy.id}`
          }
          className="relative h-12 w-12 rounded-lg overflow-hidden bg-primary-50 dark:bg-primary-500/10 border border-stone-200 dark:border-slate-700 shrink-0 flex items-center justify-center"
          aria-label={t("card.storefrontAria", { name: pharmacy.name })}
          title={t("card.storefrontTitle")}
        >
          {pharmacy.profileImageUrl && !lite ? (
            <img
              src={pharmacy.profileImageUrl}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Store className="h-5 w-5 text-primary-700 dark:text-primary-300" aria-hidden="true" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-snug text-ink dark:text-white line-clamp-1">
            <Link
              href={
                userLocation
                  ? `/pharmacies/${pharmacy.id}?lat=${userLocation.lat}&lng=${userLocation.lng}`
                  : `/pharmacies/${pharmacy.id}`
              }
              className="hover:underline underline-offset-4 decoration-primary-300"
              title={t("card.storefrontTitle")}
            >
              {pharmacy.name}
            </Link>
          </h3>
          <p className="text-[13px] text-stone-500 dark:text-slate-400 truncate">{pharmacy.branchName} · {pharmacy.address}</p>
        </div>
        <p className="hidden sm:block text-sm font-semibold tabular-nums text-ink dark:text-white shrink-0">
          {pharmacy.quantity} <span className="font-normal text-stone-500">{t("card.units")}</span>
        </p>
      </div>

      <div className="mt-3 flex items-center gap-3 pl-[3.75rem]">
        {pharmacy.medicine.imageUrl && !lite ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pharmacy.medicine.imageUrl}
            alt={pharmacy.medicine.genericName}
            className="h-10 w-10 rounded-md object-cover shrink-0 border border-stone-200 dark:border-slate-700"
            loading="lazy"
          />
        ) : (
          <span className="h-10 w-10 rounded-md bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-bold text-stone-400 shrink-0">
            Rx
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink dark:text-white truncate">
            {pharmacy.medicine.genericName}
            <span className="font-normal text-stone-500"> · {pharmacy.medicine.brandName} {pharmacy.medicine.strength}</span>
          </p>
          <p className="text-xs text-stone-500 dark:text-slate-400 tabular-nums">
            <a href={`tel:${pharmacy.phone}`} className="hover:text-primary-700 hover:underline underline-offset-2 font-medium">
              {pharmacy.phone}
            </a>
            {pharmacy.mrp !== null && pharmacy.mrp !== undefined && (
              <span className="font-semibold text-primary-800 dark:text-primary-300"> · Rs. {pharmacy.mrp}</span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-3 pl-[3.75rem] flex flex-wrap items-center gap-2">
        <a
          href={`tel:${pharmacy.phone}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30"
          aria-label={t("card.callAria", { name: pharmacy.name })}
        >
          <Phone className="h-3.5 w-3.5" />
          {t("card.call")}
        </a>
        {canRequest && onRequest && (
          <Button
            variant={isSent ? "primary" : "secondary"}
            className={cn(
              "text-xs px-4 py-2 min-w-[108px] rounded-lg",
              isSent && "bg-primary-700 hover:bg-primary-800"
            )}
            loading={requesting}
            onClick={handleRequestClick}
            disabled={isSent}
            aria-label={
              isSent
                ? t("card.requestSent")
                : t("card.requestAria", { medicine: pharmacy.medicine.genericName, name: pharmacy.name })
            }
          >
            {isSent ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("card.sent")}
              </div>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                {t("home.request")}
              </>
            )}
          </Button>
        )}
        <details className="relative ml-auto">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30 [&::-webkit-details-marker]:hidden">
            {t("card.more")} <ChevronDown className="h-3.5 w-3.5" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-card">
            <a
              href={`https://www.google.com/maps/?q=${pharmacy.latitude},${pharmacy.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <MapPin className="h-3.5 w-3.5" /> {t("card.viewMap")}
            </a>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <MapPin className="h-3.5 w-3.5" /> {t("card.directions")}
            </a>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            )}
            {viberLink && (
              <a
                href={viberLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
              >
                <PhoneCall className="h-3.5 w-3.5" /> Viber
              </a>
            )}
            <a
              href={facebookShareUrl(
                typeof window !== "undefined"
                  ? `${window.location.origin}/pharmacies/${pharmacy.id}`
                  : `/pharmacies/${pharmacy.id}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium hover:bg-stone-100 dark:hover:bg-slate-800"
            >
              <Facebook className="h-3.5 w-3.5 text-[#1877F2]" /> {t("card.share")}
            </a>
          </div>
        </details>
      </div>
      {reportOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setReportOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("card.reportAria", { name: pharmacy.name })}
        >
          <form
            onSubmit={submitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 p-6 shadow-card"
          >
            <h3 className="font-display text-lg mb-1">{t("report.title")}</h3>
            <p className="text-xs text-slate-500 mb-4">{t("report.subtitle", { name: pharmacy.name })}</p>
            <label htmlFor={`report-reason-${pharmacy.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {t("report.reasonLabel")}
            </label>
            <select
              id={`report-reason-${pharmacy.id}`}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {Object.entries(REPORT_REASON_KEYS).map(([value, key]) => (
                <option key={value} value={value}>{t(key)}</option>
              ))}
            </select>
            <label htmlFor={`report-details-${pharmacy.id}`} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {t("report.detailsLabel")}
            </label>
            <textarea
              id={`report-details-${pharmacy.id}`}
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t("report.detailsPlaceholder")}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => setReportOpen(false)}>
                {t("report.cancel")}
              </Button>
              <Button type="submit" loading={reporting} className="flex-1 text-xs">
                {t("report.submit")}
              </Button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
