"use client";

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, appToast as toast } from "@/components/Providers";
import {
  MapPin,
  LocateFixed,
  Search,
  Pill,
  ShieldAlert,
  SlidersHorizontal,
  List,
  Map as MapIcon,
  Siren,
  ArrowDownUp,
  BadgeCheck,
  Clock,
  Filter,
  PackageCheck,
  Loader2,
  Navigation,
  Phone,
  X,
  Sparkles,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PharmacyCard from "@/components/PharmacyCard";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Chip, ChipGroup } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Dialog";
import { Container } from "@/components/ui/Container";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLiteMode } from "@/hooks/useLiteMode";
import { isOpenNow } from "@/lib/hours";
import { useLocale } from "@/components/LocaleProvider";
import { cn } from "@/lib/utils";
import type { MedicineDTO, NearbyPharmacyDTO } from "@/types";

const HomepageDetails = lazy(() => import("@/components/HomepageDetails"));
// The map is only ever rendered when lite mode is off. A plain runtime
// `lite` check is not enough — the module still ships in the critical path — so
// it stays a dynamic import. See scripts/check-bundle-budget.mjs.
const MapViewClient = dynamic(() => import("@/components/MapViewClient"), { ssr: false });

const RADII = [2, 5, 10, 20] as const;

/**
 * Genuinely common generics, used as one-tap entry points. These are real drug
 * names resolved against the live catalog — the links land on real search
 * results, or on the honest "no stock" empty state.
 */
const QUICK_PICKS = ["Paracetamol", "Amoxicillin", "Ibuprofen", "ORS", "Cetirizine", "Azithromycin"];

interface PublicStats {
  verifiedPharmacies: number;
  medicineCount: number;
}

