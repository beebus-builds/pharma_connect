"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, Flag } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  pharmacy: { id: string; name: string; address: string };
  reporterEmail: string;
}

type Filter = "OPEN" | "RESOLVED" | "DISMISSED" | "ALL";

const REASON_LABELS: Record<string, string> = {
  WRONG_STOCK: "Stock info is wrong",
  CLOSED: "Shop closed / doesn't exist",
  WRONG_LOCATION: "Wrong pin location",
  FAKE_LISTING: "Fake or duplicate",
  OTHER: "Other",
};

export default function AdminReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("OPEN");
  const [items, setItems] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && (session?.user.role as string) !== "ADMIN") router.push("/");
  }, [status, router, session]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${filter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setItems(data.reports);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if ((session?.user.role as string) === "ADMIN") load();
  }, [session, load]);

  async function setStatus(id: string, reportStatus: "RESOLVED" | "DISMISSED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reportStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(reportStatus === "RESOLVED" ? "Report resolved" : "Report dismissed");
      setItems((prev) =>
        filter === "ALL" ? prev.map((r) => (r.id === id ? { ...r, status: reportStatus } : r)) : prev.filter((r) => r.id !== id)
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
      <h1 className="text-3xl font-bold mb-1">Report triage</h1>
      <p className="text-slate-500 mb-6">Patient-reported listing problems, newest first.</p>

      <div className="flex gap-1 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(["OPEN", "RESOLVED", "DISMISSED", "ALL"] as Filter[]).map((f) => (
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
            {f.toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
          <Flag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Queue is clear. Nice.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {REASON_LABELS[r.reason] ?? r.reason}
                    <span className="ml-2 text-xs font-semibold text-slate-400">{r.status}</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {r.pharmacy.name} · {r.pharmacy.address}
                  </p>
                  {r.details && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">“{r.details}”</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    Reported by {r.reporterEmail} · {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                {r.status === "OPEN" && (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      loading={actingId === r.id}
                      onClick={() => setStatus(r.id, "DISMISSED")}
                    >
                      Dismiss
                    </Button>
                    <Button className="text-xs" loading={actingId === r.id} onClick={() => setStatus(r.id, "RESOLVED")}>
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
