"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { appToast as toast } from "@/components/Providers";
import { ArrowLeft, BadgeCheck, Building2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VerifiedBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface AdminPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  licenseNumber: string | null;
  latitude: number;
  longitude: number;
  verified: boolean;
  openReports: number;
  createdAt: string;
}

type Filter = "pending" | "verified" | "all";

export default function AdminPharmaciesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<AdminPharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && (session?.user.role as string) !== "ADMIN") router.push("/");
  }, [status, router, session]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pharmacies?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load pharmacies");
      setItems(data.pharmacies);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if ((session?.user.role as string) === "ADMIN") load();
  }, [session, load]);

  async function setVerified(id: string, verified: boolean) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/pharmacies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verified }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(verified ? "Pharmacy verified" : "Verification removed");
      setItems((prev) =>
        filter === "all"
          ? prev.map((p) => (p.id === id ? { ...p, verified } : p))
          : prev.filter((p) => p.id !== id)
      );
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setActingId(null);
    }
  }

  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fadeIn">
      <button
        onClick={() => router.push("/admin")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Administration
      </button>
      <h1 className="text-3xl font-bold mb-1">Pharmacy verification</h1>
      <p className="text-slate-500 mb-6">Eyeball the license + location, then flip them live.</p>

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(["pending", "verified", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors",
              filter === f
                ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nothing in this queue. Nice.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold flex items-center gap-2 flex-wrap">
                    {p.name}
                    {p.verified && <VerifiedBadge />}
                    {p.openReports > 0 && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {p.openReports} open report{p.openReports === 1 ? "" : "s"}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">{p.address} · {p.phone} · {p.email}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    License: {p.licenseNumber ?? "—"} · Pin: {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)} ·
                    Joined {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  <a
                    href={`https://www.google.com/maps/?q=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary-600 hover:underline underline-offset-2 mt-1 inline-block"
                  >
                    Inspect pin on Google Maps
                  </a>
                </div>
                <Button
                  className="text-xs"
                  variant={p.verified ? "secondary" : "primary"}
                  loading={actingId === p.id}
                  onClick={() => setVerified(p.id, !p.verified)}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {p.verified ? "Unverify" : "Verify"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
