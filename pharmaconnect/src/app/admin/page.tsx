import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Pill, Building2, Users, ShieldAlert } from "lucide-react";
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
    } else if (status === "authenticated" && session?.user.role !== "ADMIN") {
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
    if (session?.user.role === "ADMIN") fetchStats();
  }, [session]);

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Administrative Control</h1>
        <p className="text-slate-500">System-wide management and oversight</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <Card className="p-6 bg-primary-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Total Pharmacies</span>
            <Building2 className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats?.pharmacyCount ?? "..."}</div>
        </Card>
        <Card className="p-6 bg-blue-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Total Medicines</span>
            <Pill className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats?.medicineCount ?? "..."}</div>
        </Card>
        <Card className="p-6 bg-green-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Active Users</span>
            <Users className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">{stats?.userCount ?? "..."}</div>
        </Card>
        <Card className="p-6 bg-red-600 text-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium opacity-80">Pending Issues</span>
            <ShieldAlert className="h-5 w-5 opacity-80" />
          </div>
          <div className="text-3xl font-bold">0</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6 hover:border-primary-500 transition cursor-pointer group" onClick={() => router.push("/admin/pharmacies")}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 text-primary-600 rounded-xl group-hover:bg-primary-600 group-hover:text-white transition">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Pharmacy Management</h3>
              <p className="text-sm text-slate-500">Verify licenses and manage pharmacy accounts.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 hover:border-primary-500 transition cursor-pointer group" onClick={() => router.push("/admin/medicines")}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
              <Pill className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Medicine Catalog</h3>
              <p className="text-sm text-slate-500">Global database of medicines and strengths.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
