"use client";

import { Search, MapPin, Send, CheckCircle, PackageCheck, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

const patientSteps = [
  {
    icon: <Search className="h-6 w-6" />,
    title: "Search Medicine",
    description: "Enter the generic or brand name of the medicine you're looking for in the search bar.",
  },
  {
    icon: <MapPin className="h-6 w-6" />,
    title: "Find Nearby Pharmacies",
    description: "Instantly see a list and map of pharmacies near you that have the medicine in stock, sorted by distance.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Send a Request",
    description: "If a medicine is out of stock, send a request to a pharmacy to notify you when it becomes available.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Get Notified",
    description: "Receive updates on your request status and head to the pharmacy once confirmed.",
  },
];

const pharmacySteps = [
  {
    icon: <PackageCheck className="h-6 w-6" />,
    title: "Manage Inventory",
    description: "Easily add and update the stock levels of medicines available at your pharmacy.",
  },
  {
    icon: <Send className="h-6 w-6" />,
    title: "Receive Requests",
    description: "See requests from patients looking for specific medicines you may or may not have.",
  },
  {
    icon: <CheckCircle className="h-6 w-6" />,
    title: "Update Availability",
    description: "Respond to patient requests by marking medicines as available or unavailable.",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    title: "Understand Demand",
    description: "Track which medicines are most requested in your area to optimize your inventory.",
  },
];

// Note: PackageCheck and TrendingUp aren't imported, need to add them.
export default function HowItWorksPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">How PharmaConnect Works</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Connecting patients with the right medicines at the nearest pharmacies, reducing stress and saving time.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Patient Section */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">For Patients</h2>
          </div>
          <div className="space-y-6">
            {patientSteps.map((step, index) => (
              <Card key={index} className="p-6 flex gap-4 items-start">
                <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-primary-600">
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
              <Button className="px-8">Start Searching</Button>
            </Link>
          </div>
        </section>

        {/* Pharmacy Section */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold">For Pharmacies</h2>
          </div>
          <div className="space-y-6">
            {pharmacySteps.map((step, index) => (
              <Card key={index} className="p-6 flex gap-4 items-start">
                <div className="shrink-0 w-12 h-12 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full text-green-600">
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
              <Button variant="outline" className="px-8">Join as a Pharmacy</Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