const HomePageContent = () => {
  const { data: session } = useSession();
  const { location, error, loading: locLoading, requestLocation } = useGeolocation();
  const searchParams = useSearchParams();
  const deepLinkQuery = (searchParams.get("q") ?? "").trim();
  const [medicine, setMedicine] = useState<MedicineDTO | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacyDTO[]>([]);
  const [pharmacyCursor, setPharmacyCursor] = useState<string | null>(null);
  const [hasMorePharmacies, setHasMorePharmacies] = useState(false);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const pharmacyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { lite, ready: liteModeReady } = useLiteMode();
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [sortBy, setSortBy] = useState<"nearest" | "cheapest">("nearest");
  const { t } = useLocale();
  const [emergency, setEmergency] = useState(false);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  // Real trust-bar counts — replaces hardcoded marketing numbers.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stats/public", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PublicStats | null) => {
        if (d && typeof d.verifiedPharmacies === "number") setStats(d);
      })
      .catch(() => {
        // Stats are decoration; a failure must not break search.
      });
    return () => controller.abort();
  }, []);

  const mapAvailable = liteModeReady && !lite;
  const activeView = lite ? "list" : activeTab;
  const listVisible = !mapAvailable || activeView === "list";

  const visiblePharmacies = useMemo(
    () =>
      pharmacies
        .filter((p) => {
          if (filterVerifiedOnly && !p.verified) return false;
          if (filterInStockOnly && p.stockStatus === "out-of-stock") return false;
          if (filterOpenNow && !isOpenNow(p.openingHours)) return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === "cheapest") {
            const am = a.mrp ?? Number.POSITIVE_INFINITY;
            const bm = b.mrp ?? Number.POSITIVE_INFINITY;
            if (am !== bm) return am - bm;
          }
          return a.distanceKm - b.distanceKm;
        }),
    [pharmacies, filterVerifiedOnly, filterInStockOnly, filterOpenNow, sortBy]
  );

  const activeFilterCount =
    Number(filterVerifiedOnly) + Number(filterInStockOnly) + Number(filterOpenNow);

  // Scroll the corresponding list card into view when a pin is clicked on the map
  useEffect(() => {
    if (!activePharmacyId) return;
    const el = pharmacyRefs.current[activePharmacyId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activePharmacyId]);

  useEffect(() => {
    requestLocation();
  }, []);

  // `?q=` deep link (e.g. the "Find it near you" CTA on /medicines/[generic]).
  // Resolve the term to a real catalog row and drive the normal search flow.
  useEffect(() => {
    if (!deepLinkQuery) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: deepLinkQuery, limit: "1" });
    fetch(`/api/medicines/search?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const first = data?.medicines?.[0] as MedicineDTO | undefined;
        if (first) {
          setMedicine(first);
        } else {
          toast(tRef.current("search.noResults", { query: deepLinkQuery }));
        }
      })
      .catch((e) => {
        if (e?.name !== "AbortError") toast.error(tRef.current("search.searchFailed"));
      });
    return () => controller.abort();
  }, [deepLinkQuery]);

  const fetchPharmacyPage = useCallback(
    async (cursor: string | null, append: boolean, signal: AbortSignal) => {
      if (!medicine || !location) return;

      setSearching(true);
      setFailed(false);
      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          medicineId: medicine.id,
          radiusKm: String(radiusKm),
          limit: "20",
        });
        if (cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/pharmacies/nearby?${params.toString()}`, { signal });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || tRef.current("home.searchFailed"));

        const next = (data.pharmacies ?? []) as NearbyPharmacyDTO[];
        setPharmacies((previous) => {
          if (!append) return next;
          const existing = new Set(previous.map((pharmacy) => pharmacy.id));
          return [...previous, ...next.filter((pharmacy) => !existing.has(pharmacy.id))];
        });
        setPharmacyCursor(data.pagination?.nextCursor ?? null);
        setHasMorePharmacies(Boolean(data.pagination?.hasMore));
      } catch (e: unknown) {
        if (e instanceof Error && e.name !== "AbortError") {
          setFailed(true);
          toast.error(e.message || tRef.current("common.error"));
        }
      } finally {
        if (!signal.aborted) setSearching(false);
      }
    },
    [medicine, location, radiusKm]
  );

  useEffect(() => {
    searchAbortRef.current?.abort();
    setSearching(false);
    setPharmacies([]);
    setPharmacyCursor(null);
    setHasMorePharmacies(false);
    setFailed(false);

    if (!medicine || !location) return;

    const controller = new AbortController();
    searchAbortRef.current = controller;
    void fetchPharmacyPage(null, false, controller.signal);

    return () => controller.abort();
  }, [fetchPharmacyPage, medicine, location, radiusKm]);

  const loadMorePharmacies = useCallback(() => {
    if (!hasMorePharmacies || !pharmacyCursor || searching) return;
    const controller = new AbortController();
    searchAbortRef.current?.abort();
    searchAbortRef.current = controller;
    void fetchPharmacyPage(pharmacyCursor, true, controller.signal);
  }, [fetchPharmacyPage, hasMorePharmacies, pharmacyCursor, searching]);

  async function handleRequest(pharmacy: NearbyPharmacyDTO) {
    if (!session) {
      toast.error(t("card.requestLogin"));
      router.push("/login?next=/");
      return;
    }
    if (session.user.role !== "PATIENT") {
      toast.error(t("card.requestPatientsOnly"));
      return;
    }
    setRequestingId(pharmacy.id);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyId: pharmacy.pharmacyId,
          locationId: pharmacy.id,
          medicineId: pharmacy.medicine.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("card.requestFailed"));
      toast.success(t("card.requestSentTo", { name: pharmacy.name }));
      // Give the success state a beat to register before navigating.
      setTimeout(() => router.push(`/chat/${data.request.id}`), 700);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setRequestingId(null);
    }
  }

  /** Bring the results into view once there is something to show. */
  const scrollToResults = () => {
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectMedicine = (next: MedicineDTO) => {
    setMedicine(next);
    setFiltersOpen(false);
    // Only jump when the list is off-screen — yanking the viewport while someone
    // is still reading the suggestions is hostile.
    window.setTimeout(() => {
      const el = resultsRef.current;
      if (el && el.getBoundingClientRect().top > window.innerHeight) scrollToResults();
    }, 120);
  };

  const filterControls = (variant: "inline" | "sheet") => (
    <>
      <ChipGroup label={t("home.radius")} icon={<SlidersHorizontal className="h-3 w-3" />}>
        {RADII.map((r) => (
          <Chip
            key={r}
            size={variant === "sheet" ? "md" : "sm"}
            selected={radiusKm === r}
            onClick={() => setRadiusKm(r)}
          >
            {r} km
          </Chip>
        ))}
      </ChipGroup>

      <ChipGroup label={t("home.filter")} icon={<Filter className="h-3 w-3" />}>
        <Chip
          tone="accent"
          size={variant === "sheet" ? "md" : "sm"}
          selected={filterVerifiedOnly}
          onClick={() => setFilterVerifiedOnly((v) => !v)}
        >
          <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("home.verifiedOnly")}
        </Chip>
        <Chip
          tone="accent"
          size={variant === "sheet" ? "md" : "sm"}
          selected={filterInStockOnly}
          onClick={() => setFilterInStockOnly((v) => !v)}
        >
          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {t("home.inStockOnly")}
        </Chip>
        <Chip
          tone="accent"
          size={variant === "sheet" ? "md" : "sm"}
          selected={filterOpenNow}
          onClick={() => setFilterOpenNow((v) => !v)}
        >
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {t("home.openNowOnly")}
        </Chip>
      </ChipGroup>

      <ChipGroup label={t("home.sort")} icon={<ArrowDownUp className="h-3 w-3" />}>
        {(
          [
            ["nearest", t("home.sortNearest")],
            ["cheapest", t("home.sortCheapest")],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            size={variant === "sheet" ? "md" : "sm"}
            selected={sortBy === value}
            onClick={() => setSortBy(value)}
          >
            {label}
          </Chip>
        ))}
      </ChipGroup>
    </>
  );

  const firstName = session?.user.name?.split(" ")[0] || "there";
  const isPatient = !session || session.user.role === "PATIENT";

  return (
    <div className="flex flex-col pb-24">
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        <div className="mesh pointer-events-none absolute inset-0" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line-strong to-transparent"
          aria-hidden="true"
        />

        <Container className="relative pb-10 pt-10 sm:pb-14 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start lg:gap-14">
            <div>
              {session ? (
                <div className="max-w-2xl space-y-5">
                  <p className="eyebrow">{t("home.welcomeBack")}</p>
                  <h1 className="headline text-display font-display text-fg">
                    {t("home.greeting", { name: firstName })}
                  </h1>
                  <p className="lede max-w-[52ch] text-base text-fg-muted sm:text-lg">
                    {t("home.welcomeSubtitle")}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      href={session.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient"}
                      className={buttonClasses({ size: "lg" })}
                    >
                      {t("home.viewRequests")}
                    </Link>
                    <Link href="/how-it-works" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                      {t("home.howItWorks")}
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-[11px] font-semibold text-fg-muted backdrop-blur">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    {stats
                      ? t("home.liveNetwork", {
                          count: stats.verifiedPharmacies,
                        })
                      : t("home.liveNetworkUnknown")}
                  </span>

                  <h1 className="headline text-display mt-5 font-display text-fg">
                    {t("home.heroLine1")}
                    <br />
                    <span className="text-accent">{t("home.heroLine2")}</span>
                  </h1>

                  <p className="lede mt-4 max-w-[52ch] text-base text-fg-muted sm:text-lg">
                    {t("home.heroLede")}
                  </p>
                </div>
              )}

              {/* Search console */}
              <div className="mt-8 max-w-2xl">
                <div className="rounded-2xl border border-line bg-surface/70 p-2 shadow-card backdrop-blur transition-[box-shadow] focus-within:shadow-card-hover">
                  <SearchBar
                    onSelect={handleSelectMedicine}
                    onClear={() => setMedicine(null)}
                    selected={medicine}
                    initialQuery={deepLinkQuery}
                  />

                  {/* Quick picks — real catalog entries, one tap away. */}
                  {!medicine && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1.5 pb-1 pt-0.5">
                      <span className="flex items-center gap-1 pr-1 text-[11px] font-semibold text-fg-subtle">
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        {t("home.tryOneOf")}
                      </span>
                      {QUICK_PICKS.map((name) => (
                        <Link
                          key={name}
                          href={`/?q=${encodeURIComponent(name)}`}
                          scroll={false}
                          className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                        >
                          {name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location + radius status */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {locLoading ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-fg-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {t("home.detectingLocation")}
                    </span>
                  ) : location ? (
                    <>
                      <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="tabular">{location.lat.toFixed(3)}, {location.lng.toFixed(3)}</span>
                        <span className="text-accent/60">·</span>
                        {t("home.withinKm", { km: radiusKm })}
                      </span>
                      <button
                        onClick={requestLocation}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                      >
                        <LocateFixed className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("home.updateLocation")}
                      </button>
                    </>
                  ) : error ? (
                    <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-[180px] flex-1">{error}</span>
                      <button
                        onClick={requestLocation}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-500/20"
                      >
                        <LocateFixed className="h-3 w-3" aria-hidden="true" />
                        {t("home.retry")}
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={requestLocation}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                    >
                      <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("home.enableLocation")}
                    </button>
                  )}
                </div>

                {/* Desktop controls. Phones get these inside the filter sheet. */}
                {medicine && (
                  <div className="mt-4 hidden flex-wrap items-center gap-x-5 gap-y-3 sm:flex">
                    {filterControls("inline")}
                    <Chip
                      tone="danger"
                      size="sm"
                      selected={emergency}
                      onClick={() => setEmergency((v) => !v)}
                      className="ml-auto"
                    >
                      <Siren className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("home.emergency")}
                    </Chip>
                  </div>
                )}
              </div>
            </div>

            {/* Ledger — live network + how it works */}
            <aside className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card lg:sticky lg:top-24">
              <div className="border-b border-line bg-accent-soft px-5 py-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
                  {t("home.networkTitle")}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <dd className="tabular font-display text-3xl font-semibold text-fg">
                      {stats ? stats.verifiedPharmacies.toLocaleString() : "—"}
                    </dd>
                    <dt className="mt-1 text-xs text-fg-muted">
                      {t("home.stats.verifiedPharmacies")}
                    </dt>
                  </div>
                  <div>
                    <dd className="tabular font-display text-3xl font-semibold text-fg">
                      {stats ? `${Math.round(stats.medicineCount / 100) / 10}k` : "—"}
                    </dd>
                    <dt className="mt-1 text-xs text-fg-muted">{t("home.stats.medicineTypes")}</dt>
                  </div>
                </dl>
              </div>
              <ol className="divide-y divide-line">
                {(
                  [
                    ["01", t("home.step.search"), t("home.step.searchDesc")],
                    ["02", t("home.step.request"), t("home.step.requestDesc")],
                    ["03", t("home.step.chat"), t("home.step.chatDesc")],
                  ] as const
                ).map(([n, title, body]) => (
                  <li key={n} className="flex gap-4 px-5 py-4">
                    <span className="tabular pt-0.5 font-display text-sm text-accent">{n}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-fg">{title}</p>
                      <p className="text-sm leading-relaxed text-fg-muted">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------ Emergency */}
      {emergency && medicine && pharmacies.length > 0 && (
        <Container className="pt-8">
          <div className="overflow-hidden rounded-2xl border border-red-300/70 bg-red-50 dark:border-red-500/30 dark:bg-red-950/40">
            <div className="flex items-center justify-between gap-3 border-b border-red-300/70 px-4 py-3 dark:border-red-500/25 sm:px-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-red-700 dark:text-red-300">
                <Siren className="h-4 w-4" aria-hidden="true" />
                {t("home.emergencyTitle")}
              </p>
              <button
                onClick={() => setEmergency(false)}
                className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 dark:text-red-300 dark:hover:bg-red-500/15"
                aria-label={t("home.exitEmergency")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="divide-y divide-red-200/70 dark:divide-red-500/20">
              {[...visiblePharmacies]
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, 3)
                .map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                    <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-fg ring-1 ring-line">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {p.name}
                        {p.branchName ? ` · ${p.branchName}` : ""}
                      </p>
                      <p className="tabular truncate text-xs text-fg-muted">
                        {p.distanceKm.toFixed(1)} km
                        {p.mrp != null ? ` · Rs. ${p.mrp}` : ""}
                        {p.quantity > 0 ? ` · ${t("card.quantityLabel", { count: p.quantity })}` : ""}
                      </p>
                    </div>
                    <a
                      href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}
                      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-xs font-bold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:bg-red-600 dark:hover:bg-red-500"
                    >
                      <Phone size={14} />
                      {t("card.call")}
                    </a>
                  </div>
                ))}
            </div>
          </div>
        </Container>
      )}

      {/* -------------------------------------------------------------- Results */}
      <Container wide as="section" className="scroll-mt-24 pt-12 sm:pt-16">
        <div ref={resultsRef} id="pharmacies" className="scroll-mt-24">
          {/* Results header */}
          <div className="mb-5 flex flex-col gap-4 sm:mb-6">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-subtle">
                  {t("home.resultsEyebrow")}
                </p>
                <h2 className="headline mt-1 font-display text-2xl text-fg sm:text-3xl">
                  {medicine ? (
                    <span className="truncate">
                      {t("home.whoHolds")}{" "}
                      <span className="italic text-accent">{medicine.genericName}</span>
                    </span>
                  ) : (
                    <span className="text-fg-subtle">{t("home.readyPrompt")}</span>
                  )}
                </h2>
                {medicine && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted" aria-live="polite">
                    {searching ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        {t("home.searchingWithin", { km: radiusKm })}
                      </span>
                    ) : failed ? (
                      <span className="text-red-600 dark:text-red-400">{t("home.searchFailed")}</span>
                    ) : (
                      <span className="tabular">
                        {t("home.foundCount", { count: visiblePharmacies.length })}
                        {sortBy === "cheapest" && (
                          <span className="font-semibold text-fg"> · {t("home.sortCheapest")}</span>
                        )}
                      </span>
                    )}
                    {medicine.brandName && (
                      <span className="truncate text-xs text-fg-subtle">
                        {medicine.brandName} · {medicine.strength}
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mobile: filters live in a sheet so the result list keeps the width. */}
                {medicine && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setFiltersOpen(true)}
                    className="sm:hidden"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("home.filters")}
                    {activeFilterCount > 0 && (
                      <span className="tabular ml-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-fg">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                )}

                {/* Emergency is a mode, not a filter — it replaces the result list. */}
                {medicine && (
                  <Chip
                    tone="danger"
                    size="sm"
                    selected={emergency}
                    onClick={() => setEmergency((v) => !v)}
                    className="hidden sm:inline-flex"
                  >
                    <Siren className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("home.emergency")}
                  </Chip>
                )}

                {mapAvailable && (
                  <div
                    className="flex rounded-xl border border-line bg-surface p-0.5"
                    role="tablist"
                    aria-label={t("home.viewMode")}
                  >
                    <button
                      role="tab"
                      type="button"
                      aria-selected={activeView === "list"}
                      onClick={() => setActiveTab("list")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[0.625rem] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                        activeView === "list"
                          ? "bg-surface-sunken text-fg"
                          : "text-fg-subtle hover:text-fg"
                      )}
                    >
                      <List className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("home.listView")}
                    </button>
                    <button
                      role="tab"
                      type="button"
                      aria-selected={activeView === "map"}
                      onClick={() => setActiveTab("map")}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-[0.625rem] px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring",
                        activeView === "map"
                          ? "bg-surface-sunken text-fg"
                          : "text-fg-subtle hover:text-fg"
                      )}
                    >
                      <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("home.mapView")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop filters */}
            {medicine && pharmacies.length > 0 && (
              <div className="hidden flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3 sm:flex">
                {filterControls("inline")}
                {(filterVerifiedOnly || filterInStockOnly || filterOpenNow || sortBy === "cheapest") && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      setFilterVerifiedOnly(false);
                      setFilterInStockOnly(false);
                      setFilterOpenNow(false);
                      setSortBy("nearest");
                    }}
                    className="ml-auto"
                  >
                    {t("common.clearFilters")}
                  </Button>
                )}
              </div>
            )}

            {/* Contextual nudge when search cannot run yet. */}
            {medicine && !location && !locLoading && (
              <p className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {t("home.enableLocationForDistance")}
              </p>
            )}
          </div>

          {/* List + map */}
          <div className={cn("grid gap-6 lg:gap-8", mapAvailable && "lg:grid-cols-12")}>
            <div
              className={cn(
                mapAvailable && "lg:col-span-5",
                "space-y-4",
                listVisible ? "block" : "hidden lg:block"
              )}
              aria-live="polite"
              aria-busy={searching}
            >
              {searching && <ListSkeleton count={3} />}

              {!searching && failed && (
                <EmptyState
                  tone="error"
                  icon={ShieldAlert}
                  title={t("home.searchFailed")}
                  body={t("home.searchFailedBody")}
                  action={
                    <Button
                      onClick={() => {
                        const controller = new AbortController();
                        searchAbortRef.current = controller;
                        void fetchPharmacyPage(null, false, controller.signal);
                      }}
                    >
                      {t("common.retry")}
                    </Button>
                  }
                />
              )}

              {!searching && !failed && medicine && pharmacies.length === 0 && (
                <EmptyState
                  icon={ShieldAlert}
                  title={t("home.empty.title")}
                  body={t("home.empty.body", { km: radiusKm })}
                  action={
                    <>
                      <ChipGroup label={t("home.radius")} icon={<SlidersHorizontal className="h-3 w-3" />}>
                        {[5, 10, 20].map((r) => (
                          <Chip key={r} selected={radiusKm === r} onClick={() => setRadiusKm(r)}>
                            {r} km
                          </Chip>
                        ))}
                      </ChipGroup>
                      {isPatient && (
                        <Link href="/how-it-works" className={buttonClasses({ variant: "secondary" })}>
                          {t("home.empty.learnMore")}
                        </Link>
                      )}
                    </>
                  }
                />
              )}

              {!searching && !medicine && pharmacies.length === 0 && (
                <EmptyState
                  icon={Pill}
                  title={t("home.start.title")}
                  body={t("home.start.body")}
                  action={
                    <>
                      {QUICK_PICKS.slice(0, 4).map((name) => (
                        <Link
                          key={name}
                          href={`/?q=${encodeURIComponent(name)}`}
                          scroll={false}
                          className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
                        >
                          {name}
                        </Link>
                      ))}
                    </>
                  }
                />
              )}

              {!searching && !failed && (
                <div
                  className={cn(
                    "space-y-3 sm:space-y-4",
                    lite ? "overflow-visible" : "max-h-[70vh] overflow-y-auto lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)]"
                  )}
                >
                  {(emergency && medicine ? [] : visiblePharmacies).map((p, i) => (
                    <div
                      key={p.id}
                      className={lite ? undefined : "animate-rise motion-reduce:animate-none"}
                      style={lite ? undefined : { animationDelay: `${Math.min(i, 8) * 45}ms` }}
                    >
                      <div
                        ref={(el) => {
                          pharmacyRefs.current[p.id] = el;
                        }}
                        onMouseEnter={() => setActivePharmacyId(p.id)}
                        onMouseLeave={() => setActivePharmacyId((cur) => (cur === p.id ? null : cur))}
                      >
                        <PharmacyCard
                          pharmacy={p}
                          onRequest={handleRequest}
                          requesting={requestingId === p.id}
                          canRequest={isPatient}
                          highlighted={activePharmacyId === p.id}
                          userLocation={location}
                          lite={lite}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!searching && !failed && visiblePharmacies.length === 0 && pharmacies.length > 0 && (
                <EmptyState
                  icon={Filter}
                  title={t("home.filteredOut.title")}
                  body={t("home.filteredOut.body")}
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setFilterVerifiedOnly(false);
                        setFilterInStockOnly(false);
                        setFilterOpenNow(false);
                      }}
                    >
                      {t("common.clearFilters")}
                    </Button>
                  }
                />
              )}

              {!searching && hasMorePharmacies && pharmacyCursor && (
                <Button
                  variant="outline"
                  block
                  onClick={loadMorePharmacies}
                  disabled={searching}
                >
                  {t("home.loadMore")}
                </Button>
              )}
            </div>

            {mapAvailable && (
              <div
                className={cn(
                  "relative h-[420px] overflow-hidden rounded-2xl border border-line shadow-card sm:h-[520px] lg:sticky lg:top-24 lg:h-[calc(100dvh-8rem)] lg:col-span-7",
                  activeView === "list" ? "hidden lg:block" : "block"
                )}
              >
                <MapViewClient
                  userLocation={location}
                  pharmacies={pharmacies}
                  activePharmacyId={activePharmacyId}
                  onSelectPharmacy={setActivePharmacyId}
                />

                {!medicine && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60 p-4 backdrop-blur-[2px] sm:p-6">
                    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center shadow-overlay">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                        <Search className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <h3 className="text-base font-semibold text-fg">{t("home.mapOverlay.title")}</h3>
                      <p className="mt-1 text-sm text-fg-muted">{t("home.mapOverlay.body")}</p>
                      <p className="mt-3 text-xs font-semibold text-accent">{t("home.mapOverlay.hint")}</p>
                    </div>
                  </div>
                )}

                {medicine && pharmacies.length > 0 && (
                  <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 py-2 text-xs font-medium text-fg-muted shadow-popover backdrop-blur sm:left-4 sm:right-auto">
                    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="truncate">
                      {t("home.mapSummary", { count: pharmacies.length, name: medicine.genericName })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>

      {/* ----------------------------------------------------- Mobile filters */}
      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("home.refine")}
        description={medicine ? medicine.genericName : undefined}
        footer={
          <Button block onClick={() => setFiltersOpen(false)}>
            {t("home.showResults", { count: visiblePharmacies.length })}
          </Button>
        }
      >
        <div className="flex flex-col gap-4">{filterControls("sheet")}</div>
      </Sheet>

      {liteModeReady && !lite && (
        <Suspense fallback={null}>
          <HomepageDetails />
        </Suspense>
      )}
    </div>
  );
};

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <HomePageContent />
    </Suspense>
  );
}
