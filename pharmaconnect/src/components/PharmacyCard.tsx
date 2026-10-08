"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import {
  MapPin,
  Phone,
  Send,
  CheckCircle2,
  Clock,
  MessageCircle,
  PhoneCall,
  Flag,
  Store,
  ChevronDown,
  Facebook,
  MoreHorizontal,
  Navigation,
  Package,
} from "lucide-react";
import { StockBadge, DistanceBadge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select, Textarea } from "@/components/ui/Input";
import { isOpenNow } from "@/lib/hours";
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
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("WRONG_STOCK");
  const [reportDetails, setReportDetails] = useState("");
  const [reporting, setReporting] = useState(false);
  const { data: session } = useSession();
  const { t } = useLocale();
  const router = useRouter();
  const waLink = whatsappUrl(pharmacy.phone, pharmacy.name);
  const viberLink = viberUrl(pharmacy.phone);

  const open = isOpenNow(pharmacy.openingHours);
  const mapsUrl = `https://www.google.com/maps/?q=${pharmacy.latitude},${pharmacy.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pharmacy.latitude},${pharmacy.longitude}`;
  const storefrontHref = userLocation
    ? `/pharmacies/${pharmacy.id}?lat=${userLocation.lat}&lng=${userLocation.lng}`
    : `/pharmacies/${pharmacy.id}`;

  useEffect(() => {
    if (!moreOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

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
    setMoreOpen(false);
    setReportOpen(true);
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId: pharmacy.id,
          reason: reportReason,
          details: reportDetails || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("report.failed"));
      toast.success(data.message || t("report.submitted"));
      setReportOpen(false);
      setReportDetails("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("report.genericError"));
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
    } catch {
      // Error handled by parent
    }
  }

  return (
    <article
      className={cn(
        "group border-t border-line py-4 transition-[background-color] duration-200 first:border-t-0 first:pt-1 sm:py-5",
        "hover:bg-surface-sunken/50 motion-reduce:transition-none",
        highlighted && "-mx-3 rounded-xl bg-accent-soft px-3 ring-1 ring-inset ring-accent/20"
      )}
      data-pharmacy-card={pharmacy.id}
    >
      {/* Meta row: state, distance, freshness */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        <StockBadge status={pharmacy.stockStatus} />
        <DistanceBadge km={pharmacy.distanceKm} />
        {pharmacy.verified && <VerifiedBadge />}
        {pharmacy.sponsored && (
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
            Sponsored
          </span>
        )}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-[11px]",
            open ? "text-fg-subtle" : "font-medium text-amber-700 dark:text-amber-400"
          )}
          title={formatRelativeTime(pharmacy.stockUpdatedAt)}
        >
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span className="tabular">
            {open ? formatRelativeTime(pharmacy.stockUpdatedAt) : t("card.closedNow")}
          </span>
        </span>
      </div>

      <div className="flex items-start gap-3">
        <Link
          href={storefrontHref}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
          aria-label={t("card.storefrontAria", { name: pharmacy.name })}
          title={t("card.storefrontTitle")}
        >
          {pharmacy.profileImageUrl && !lite ? (
            // eslint-disable-next-line @next/next/no-img-element
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
            <Store className="h-5 w-5 text-accent" aria-hidden="true" />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[1.0625rem] font-semibold leading-snug text-fg">
                <Link
                  href={storefrontHref}
                  className="rounded transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                  title={t("card.storefrontTitle")}
                >
                  {pharmacy.name}
                </Link>
              </h3>
              <p className="truncate text-[13px] text-fg-muted">
                {pharmacy.branchName} · {pharmacy.address}
              </p>
            </div>
            {pharmacy.quantity > 0 && (
              <p className="tabular hidden shrink-0 text-right text-sm font-semibold text-fg sm:block">
                {pharmacy.quantity}
                <span className="block text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                  {t("card.units")}
                </span>
              </p>
            )}
          </div>

          {/* The medicine being matched, with price. */}
          <div className="mt-2.5 flex items-center gap-2.5 rounded-lg bg-surface-sunken/70 px-2.5 py-2">
            {pharmacy.medicine.imageUrl && !lite ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pharmacy.medicine.imageUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-9 w-9 shrink-0 rounded-md object-cover ring-1 ring-line"
              />
            ) : (
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-[10px] font-bold text-fg-subtle ring-1 ring-line"
                aria-hidden="true"
              >
                Rx
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {pharmacy.medicine.genericName}
                <span className="text-fg-muted">
                  {" "}
                  · {pharmacy.medicine.brandName} {pharmacy.medicine.strength}
                </span>
              </p>
              <p className="tabular flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                {pharmacy.mrp != null && (
                  <span className="font-bold text-accent">Rs. {pharmacy.mrp}</span>
                )}
                {pharmacy.quantity > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3 w-3" aria-hidden="true" />
                    {t("card.quantityLabel", { count: pharmacy.quantity })}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Actions. Primary action is always one tap away; everything else is
              behind the overflow menu so the row does not become a button wall. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href={`tel:${pharmacy.phone.replace(/[^+\d]/g, "")}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              aria-label={t("card.callAria", { name: pharmacy.name })}
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {t("card.call")}
            </a>

            {canRequest && onRequest && (
              <Button
                variant={isSent ? "accent" : "secondary"}
                size="sm"
                className={cn("min-w-[112px]", isSent && "bg-accent text-accent-fg hover:bg-accent-hover")}
                loading={requesting}
                onClick={handleRequestClick}
                disabled={isSent}
                aria-label={
                  isSent
                    ? t("card.requestSent")
                    : t("card.requestAria", {
                        medicine: pharmacy.medicine.genericName,
                        name: pharmacy.name,
                      })
                }
              >
                {isSent ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("card.sent")}
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("home.request")}
                  </>
                )}
              </Button>
            )}

            <div className="relative ml-auto" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                  moreOpen
                    ? "bg-surface-sunken text-fg"
                    : "text-fg-muted hover:bg-surface-sunken hover:text-fg"
                )}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{t("card.more")}</span>
                <span className="sr-only sm:hidden">{t("card.moreAria", { name: pharmacy.name })}</span>
              </button>

              {moreOpen && (
                <div
                  role="menu"
                  aria-label={t("card.moreAria", { name: pharmacy.name })}
                  className="absolute right-0 z-30 mt-1.5 w-52 origin-top-right overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-popover animate-scaleIn motion-reduce:animate-none"
                >
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                  >
                    <Navigation className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    {t("card.directions")}
                  </a>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                  >
                    <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    {t("card.viewMap")}
                  </a>
                  <a
                    href={`tel:${pharmacy.phone.replace(/[^+\d]/g, "")}`}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg sm:hidden"
                  >
                    <PhoneCall className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    {t("card.callNumber", { phone: pharmacy.phone })}
                  </a>
                  {waLink && (
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0 text-[#25D366]" aria-hidden="true" />
                      WhatsApp
                    </a>
                  )}
                  {viberLink && (
                    <a
                      href={viberLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="menuitem"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                    >
                      <PhoneCall className="h-4 w-4 shrink-0 text-[#7360F2]" aria-hidden="true" />
                      Viber
                    </a>
                  )}
                  <div className="my-1 h-px bg-line" role="none" />
                  <a
                    href={facebookShareUrl(
                      typeof window !== "undefined"
                        ? `${window.location.origin}/pharmacies/${pharmacy.id}`
                        : `/pharmacies/${pharmacy.id}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
                  >
                    <Facebook className="h-4 w-4 shrink-0 text-[#1877F2]" aria-hidden="true" />
                    {t("card.share")}
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={openReport}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                  >
                    <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("home.report")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        size="sm"
        title={t("report.title")}
        description={t("report.subtitle", { name: pharmacy.name })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              {t("report.cancel")}
            </Button>
            <Button type="submit" form="report-form" loading={reporting}>
              {t("report.submit")}
            </Button>
          </>
        }
      >
        <form id="report-form" onSubmit={submitReport} className="space-y-4">
          <Select
            label={t("report.reasonLabel")}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          >
            {Object.entries(REPORT_REASON_KEYS).map(([value, key]) => (
              <option key={value} value={value}>
                {t(key)}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("report.detailsLabel")}
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={t("report.detailsPlaceholder")}
            hint={`${reportDetails.length}/1000`}
          />
        </form>
      </Dialog>
    </article>
  );
}
