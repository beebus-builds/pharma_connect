"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import {
  MapPin,
  LocateFixed,
  Search,
  Pill,
  Building2,
  ShieldAlert,
  Navigation,
  SlidersHorizontal,
  List,
  Map as MapIcon,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PharmacyCard from "@/components/PharmacyCard";
import MapViewClient from "@/components/MapViewClient";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Tilt3D from "@/components/ui/Tilt3D";
import Hero3D from "@/components/ui/Hero3D";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useLiteMode } from "@/hooks/useLiteMode";
import type { MedicineDTO, NearbyPharmacyDTO } from "@/types";
import Link from "next/link";

const HomepageDetails = lazy(() => import("@/components/HomepageDetails"));

function CountUp({ value, label }: { value: string; label: string }) {
  return (
    <span>
      {value}
      <span className="sr-only">{label}</span>
    </span>
  );
}

const HomePage = () => {
  const { data: session } = useSession();
  const { location, error, loading: locLoading, requestLocation, setManualLocation } = useGeolocation();
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

  const heavyVisuals = liteModeReady && !lite;
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
        body: JSON.stringify({ pharmacyId: pharmacy.id, medicineId: pharmacy.medicine.id }),
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
    <div className="flex flex-col gap-16 sm:gap-24 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* 1. Hero Section */}
      <section className="relative pt-10 sm:pt-16 pb-10 sm:pb-14 bg-slate-900 text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-primary-900/30"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_50%)]" aria-hidden="true" />

        {/* Floating depth chips (desktop only, decorative, skipped in lite mode) */}
        {heavyVisuals && (
          <>
            <div
              aria-hidden="true"
              className="hidden lg:flex absolute top-24 right-[8%] z-20 items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl pointer-events-none"
            >
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Paracetamol 500mg</p>
                <p className="text-[10px] text-emerald-300 leading-tight">In stock · 1.2 km</p>
              </div>
              <Pill className="h-4 w-4 text-primary-300" />
            </div>
            <div
              aria-hidden="true"
              className="hidden lg:flex absolute bottom-16 right-[22%] z-20 items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl pointer-events-none"
            >
              <MapPin className="h-4 w-4 text-blue-300" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">4 pharmacies nearby</p>
                <p className="text-[10px] text-slate-300 leading-tight">Within 5 km radius</p>
              </div>
            </div>
          </>
        )}

        {/* 3D centerpiece (WebGL, desktop+ only; skipped in lite mode) */}
        {heavyVisuals && (
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[46%] z-0">
          <Hero3D className="h-full w-full" />
        </div>
        )}

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {session ? (
            <div className="space-y-5 max-w-3xl animate-slideUp motion-reduce:animate-none">
              <p className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" aria-hidden="true" /> Welcome back
              </p>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight">Welcome back, {session.user.name?.split(" ")[0] || "Patient"}</h1>
              <p className="text-slate-300 text-base sm:text-lg">Manage your requests and discover nearby stock in seconds.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href={session.user.role === "PHARMACY" ? "/dashboard/pharmacy" : "/dashboard/patient"}>
                  <Button className="rounded-full px-6">View My Requests</Button>
                </Link>
                <Link href="/how-it-works">
                  <Button variant="outline" className="rounded-full bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur">How it works</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4 animate-slideUp motion-reduce:animate-none">
                Find Your <span className="text-primary-300">Medicine</span> Nearby
              </h1>
              <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed animate-fadeIn motion-reduce:animate-none">
                Real-time stock from verified pharmacies across Nepal. No more calls — just search, find, and go.
              </p>
            </div>
          )}
           
          <div className="mt-8 sm:mt-10 max-w-2xl mx-auto lg:mx-0">
            <SearchBar onSelect={setMedicine} onClear={() => setMedicine(null)} selected={medicine} />
            {/* Location status */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {locLoading ? (
                <span className="inline-flex items-center gap-2 text-slate-300 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Detecting location…
                </span>
              ) : location ? (
                <span className="inline-flex items-center gap-2 text-emerald-200 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {location.lat.toFixed(3)}, {location.lng.toFixed(3)} · Within {radiusKm} km
                  <button onClick={requestLocation} className="ml-1 underline underline-offset-2 hover:text-white transition-colors">Update</button>
                </span>
              ) : error ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-amber-200 bg-amber-500/10 px-3 py-2 rounded-2xl border border-amber-500/20 max-w-full">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-[200px]">{error}</span>
                  <button onClick={requestLocation} className="inline-flex items-center gap-1 bg-white text-slate-900 px-3 py-1 rounded-full font-semibold text-xs hover:bg-slate-100 transition-colors shrink-0">
                    <LocateFixed className="h-3 w-3" /> Retry
                  </button>
                </span>
              ) : (
                <button onClick={requestLocation} className="inline-flex items-center gap-1.5 text-slate-300 hover:text-white bg-white/10 px-3 py-1.5 rounded-full border border-white/10 transition-colors">
                  <Navigation className="h-3.5 w-3.5" /> Enable location for nearest results
                </button>
              )}
            </div>
            {/* Radius chips - only show when medicine selected */}
            {medicine && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" /> Radius:
                </span>
                <div className="flex gap-1.5" role="group" aria-label="Search radius">
                  {[2, 5, 10, 20].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRadiusKm(r)}
                      aria-pressed={radiusKm === r}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
                        radiusKm === r
                          ? "bg-primary-600 text-white border-primary-600 shadow-md"
                          : "bg-white/10 text-slate-200 border-white/20 hover:bg-white/20 hover:text-white"
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
      </section>

      {/* 2. Quick Stats - real counts, no marketing fluff */}
      <section className="max-w-6xl mx-auto px-4 w-full -mt-6 sm:-mt-8 relative z-20">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[
            { label: "Verified Pharmacies", value: stats ? String(stats.verifiedPharmacies) : "—", icon: <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-blue-500" },
            { label: "Medicine Types", value: stats ? `${Math.round(stats.medicineCount / 100) / 10}k+` : "—", icon: <Pill className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-indigo-500" },
          ].map((stat, i) => (
            <Tilt3D key={i} maxTilt={10} disabled={lite} className="rounded-2xl">
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg sm:shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center h-full">
                <div className={`${stat.color} text-white p-2.5 sm:p-3 rounded-xl mb-3 sm:mb-4 shadow-lg`}>{stat.icon}</div>
                <div className="text-2xl sm:text-3xl font-black mb-1 text-slate-900 dark:text-white">
                  <CountUp value={stat.value} label={stat.label} />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</div>
              </div>
            </Tilt3D>
          ))}
        </div>
      </section>

      {/* 3. Search Results */}
      <section className="max-w-7xl mx-auto px-4 w-full" aria-live="polite" aria-busy={searching}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div className="min-w-0 animate-fadeIn motion-reduce:animate-none">
            <h2 className="text-2xl sm:text-3xl font-black flex items-center gap-3">
              <span className="p-2 bg-primary-600 text-white rounded-xl shadow-md shrink-0"><Pill className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" /></span>
              <span className="truncate">
                {medicine ? (
                  <span>Pharmacies with <span className="text-primary-600">{medicine.genericName}</span></span>
                ) : (
                  <span className="text-slate-400">Ready to find your medicine?</span>
                )}
              </span>
            </h2>
            {medicine && (
              <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-2">
                {searching ? (
                  <span className="inline-flex items-center gap-2"><span className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" /> Searching within {radiusKm} km…</span>
                ) : (
                  <span>{pharmacies.length} {pharmacies.length === 1 ? "pharmacy" : "pharmacies"} found · Sorted by distance</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mapAvailable && (
              <div className="lg:hidden flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist" aria-label="View mode">
                <button role="tab" aria-selected={activeView === "list"} onClick={() => setActiveTab("list")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeView === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                  <List className="h-4 w-4" aria-hidden="true" /> List {pharmacies.length > 0 && `(${pharmacies.length})`}
                </button>
                <button role="tab" aria-selected={activeView === "map"} onClick={() => setActiveTab("map")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeView === "map" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                  <MapIcon className="h-4 w-4" aria-hidden="true" /> Map
                </button>
              </div>
            )}
            {medicine && !location && !locLoading && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900">
                <MapPin className="h-3 w-3" /> Enable location for accurate distance
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
                    <h3 className="text-lg sm:text-xl font-bold mb-2">No local stock found</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">We couldn’t find pharmacies within {radiusKm} km with this item. Try a larger radius or send a request.</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <div className="flex gap-1.5">
                      {[5, 10, 20].map((r) => (
                        <button key={r} onClick={() => setRadiusKm(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${radiusKm === r ? "bg-primary-600 text-white border-primary-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>{r} km</button>
                      ))}
                    </div>
                  </div>
                  <Link href="/how-it-works">
                    <Button variant="outline" className="rounded-full px-6">Learn How to Request Stock</Button>
                  </Link>
                </Card>
              </div>
            )}

            {!searching && !medicine && pharmacies.length === 0 && (
              <Card className="p-8 text-center bg-gradient-to-br from-primary-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border-primary-100 dark:border-slate-700">
                <Pill className="h-10 w-10 text-primary-600 mx-auto mb-3" aria-hidden="true" />
                <h3 className="font-bold mb-1">Start your search</h3>
                <p className="text-sm text-slate-500 mb-1">Search for any generic or brand name above to see nearby availability.</p>
                <p className="text-xs text-slate-400">Tip: Try “Paracetamol” or “Amoxicillin”</p>
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
                Load more pharmacies
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
                    <h3 className="text-lg font-bold mb-1.5">Search to visualize</h3>
                    <p className="text-slate-500 text-sm mb-4">Enter a medicine name to see available pharmacies on the interactive map.</p>
                    <p className="text-xs font-semibold text-primary-600">↑ Use the search bar above</p>
                  </div>
                </div>
              )}
              {medicine && pharmacies.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 sm:left-4 sm:right-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-2 z-10">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" aria-hidden="true" />
                  {pharmacies.length} pharmacies · {medicine.genericName}
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

export default HomePage;
