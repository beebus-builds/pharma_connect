"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useInView,
  animate,
} from "framer-motion";
import { 
  MapPin, LocateFixed, Stethoscope, ShieldCheck, 
  Clock, Star, Zap, Heart, PhoneCall, 
  CheckCircle2, ArrowRight, MessageCircle, 
  Award, Users, Globe, Search, Pill, Building2, ShieldAlert, Send, Navigation, SlidersHorizontal, List, Map as MapIcon
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
import type { MedicineDTO, NearbyPharmacyDTO } from "@/types";
import Link from "next/link";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

/** Animated number that counts up when scrolled into view. */
function CountUp({ value, label }: { value: string; label: string }) {
  const m = value.match(/^(\D*)([\d,.]+)(.*)$/);
  const prefix = m?.[1] ?? "";
  const suffix = m?.[3] ?? "";
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : 0;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const valid = Boolean(m);

  const raw = useMotionValue(0);
  const display = useTransform(raw, (v) =>
    `${prefix}${v.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`
  );
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  useEffect(() => {
    if (!inView || !valid) return;
    const controls = animate(raw, target, { duration: 1.4, ease: "easeOut" });
    return controls.stop;
  }, [inView, valid, raw, target]);

  return (
    <span ref={ref}>
      <motion.span>{valid ? display : value}</motion.span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

const HomePage = () => {
  const { data: session } = useSession();
  const { location, error, loading: locLoading, requestLocation, setManualLocation } = useGeolocation();
  const [medicine, setMedicine] = useState<MedicineDTO | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacyDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"list" | "map">("list");
  const [activePharmacyId, setActivePharmacyId] = useState<string | null>(null);
  const pharmacyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const shouldReduceMotion = useReducedMotion();

  // Hero parallax: cursor position normalized to -1..1, spring-smoothed
  const heroMx = useMotionValue(0);
  const heroMy = useMotionValue(0);
  const heroSx = useSpring(heroMx, { stiffness: 60, damping: 20 });
  const heroSy = useSpring(heroMy, { stiffness: 60, damping: 20 });
  const chip1X = useTransform(heroSx, [-1, 1], [-20, 20]);
  const chip1Y = useTransform(heroSy, [-1, 1], [-14, 14]);
  const chip2X = useTransform(heroSx, [-1, 1], [16, -16]);
  const chip2Y = useTransform(heroSy, [-1, 1], [12, -12]);
  const blobX = useTransform(heroSx, [-1, 1], [-30, 30]);
  const blobY = useTransform(heroSy, [-1, 1], [-20, 20]);

  function handleHeroMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    heroMx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
    heroMy.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
  }

  // Scroll the corresponding list card into view when a pin is clicked on the map
  useEffect(() => {
    if (!activePharmacyId) return;
    const el = pharmacyRefs.current[activePharmacyId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activePharmacyId]);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!medicine || !location) return;

    const fetchPharmacies = async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          lat: String(location.lat),
          lng: String(location.lng),
          medicineId: medicine.id,
          radiusKm: String(radiusKm),
        });
        const res = await fetch(`/api/pharmacies/nearby?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load pharmacies");
        setPharmacies(data.pharmacies ?? []);
        if ((data.pharmacies ?? []).length === 0) {
          toast("No nearby pharmacies currently have this medicine in stock", { icon: "ℹ️" });
        }
      } catch (e: any) {
        toast.error(e.message || "Something went wrong");
      } finally {
        setSearching(false);
      }
    };

    fetchPharmacies();
  }, [medicine, location, radiusKm]);

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
      <section
        className="relative pt-10 sm:pt-16 pb-10 sm:pb-14 bg-slate-900 text-white overflow-hidden"
        onMouseMove={handleHeroMouseMove}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-primary-900/30"
          aria-hidden="true"
          style={shouldReduceMotion ? undefined : { x: blobX, y: blobY, scale: 1.08 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.06),transparent_50%)]" aria-hidden="true" />

        {/* Floating depth chips (desktop only, decorative) */}
        {!shouldReduceMotion && (
          <>
            <motion.div
              aria-hidden="true"
              style={{ x: chip1X, y: chip1Y }}
              className="hidden lg:flex absolute top-24 right-[8%] z-20 items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl pointer-events-none"
            >
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Paracetamol 500mg</p>
                <p className="text-[10px] text-emerald-300 leading-tight">In stock · 1.2 km</p>
              </div>
              <Pill className="h-4 w-4 text-primary-300" />
            </motion.div>
            <motion.div
              aria-hidden="true"
              style={{ x: chip2X, y: chip2Y }}
              className="hidden lg:flex absolute bottom-16 right-[22%] z-20 items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl pointer-events-none"
            >
              <MapPin className="h-4 w-4 text-blue-300" />
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">4 pharmacies nearby</p>
                <p className="text-[10px] text-slate-300 leading-tight">Within 5 km radius</p>
              </div>
            </motion.div>
          </>
        )}

        {/* 3D centerpiece (WebGL, desktop+ only; degrades to CSS pill) */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[46%] z-0">
          <Hero3D className="h-full w-full" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4">
          {session ? (
            <motion.div initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-3xl">
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
            </motion.div>
          ) : (
            <div className="text-center max-w-3xl mx-auto">
              <motion.h1 initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-4">
                Find Your <span className="text-primary-300">Medicine</span> Nearby
              </motion.h1>
              <motion.p initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Real-time stock from verified pharmacies across Nepal. No more calls — just search, find, and go.
              </motion.p>
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

      {/* 2. Quick Stats - Trust Bar */}
      <section className="max-w-6xl mx-auto px-4 w-full -mt-6 sm:-mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: "Verified Pharmacies", value: "500+", icon: <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-blue-500" },
            { label: "Medicine Types", value: "10k+", icon: <Pill className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-indigo-500" },
            { label: "Daily Searches", value: "2k+", icon: <Search className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-emerald-500" },
            { label: "Patients Helped", value: "50k+", icon: <Users className="h-5 w-5 sm:h-6 sm:w-6" />, color: "bg-amber-500" },
          ].map((stat, i) => (
            <Tilt3D key={i} maxTilt={10} className="rounded-2xl">
              <motion.div
                whileHover={shouldReduceMotion ? {} : { y: -6 }}
                className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-lg sm:shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center h-full"
              >
                <div className={`${stat.color} text-white p-2.5 sm:p-3 rounded-xl mb-3 sm:mb-4 shadow-lg`}>{stat.icon}</div>
                <div className="text-2xl sm:text-3xl font-black mb-1 text-slate-900 dark:text-white">
                  <CountUp value={stat.value} label={stat.label} />
                </div>
                <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-tight">{stat.label}</div>
              </motion.div>
            </Tilt3D>
          ))}
        </div>
      </section>

      {/* 3. Search Results */}
      <section className="max-w-7xl mx-auto px-4 w-full" aria-live="polite" aria-busy={searching}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <motion.div {...fadeIn} className="min-w-0">
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
          </motion.div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="lg:hidden flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl" role="tablist" aria-label="View mode">
              <button role="tab" aria-selected={activeTab === "list"} onClick={() => setActiveTab("list")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeTab === "list" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                <List className="h-4 w-4" aria-hidden="true" /> List {pharmacies.length > 0 && `(${pharmacies.length})`}
              </button>
              <button role="tab" aria-selected={activeTab === "map"} onClick={() => setActiveTab("map")} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${activeTab === "map" ? "bg-white dark:bg-slate-700 shadow-sm text-primary-600 dark:text-white" : "text-slate-500"}`}>
                <MapIcon className="h-4 w-4" aria-hidden="true" /> Map
              </button>
            </div>
            {medicine && !location && !locLoading && (
              <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-900">
                <MapPin className="h-3 w-3" /> Enable location for accurate distance
              </span>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
          <div className={`lg:col-span-5 space-y-4 ${activeTab === "map" ? "hidden lg:block" : "block"}`}>
            {searching && <ListSkeleton count={3} />}

            {!searching && medicine && pharmacies.length === 0 && (
              <motion.div {...(shouldReduceMotion ? {} : fadeIn)}>
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
              </motion.div>
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
              <div className="space-y-3 sm:space-y-4 max-h-[70vh] lg:max-h-[600px] overflow-y-auto pr-1 -mr-1">
                {pharmacies.map((p, i) => (
                  <motion.div 
                    key={p.id} 
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: shouldReduceMotion ? 0 : i * 0.05 }}
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
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className={`lg:col-span-7 h-[420px] sm:h-[520px] lg:h-[600px] lg:sticky lg:top-20 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative ${activeTab === "list" ? "hidden lg:block" : "block"}`}>
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
        </div>
      </section>

      {/* 4. Features - Glassmorphism Design */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-slate-100 dark:bg-slate-900/30 -z-10" />
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-20">
            <motion.h2 {...fadeIn} className="text-4xl font-black mb-4">Engineered for Efficiency</motion.h2>
            <motion.p {...fadeIn} transition={{ delay: 0.2 }} className="text-slate-500 max-w-2xl mx-auto text-lg">
              We&apos;ve removed the friction from healthcare. No more phone calls, no more wasted trips.
            </motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                title: "Real-time Inventory", 
                desc: "Direct sync with pharmacy stock levels ensures you get accurate data instantly.",
                icon: <Zap className="h-6 w-6" />,
                color: "from-amber-400 to-orange-500"
              },
              { 
                title: "Precise Geolocation", 
                desc: "Powered by advanced mapping to find the absolute closest option for urgent needs.",
                icon: <MapPin className="h-6 w-6" />,
                color: "from-blue-400 to-indigo-500"
              },
              { 
                title: "Direct Request Line", 
                desc: "Bridge the gap by requesting out-of-stock medicines directly from your preferred shop.",
                icon: <Send className="h-6 w-6" />,
                color: "from-emerald-400 to-teal-500"
              },
            ].map((feat, i) => (
              <Tilt3D key={i} maxTilt={6} className="h-full">
                <motion.div 
                  {...fadeIn} 
                  transition={{ delay: i * 0.2 }}
                  className="h-full"
                >
                  <Card className="p-8 h-full border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t-4 border-primary-600">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center mb-8 shadow-lg`}>
                      {feat.icon}
                    </div>
                    <h3 className="text-2xl font-bold mb-4">{feat.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-lg">{feat.desc}</p>
                  </Card>
                </motion.div>
              </Tilt3D>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Testimonials - Modern Social Proof */}
      <section className="max-w-6xl mx-auto px-4 w-full">
        <div className="text-center mb-16">
          <motion.div {...fadeIn} className="inline-block p-2 bg-primary-100 text-primary-600 rounded-lg text-xs font-bold uppercase tracking-widest mb-4">
            User Stories
          </motion.div>
          <motion.h2 {...fadeIn} transition={{ delay: 0.1 }} className="text-4xl font-black mb-4">Trusted by Thousands</motion.h2>
          <motion.p {...fadeIn} transition={{ delay: 0.2 }} className="text-slate-500 max-w-2xl mx-auto text-lg">
            Join the community of patients and pharmacists making healthcare accessible in Nepal.
          </motion.p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { 
              name: "Suman Thapa", 
              role: "Patient", 
              text: "PharmaConnect saved me from visiting five different stores for my father's insulin. It is a lifesaver for anyone with chronic conditions.",
              rating: 5,
              avatar: "ST"
            },
            { 
              name: "Dr. Anita Sharma", 
              role: "Pharmacy Owner", 
              text: "It helps us understand the local demand better. We now stock items that patients actually need, reducing wastage.",
              rating: 5,
              avatar: "AS"
            },
            { 
              name: "Rajesh Gupta", 
              role: "Patient", 
              text: "The map view is so intuitive. I can find the nearest option in seconds without making a single phone call.",
              rating: 4,
              avatar: "RG"
            },
          ].map((t, i) => (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.2 }}>
              <Card className="p-8 h-full flex flex-col justify-between border-none shadow-xl bg-white dark:bg-slate-900 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <MessageCircle className="h-20 w-20 text-primary-600" />
                </div>
                <div>
                  <div className="flex gap-1 text-amber-400 mb-6">
                    {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-5 w-5 fill-current" />)}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-lg italic mb-8 leading-relaxed relative z-10">
                    &quot;{t.text}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-4 border-t pt-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs font-medium text-slate-500 uppercase">{t.role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 6. How it Works - Visual Timeline */}
      <section className="bg-primary-900 text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[120px]"></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <motion.h2 {...fadeIn} className="text-4xl font-black mb-4">The Path to Your Medicine</motion.h2>
            <motion.p {...fadeIn} transition={{ delay: 0.1 }} className="text-primary-200 max-w-2xl mx-auto text-lg">
              Three simple steps to ensure you never leave a pharmacy empty-handed.
            </motion.p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            {/* Visual Connector Line (Desktop) */}
            <div className="hidden md:block absolute top-16 left-0 w-full h-1 bg-white/10 z-0"></div>
            
            {[
              { step: "01", title: "Instant Search", desc: "Use our smart search to find generic or brand name medicines available in your city.", icon: <Search className="h-8 w-8" /> },
              { step: "02", title: "Smart Mapping", desc: "Instantly visualize the closest pharmacies on an interactive map with precise distances.", icon: <MapPin className="h-8 w-8" /> },
              { step: "03", title: "Quick Acquisition", desc: "Visit the store with confidence or request stock for future availability.", icon: <CheckCircle2 className="h-8 w-8" /> },
            ].map((s, i) => (
              <motion.div 
                key={i} 
                {...fadeIn} 
                transition={{ delay: i * 0.2 }}
                className="text-center relative z-10 group"
              >
                <div className="relative inline-block mb-8">
                  <div className="absolute -top-6 -left-6 text-6xl font-black text-white/10 group-hover:text-white/20 transition">{s.step}</div>
                  <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/20 group-hover:bg-white group-hover:text-primary-700 transition-all duration-500 shadow-2xl">
                    {s.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
                <p className="text-primary-100 text-base leading-relaxed opacity-80">{s.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="mt-20 text-center">
            <Link href="/how-it-works">
              <Button variant="secondary" className="px-10 py-6 rounded-full text-lg font-bold shadow-xl hover:scale-105 transition">
                Detailed User Guide
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Value Proposition - Asymmetrical Modern Grid */}
      <section className="max-w-6xl mx-auto px-4 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-8 bg-primary-500/10 rounded-full blur-3xl"></div>
            <div className="relative grid grid-cols-2 gap-6">
              <Card className="p-6 bg-white dark:bg-slate-900 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-300 border-b-4 border-red-500">
                <Heart className="h-8 w-8 text-red-500 mb-4" />
                <h4 className="font-bold text-lg mb-1">Patient Centric</h4>
                <p className="text-xs text-slate-500">Reducing the stress of medicine hunting.</p>
              </Card>
              <Card className="p-6 bg-white dark:bg-slate-900 shadow-2xl -rotate-3 hover:rotate-0 transition-transform duration-300 border-b-4 border-blue-500 mt-12">
                <Clock className="h-8 w-8 text-blue-500 mb-4" />
                <h4 className="font-bold text-lg mb-1">Time Optimized</h4>
                <p className="text-xs text-slate-500">Saving hours of travel time per search.</p>
              </Card>
              <Card className="p-6 bg-white dark:bg-slate-900 shadow-2xl -rotate-1 hover:rotate-0 transition-transform duration-300 border-b-4 border-yellow-500">
                <Award className="h-8 w-8 text-yellow-500 mb-4" />
                <h4 className="font-bold text-lg mb-1">Verified Data</h4>
                <p className="text-xs text-slate-500">Validated pharmacy license records.</p>
              </Card>
              <Card className="p-6 bg-white dark:bg-slate-900 shadow-2xl rotate-6 hover:rotate-0 transition-transform duration-300 border-b-4 border-green-500 mt-12">
                <Globe className="h-8 w-8 text-green-500 mb-4" />
                <h4 className="font-bold text-lg mb-1">City Wide</h4>
                <p className="text-xs text-slate-500">Expanding coverage across all districts.</p>
              </Card>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <motion.div {...fadeIn}>
              <h2 className="text-4xl font-black mb-8 leading-tight">Redefining <br /><span className="text-primary-600">Medicine Access</span> in Nepal</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-10 text-lg leading-relaxed">
                Finding a specific brand or generic medicine can be a nightmare. PharmaConnect bridges the gap between pharmacies and patients through real-time data sharing.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Instant stock visibility",
                  "Distance-based sorting",
                  "Direct pharmacy requests",
                  "Verified pharmacy network",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                    <div className="bg-green-100 text-green-600 rounded-full p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 8. FAQ - Clean Minimalist Accordion Style */}
      <section className="bg-slate-100 dark:bg-slate-900/50 py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 {...fadeIn} className="text-4xl font-black mb-4">Common Questions</motion.h2>
            <motion.p {...fadeIn} transition={{ delay: 0.1 }} className="text-slate-500 text-lg">Everything you need to know about using PharmaConnect.</motion.p>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is this service free for patients?", a: "Absolutely. PharmaConnect is a free public utility aimed at improving healthcare accessibility for every citizen of Nepal." },
              { q: "How accurate is the stock information?", a: "We use direct updates from pharmacy owners. While we strive for 100% accuracy, we always recommend a quick phone call using the number provided in the app before visiting." },
              { q: "Can I order medicines online?", a: "No. To ensure safety and regulatory compliance, we only provide availability data. Purchase and pickup must happen directly at the pharmacy." },
              { q: "How can a pharmacy join the network?", a: "Owners can register via the 'Join as Pharmacy' section. Our team reviews the license number before enabling the pharmacy's profile." },
            ].map((faq, i) => (
              <motion.div 
                key={i} 
                {...fadeIn} 
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <Card className="p-6 border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-bold text-lg pr-4">{faq.q}</h4>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <p className="text-slate-500 mt-4 leading-relaxed text-sm">{faq.a}</p>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CTA - High Contrast Conversion Zone */}
        <section className="max-w-6xl mx-auto px-4 w-full pb-20">
          <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -ml-48 -mb-48"></div>
            <div className="relative z-10">
              <motion.h2 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                className="text-4xl sm:text-6xl font-black mb-8 leading-tight"
              >
                Stop Searching. <br />Start Finding.
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-primary-100 max-w-2xl mx-auto mb-12 text-xl opacity-90"
              >
                Join the healthcare revolution in Nepal. Experience the fastest way to locate essential medicines.
              </motion.p>
              <div className="flex flex-wrap justify-center gap-6">
                <Link href="/">
                  <Button variant="secondary" className="px-10 py-7 text-lg font-black rounded-full shadow-xl hover:scale-105 transition">
                    Find Medicine Now
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="outline" className="px-10 py-7 text-lg font-black rounded-full bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm transition hover:scale-105">
                    Join as Pharmacy
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
};

export default HomePage;

