"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Pill, Building2, Users, ShieldAlert, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<{pharmacyCount: number, medicineCount: number, userCount: number} | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && (session?.user.role as string) !== "ADMIN") {
      router.push("/");
    }
  }, [status, router, session]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        if (res.ok) setStats(data);
      } catch (e) {
        console.error("Failed to fetch stats", e);
      }
    }
    if ((session?.user.role as string) === "ADMIN") fetchStats();
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Pharmacies", value: stats?.pharmacyCount ?? "...", icon: Building2, color: "bg-primary-600", delay: 0 },
    { label: "Total Medicines", value: stats?.medicineCount ?? "...", icon: Pill, color: "bg-blue-600", delay: 0.1 },
    { label: "Active Users", value: stats?.userCount ?? "...", icon: Users, color: "bg-emerald-600", delay: 0.2 },
    { label: "Pending Issues", value: "0", icon: ShieldAlert, color: "bg-red-600", delay: 0.3 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-xl">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold">Administration</h1>
        </div>
        <p className="text-slate-500 ml-12">System-wide management and oversight</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay }}
          >
            <Card className={`${stat.color} text-white p-6 border-none shadow-lg ${stat.color.includes("bg-") ? stat.color.replace("bg-", "shadow-") + "/20" : ""}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium opacity-80">{stat.label}</span>
                <stat.icon className="h-5 w-5 opacity-80" />
              </div>
              <div className="text-3xl font-black">{stat.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { title: "Pharmacy Management", desc: "Verify licenses and manage pharmacy accounts.", icon: Building2, color: "bg-primary-100 dark:bg-primary-900/40 text-primary-600", hoverColor: "group-hover:bg-primary-600 group-hover:text-white", link: "/admin/pharmacies" },
          { title: "Medicine Catalog", desc: "Global database of medicines and strengths.", icon: Pill, color: "bg-blue-100 dark:bg-blue-900/40 text-blue-600", hoverColor: "group-hover:bg-blue-600 group-hover:text-white", link: "/admin/medicines" },
        ].map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
          >
            <Card
              className="p-6 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => router.push(item.link)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${item.color} ${item.hoverColor} transition-all duration-300`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-primary-600 transition-colors" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
