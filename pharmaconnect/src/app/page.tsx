"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, LocateFixed, Stethoscope, ShieldCheck, 
  Clock, Star, Zap, Heart, PhoneCall, 
  CheckCircle2, ArrowRight, MessageCircle, 
  Award, Users, Globe, Search, Pill, Building2, ShieldAlert, Send
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PharmacyCard from "@/components/PharmacyCard";
import MapViewClient from "@/components/MapViewClient";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { MedicineDTO, NearbyPharmacyDTO } from "@/types";
import Link from "next/link";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6 }
};

export default function HomePage() {
  const { data: session } = useSession();
  const { location, error, loading: locLoading, requestLocation, setManualLocation } = useGeolocation();
  const [medicine, setMedicine] = useState<MedicineDTO | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacyDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);

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
  }, [medicine, location]);

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
      toast.success(`Request sent to ${pharmacy.name}`);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setRequestingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-24 pb-20 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      {/* 1. Hero Section - Redesigned for High Impact */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary-700 text-white">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-400/30 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20" 
               style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 backdrop-blur-md border border-white/20 shadow-sm"
          >
            <Stethoscope className="h-3.5 w-3.5" /> Nepal's Trusted Medicine Network
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl sm:text-7xl font-black mb-8 tracking-tight leading-[1.1]"
          >
            Find Your Medicine <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-200 to-blue-200">
              In Seconds, Not Hours
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-primary-100 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed opacity-90"
          >
            Stop the endless search. Get real-time stock availability from nearby pharmacies across Nepal.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="max-w-2xl mx-auto relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-white/40 to-blue-400/40 rounded-2xl blur-xl group-hover:blur-2xl transition duration-500"></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-2">
              <SearchBar onSelect={setMedicine} onClear={() => setMedicine(null)} selected={medicine} />
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-8 flex items-center justify-center gap-3 text-sm text-primary-100 font-medium"
          >
            <div className="flex items-center gap-1 text-primary-200 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <MapPin className="h-4 w-4" />
              {location ? (
                <span>📍 Your current location active</span>
              ) : (
                <button
                  onClick={requestLocation}
                  className="underline hover:text-white transition"
                >
                  {locLoading ? "Detecting..." : "Enable location for better results"}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. Quick Stats - Redesigned as a "Trust Bar" */}
      <section className="max-w-6xl mx-auto px-4 w-full -mt-12 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Verified Pharmacies", value: "500+", icon: <Building2 className="h-6 w-6" />, color: "bg-blue-500" },
            { label: "Medicine Types", value: "10k+", icon: <Pill className="h-6 w-6" />, color: "bg-indigo-500" },
            { label: "Daily Searches", value: "2k+", icon: <Search className="h-6 w-6" />, color: "bg-emerald-500" },
            { label: "Patients Helped", value: "50k+", icon: <Users className="h-6 w-6" />, color: "bg-amber-500" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -5 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center"
            >
              <div className={`${stat.color} text-white p-3 rounded-xl mb-4 shadow-lg`}>{stat.icon}</div>
              <div className="text-3xl font-black mb-1 text-slate-900 dark:text-white">{stat.value}</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. Search Results - Polished UI */}
      <section className="max-w-7xl mx-auto px-4 w-full">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5 space-y-8">
            <motion.div {...fadeIn}>
              <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
                <div className="p-2 bg-primary-600 text-white rounded-lg"><Pill className="h-6 w-6" /></div>
                {medicine ? (
                  <span>Pharmacies with <span className="text-primary-600">{medicine.genericName}</span></span>
                ) : (
                  <span className="text-slate-400">Ready to find your medicine?</span>
                )}
              </h2>
            </motion.div>

            {searching && <ListSkeleton count={3} />}

            {!searching && medicine && pharmacies.length === 0 && (
              <motion.div {...fadeIn}>
                <Card className="p-12 text-center space-y-6 border-dashed border-2 border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="bg-white dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <ShieldAlert className="h-10 w-10 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">No local stock found</h3>
                    <p className="text-slate-500">We couldn't find any pharmacies within range that currently stock this item.</p>
                  </div>
                  <Link href="/how-it-works">
                    <Button className="rounded-full px-8">Learn How to Request Stock</Button>
                  </Link>
                </Card>
              </motion.div>
            )}

            {!searching && (
              <div className="space-y-4">
                {pharmacies.map((p, i) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <PharmacyCard
                      pharmacy={p}
                      onRequest={handleRequest}
                      requesting={requestingId === p.id}
                      canRequest={!session || session.user.role === "PATIENT"}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 h-[600px] lg:h-full min-h-[600px] rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-2xl relative">
            <MapViewClient userLocation={location} pharmacies={pharmacies} />
            {!medicine && (
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-10 flex items-center justify-center p-6 text-center">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md">
                  <Search className="h-12 w-12 text-primary-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">Search to visualize</h3>
                  <p className="text-slate-500 mb-6">Enter a medicine name to see available pharmacies on the map.</p>
                  <div className="animate-bounce text-primary-600 font-bold text-sm">Scroll up to search ↑</div>
                </div>
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
              We've removed the friction from healthcare. No more phone calls, no more wasted trips.
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
              <motion.div 
                key={i} 
                {...fadeIn} 
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -10 }}
              >
                <Card className="p-8 h-full border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t-4 border-primary-600">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feat.color} text-white flex items-center justify-center mb-8 shadow-lg`}>
                    {feat.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feat.title}</h3>
                  <p className="text-slate-500 leading-relaxed text-lg">{feat.desc}</p>
                </Card>
              </motion.div>
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
                    "{t.text}"
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

      {/* 10. Footer - Brand Centric */}
      <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1 md:col-span-2">
              <Link href="/" className="flex items-center gap-2 font-black text-2xl text-primary-700 dark:text-primary-400 mb-6">
                <Stethoscope className="h-8 w-8" />
                PharmaConnect
              </Link>
              <p className="text-slate-500 max-w-sm leading-relaxed mb-8 text-lg">
                Empowering patients and pharmacies across Nepal with real-time availability data, reducing healthcare friction, and saving precious time.
              </p>
              <div className="flex gap-4">
                {[
                  { name: "Globe", icon: Globe },
                  { name: "MessageCircle", icon: MessageCircle },
                  { name: "PhoneCall", icon: PhoneCall },
                ].map(({ name, icon: Icon }) => (
                  <div key={name} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl cursor-pointer hover:bg-primary-600 hover:text-white transition-all duration-300 shadow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Quick Links</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><Link href="/" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> Search Medicines</Link></li>
                <li><Link href="/how-it-works" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> How it Works</Link></li>
                <li><Link href="/login" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> User Login</Link></li>
                <li><Link href="/register" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> Join as Pharmacy</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest text-sm">Support</h4>
              <ul className="space-y-4 text-slate-500 font-medium">
                <li><Link href="#" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> Contact Us</Link></li>
                <li><Link href="#" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-primary-600 transition-colors flex items-center gap-2"><ArrowRight className="h-3 w-3" /> FAQ</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} PharmaConnect Nepal. Engineered for a healthier nation.
          </div>
        </div>
      </footer>
    </div>
  );
}
