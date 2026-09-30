"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Providers";
import { useRouter, useSearchParams } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import {
  MapPin,
  LocateFixed,
  Search,
  Pill,
  ShieldAlert,
  Navigation,
  SlidersHorizontal,
  List,
  Map as MapIcon,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PharmacyCard from "@/components/PharmacyCard";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLiteMode } from "@/hooks/useLiteMode";
import { useLocale } from "@/components/LocaleProvider";
import type { MedicineDTO, NearbyPharmacyDTO } from "@/types";
import Link from "next/link";

const HomepageDetails = lazy(() => import("@/components/HomepageDetails"));
// The map is only ever rendered when lite mode is off. A plain runtime
// `lite` check is not enough — the module still ships in the critical path — so
// it stays a dynamic import. See scripts/check-bundle-budget.mjs.
const MapViewClient = dynamic(() => import("@/components/MapViewClient"), { ssr: false });

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
  const searchAbortRef = useRef<AbortController | null>(null);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const pharmacyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { lite, ready: liteModeReady } = useLiteMode();
  const { t } = useLocale();
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [stats, setStats] = useState<{ verifiedPharmacies: number; medicineCount: number } | null>(null);

  // Real trust-bar counts — replaces hardcoded marketing numbers.
  useEffect(() => {
    fetch("/api/stats/public")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.verifiedPharmacies === "number") setStats(d);
      })
      .catch(() => {});
  }, []);

  const mapAvailable = liteModeReady && !lite;
  const activeView = lite ? "list" : activeTab;
  const listVisible = !mapAvailable || activeView === "list";

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
        if (!res.ok) throw new Error(data.error || "Failed to load pharmacies");

        const next = (data.pharmacies ?? []) as NearbyPharmacyDTO[];
        setPharmacies((previous) => {
          if (!append) return next;
          const existing = new Set(previous.map((pharmacy) => pharmacy.id));
          return [...previous, ...next.filter((pharmacy) => !existing.has(pharmacy.id))];
        });
        setPharmacyCursor(data.pagination?.nextCursor ?? null);
        setHasMorePharmacies(Boolean(data.pagination?.hasMore));

        if (!append && next.length === 0) {
          toast("No nearby pharmacies currently have this medicine in stock", { icon: "ℹ️" });
        }
      } catch (e: any) {
        if (e.name !== "AbortError") toast.error(e.message || "Something went wrong");
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
      toast.error("Please log in as a patient to send a request");
      return;
    }
    if (session.user.role !== "PATIENT") {
      toast.error("Only patient accounts can send requests");
      return;
    }
    setRequestingId(pharmacy.id);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pharmacyId: pharmacy.pharmacyId, locationId: pharmacy.id, medicineId: pharmacy.medicine.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send request");
      toast.success(`Request sent to ${pharmacy.name} — opening chat…`);
      // Auto-open realtime chat
      setTimeout(() => router.push(`/chat/${data.request.id}`), 600);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-14 sm:gap-20 pb-20 transition-colors duration-500">
      {/* 1. Hero — editorial, left-aligned */}
      <section className="relative border-b rule pt-10 sm:pt-16 pb-10 sm:pb-14 overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto px-4 grid gap-10 lg:grid-cols-[5fr_3fr] lg:items-start">
          <div>
          {session ? (
            <div className="space-y-5 max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-primary-700 dark:text-primary-300">
                <span className="w-6 h-px bg-primary-700 dark:bg-primary-300" aria-hidden="true" /> {t("home.welcomeBack")}
              </p>
              <h1 className="headline font-display text-4xl sm:text-5xl text-ink dark:text-white">Welcome back, {session.user.name?.split(" ")[0] || "Patient"}</h1>
              <p className="lede text-stone-600 dark:text-slate-300 text-base sm:text-lg max-w-[52ch]">{t("home.welcomeSubtitle")}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={session.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient"}>
                  <Button className="rounded-lg px-6">{t("home.viewRequests")}</Button>
                </Link>
                <Link href="/how-it-works">
                  <Button variant="secondary" className="rounded-lg">{t("home.howItWorks")}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase text-primary-700 dark:text-primary-300 mb-5">
                <span className="w-6 h-px bg-primary-700 dark:bg-primary-300" aria-hidden="true" />
                Kathmandu · Lalitpur · Bhaktapur — live stock
              </p>
              <h1 className="headline font-display text-[2.75rem] sm:text-6xl text-ink dark:text-white">
                Which pharmacy has your medicine — right now?
              </h1>
              <p className="lede text-stone-600 dark:text-slate-300 text-base sm:text-lg mt-4 max-w-[52ch]">
                Search the shared catalog, see who holds it within walking distance, and message the counter directly. No account needed to look.
              </p>
            </div>
          )}

          <div className="mt-8 max-w-2xl">
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 p-2">
              <SearchBar
                onSelect={setMedicine}
                onClear={() => setMedicine(null)}
                selected={medicine}
                initialQuery={deepLinkQuery}
              />
            </div>
            {/* Location status */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {locLoading ? (
                <span className="inline-flex items-center gap-2 text-stone-500 bg-white px-3 py-1.5 rounded-lg border border-stone-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700">
                  <span className="w-3 h-3 border-2 border-stone-300 border-t-primary-700 rounded-full animate-spin" aria-hidden="true" />
                  {t("home.detectingLocation")}
                </span>
              ) : location ? (
                <span className="inline-flex items-center gap-2 text-primary-800 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200 dark:bg-primary-500/10 dark:text-primary-300 dark:border-primary-400/20">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location.lat.toFixed(3)}, {location.lng.toFixed(3)} · Within {radiusKm} km
                  <button onClick={requestLocation} className="ml-1 underline underline-offset-2 hover:opacity-80 transition-opacity">{t("home.updateLocation")}</button>
                </span>
              ) : error ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-amber-800 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-400/20 max-w-full">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-[200px]">{error}</span>
                  <button onClick={requestLocation} className="inline-flex items-center gap-1 bg-ink text-white px-3 py-1 rounded-md font-semibold text-xs hover:opacity-90 transition-opacity shrink-0">
                    <LocateFixed className="h-3 w-3" /> {t("home.retry")}
                  </button>
                </span>
              ) : (
                <button onClick={requestLocation} className="inline-flex items-center gap-1.5 text-stone-600 hover:text-ink bg-white px-3 py-1.5 rounded-lg border border-stone-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700 transition-colors">
                  <Navigation className="h-3.5 w-3.5" /> {t("home.enableLocation")}
                </button>
              )}
            </div>
            {/* Radius chips - only show when medicine selected */}
            {medicine && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-500 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" /> {t("home.radius")}:
                </span>
                <div className="flex gap-1.5" role="group" aria-label="Search radius">
                  {[2, 5, 10, 20].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      aria-pressed={radiusKm === r}
                      className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/30 ${
                        radiusKm === r
                          ? "bg-ink text-white border-ink dark:bg-white dark:text-ink dark:border-white"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {r} km
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          </div>

          {/* Ledger — real numbers, how it works as numbered steps */}
          <aside className="border border-stone-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 divide-y divide-stone-200/70 dark:divide-slate-800">
            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-slate-400">Live ledger</p>
              <dl className="mt-3 space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-stone-600 dark:text-slate-300">Verified pharmacies</dt>
                  <dd className="font-display text-2xl text-ink dark:text-white">{stats ? stats.verifiedPharmacies : "—"}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-sm text-stone-600 dark:text-slate-300">Catalog entries</dt>
                  <dd className="font-display text-2xl text-ink dark:text-white">{stats ? `${Math.round(stats.medicineCount / 100) / 10}k` : "—"}</dd>
                </div>
              </dl>
            </div>
            <ol className="p-5 space-y-4">
              {[
                ["01", "Search", "Generic or brand — the catalog is shared across every counter."],
                ["02", "Request", "Out of stock? One tap asks the pharmacist directly."],
                ["03", "Chat", "Realtime thread per request, prescription photo if needed."],
              ].map(([n, title, body]) => (
                <li key={n} className="flex gap-4">
                  <span className="font-display text-sm text-primary-700 dark:text-primary-300 pt-0.5">{n}</span>
                  <div>
                    <p className="text-sm font-bold text-ink dark:text-white">{title}</p>
                    <p className="text-sm text-stone-600 dark:text-slate-300 leading-relaxed">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </section>

      {/* 3. Search Results */}
      <section
        id="pharmacies"
        className="max-w-7xl mx-auto px-4 w-full scroll-mt-24"
        aria-live="polite"
        aria-busy={searching}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 dark:text-slate-400">Nearby counters</p>
            <h2 className="headline font-display text-2xl sm:text-3xl text-ink dark:text-white mt-1">
              <span className="truncate">
                {medicine ? (
                  <span>Who holds <span className="italic">{medicine.genericName}</span></span>
                ) : (
                  <span className="text-stone-400 dark:text-slate-500">{t("home.readyPrompt")}</span>
                )}
              </span>
            </h2>
            {medicine && (
              <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-2">
                {searching ? (
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" /> {t("home.searchingWithin", { km: radiusKm })}</span>
                ) : (
                  <span>{t("home.foundCount", { count: pharmacies.length })}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mapAvailable && (
              <div className="lg:hidden flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist" aria-label="View mode">
                <button role="tab" aria-selected={activeView === "list"} onClick={() => setActiveTab("list")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeView === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                  <List className="h-4 w-4" aria-hidden="true" /> {t("home.listView")} {pharmacies.length > 0 && `(${pharmacies.length})`}
                </button>
                <button role="tab" aria-selected={activeView === "map"} onClick={() => setActiveTab("map")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeView === "map" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                  <MapIcon className="h-4 w-4" aria-hidden="true" /> {t("home.mapView")}
                </button>
              </div>
            )}
            {medicine && !location && !locLoading && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900">
                <MapPin className="h-3 w-3" /> {t("home.enableLocationForDistance")}
              </span>
            )}
          </div>
        </div>

        <div className={`grid gap-6 lg:gap-10 ${mapAvailable ? "lg:grid-cols-12" : ""}`}>
          <div className={`${mapAvailable ? "lg:col-span-5" : ""} space-y-4 ${listVisible ? "block" : "hidden lg:block"}`}>
            {searching && <ListSkeleton count={3} />}

            {!searching && medicine && pharmacies.length === 0 && (
              <div className="animate-fadeIn motion-reduce:animate-none">
                <Card className="p-8 sm:p-10 text-center space-y-5 border-dashed border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{t("home.empty.title")}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{t("home.empty.body", { km: radiusKm })}</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="flex gap-1.5">
                      {[5, 10, 20].map((r) => (
                        <button key={r} onClick={() => setRadiusKm(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${radiusKm === r ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>{r} km</button>
                      ))}
                    </div>
                  </div>
                  <Link href="/how-it-works">
                    <Button variant="outline" className="rounded-lg px-6">{t("home.empty.learnMore")}</Button>
                  </Link>
                </Card>
              </div>
            )}

            {!searching && !medicine && pharmacies.length === 0 && (
              <Card className="p-8 text-center bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-primary-100 dark:border-slate-700">
                <Pill className="h-10 w-10 text-primary-600 mx-auto mb-3" aria-hidden="true" />
                <h3 className="font-bold mb-1">{t("home.start.title")}</h3>
                <p className="text-sm text-slate-500 mb-1">{t("home.start.body")}</p>
                <p className="text-xs text-slate-400">{t("home.start.tip")}</p>
              </Card>
            )}

            {!searching && (
              <div className={`space-y-3 sm:space-y-4 ${lite ? "overflow-visible" : "max-h-[70vh] lg:max-h-[600px] overflow-y-auto pr-1 -mr-1"}`}>
                {pharmacies.map((p, i) => (
                  <div
                    key={p.id}
                    className={lite ? "" : "animate-slideUp motion-reduce:animate-none"}
                    style={lite ? undefined : { animationDelay: `${i * 50}ms` }}
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
                        canRequest={!session || session.user.role === "PATIENT"}
                        highlighted={activePharmacyId === p.id}
                        userLocation={location}
                        lite={lite}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!searching && hasMorePharmacies && pharmacyCursor && (
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={loadMorePharmacies}
                disabled={searching}
              >
                {t("home.loadMore")}
              </Button>
            )}
          </div>

          {mapAvailable && (
            <div className={`lg:col-span-7 h-[420px] sm:h-[520px] lg:h-[600px] lg:sticky lg:top-20 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative ${activeView === "list" ? "hidden lg:block" : "block"}`}>
              <MapViewClient
                userLocation={location}
                pharmacies={pharmacies}
                activePharmacyId={activePharmacyId}
                onSelectPharmacy={setActivePharmacyId}
              />
              {!medicine && (
                <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] z-10 flex items-center justify-center p-4 sm:p-6 text-center">
                  <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl max-w-sm w-full">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Search className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold mb-1.5">{t("home.mapOverlay.title")}</h3>
                    <p className="text-slate-500 text-sm mb-4">{t("home.mapOverlay.body")}</p>
                    <p className="text-xs font-semibold text-primary-600">{t("home.mapOverlay.hint")}</p>
                  </div>
                </div>
              )}
              {medicine && pharmacies.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-2 z-10">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
                  {t("home.mapSummary", { count: pharmacies.length, name: medicine.genericName })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

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
    <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-950" />}>
      <HomePageContent />
    </Suspense>
  );
}
