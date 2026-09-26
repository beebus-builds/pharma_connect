"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const faqs = [
  {
    q: "Is this service free for patients?",
    a: "Absolutely. PharmaConnect is a free public utility aimed at improving healthcare accessibility for every citizen of Nepal.",
  },
  {
    q: "How accurate is the stock information?",
    a: "We use direct updates from pharmacy owners. While we strive for 100% accuracy, we always recommend a quick phone call using the number provided in the app before visiting.",
  },
  {
    q: "Can I order medicines online?",
    a: "No. To ensure safety and regulatory compliance, we only provide availability data. Purchase and pickup must happen directly at the pharmacy.",
  },
  {
    q: "How can a pharmacy join the network?",
    a: "Owners can register via the 'Join as Pharmacy' section. Our team reviews the license number before enabling the pharmacy's profile.",
  },
];

export default function HomepageDetails() {
  return (
    <>
      <section className="bg-primary-900 text-white py-24 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[120px]" />
        </div>
        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black mb-4 animate-fadeIn motion-reduce:animate-none">The Path to Your Medicine</h2>
            <p className="text-primary-200 max-w-2xl mx-auto text-lg animate-fadeIn motion-reduce:animate-none">
              Three simple steps to ensure you never leave a pharmacy empty-handed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-16 left-0 w-full h-1 bg-white/10 z-0" />
            {[
              { step: "01", title: "Instant Search", desc: "Use our smart search to find generic or brand name medicines available in your city.", icon: <Search className="h-8 w-8" /> },
              { step: "02", title: "Smart Mapping", desc: "Instantly visualize the closest pharmacies on an interactive map with precise distances.", icon: <MapPin className="h-8 w-8" /> },
              { step: "03", title: "Quick Acquisition", desc: "Visit the store with confidence or request stock for future availability.", icon: <CheckCircle2 className="h-8 w-8" /> },
            ].map((step, index) => (
              <div
                key={step.step}
                className="text-center relative z-10 group animate-fadeIn motion-reduce:animate-none"
                style={{ animationDelay: `${index * 200}ms` }}
              >
                <div className="relative inline-block mb-8">
                  <div className="absolute -top-6 -left-6 text-6xl font-black text-white/10 group-hover:text-white/20 transition">{step.step}</div>
                  <div className="w-24 h-24 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl border border-white/20 group-hover:bg-white group-hover:text-primary-700 transition-all duration-500 shadow-2xl">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-primary-100 text-base leading-relaxed opacity-80">{step.desc}</p>
              </div>
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

      <section className="bg-slate-100 dark:bg-slate-900/50 py-24">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4 animate-fadeIn motion-reduce:animate-none">Common Questions</h2>
            <p className="text-slate-500 text-lg animate-fadeIn motion-reduce:animate-none">Everything you need to know about using PharmaConnect.</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.q}
                className="group animate-fadeIn motion-reduce:animate-none"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Card className="p-6 border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-300 overflow-hidden relative">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="font-bold text-lg pr-4">{faq.q}</h4>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <p className="text-slate-500 mt-4 leading-relaxed text-sm">{faq.a}</p>
                  <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary-600 group-hover:w-full transition-all duration-500" />
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 w-full pb-20">
        <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-blue-800 rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl -ml-48 -mb-48" />
          <div className="relative z-10">
            <h2 className="text-4xl sm:text-6xl font-black mb-8 leading-tight animate-scaleIn motion-reduce:animate-none">
              Stop Searching. <br />Start Finding.
            </h2>
            <p className="text-primary-100 max-w-2xl mx-auto mb-12 text-xl opacity-90 animate-fadeIn motion-reduce:animate-none">
              Join the healthcare revolution in Nepal. Experience the fastest way to locate essential medicines.
            </p>
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
    </>
  );
}
