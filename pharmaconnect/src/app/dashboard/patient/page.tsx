"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ListSkeleton } from "@/components/ui/Skeleton";
import type { RequestDTO } from "@/types";

export default function PatientDashboard() {
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/requests");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load requests");
        setRequests(data.requests ?? []);
      } catch (e: any) {
        toast.error(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">My requests</h1>
      <p className="text-sm text-slate-500 mb-6">
        Track availability requests you've sent to pharmacies for out-of-stock or low-stock medicines.
      </p>

      {loading && <ListSkeleton count={3} />}

      {!loading && requests.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">
          You haven't sent any requests yet. Search for a medicine on the homepage and tap "Request" on a pharmacy card.
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <Card key={r.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {r.medicine.genericName} <span className="text-slate-500">({r.medicine.brandName})</span>
              </p>
              <p className="text-sm text-slate-500">{r.pharmacy.name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={r.status} />
          </Card>
        ))}
      </div>
    </div>
  );
}
