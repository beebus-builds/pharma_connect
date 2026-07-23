"use client";

import { motion } from "framer-motion";
import { Search, MapPin, Send, CheckCircle, PackageCheck, TrendingUp, Stethoscope, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const patientSteps = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "Search Medicine",
    description: "Enter the generic or brand name of the medicine you're looking for in the search bar.",
    color: "from-primary-500 to-primary-600",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Find Nearby Pharmacies",
    description: "Instantly see a list and map of pharmacies near you that have the medicine in stock, sorted by distance.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Send a Request",
    description: "If a medicine is out of stock, send a request to a pharmacy to notify you when it becomes available.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Get Notified",
    description: "Receive updates on your request status and head to the pharmacy once confirmed.",
    color: "from-amber-500 to-orange-600",
  },
];

const pharmacySteps = [
  {
    icon: <PackageCheck className="h-6 w-6" />,
    title: "Manage Inventory",
    description: "Easily add and update the stock levels of medicines available at your pharmacy.",
    color: "from-primary-500 to-primary-600",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Receive Requests",
    description: "See requests from patients looking for specific medicines you may or may not have.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Update Availability",
    description: "Respond to patient requests by marking medicines as available or unavailable.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Understand Demand",
    description: "Track which medicines are most requested in your area to optimize your inventory.",
    color: "from-amber-500 to-orange-600",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="animate-fadeIn">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-700 via-primary-600 to-blue-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 backdrop-blur-md border border-white/20"
          >
            <Stethoscope className="h-3.5 w-3.5" /> Guide
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl font-black mb-4"
          >
            How PharmaConnect Works
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-primary-100 text-lg max-w-2xl mx-auto"
          >
            Connecting patients with the right medicines at the nearest pharmacies, reducing stress and saving time.
          </motion.p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-16">
          <motion.section {...fadeIn}>
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl">
                <Search className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">For Patients</h2>
            </div>
            <div className="space-y-6">
              {patientSteps.map((step, index) => (
                <Card key={index} className="p-5 flex gap-4 items-start group hover:shadow-md transition-all">
                  <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-md`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{index + 1}. {step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/">
                <Button className="px-8 rounded-full">
                  Start Searching
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.section>

          <motion.section {...fadeIn} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-10">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-xl">
                <PackageCheck className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold">For Pharmacies</h2>
            </div>
            <div className="space-y-6">
              {pharmacySteps.map((step, index) => (
                <Card key={index} className="p-5 flex gap-4 items-start group hover:shadow-md transition-all">
                  <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-md`}>
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{index + 1}. {step.title}</h3>
                    <p className="text-sm text-slate-500">{step.description}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/register">
                <Button variant="outline" className="px-8 rounded-full">
                  Join as a Pharmacy
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
