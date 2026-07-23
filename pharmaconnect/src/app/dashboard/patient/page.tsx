"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Clock, Search, Inbox } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/Table";
import Link from "next/link";
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
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-slate-500 mt-1">Track availability requests sent to pharmacies</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="rounded-full">
            <Search className="h-4 w-4" />
            New Search
          </Button>
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          <ListSkeleton count={5} />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <Card className="p-16 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Inbox className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold mb-2">No requests yet</h3>
          <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
            Search for a medicine on the homepage and send a request to a pharmacy if it's currently unavailable.
          </p>
          <Link href="/">
            <Button className="rounded-full px-8">
              Find medicines
            </Button>
          </Link>
        </Card>
      )}

      {!loading && requests.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell className="font-bold">Medicine</TableCell>
              <TableCell className="font-bold">Pharmacy</TableCell>
              <TableCell className="font-bold">Requested At</TableCell>
              <TableCell className="font-bold text-right">Status</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {requests.map((r, i) => (
              <TableRow key={r.id} className="animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-semibold">{r.medicine.genericName}</span>
                    <span className="text-xs text-slate-500">{r.medicine.brandName} {r.medicine.strength}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  {r.pharmacy.name}
                </TableCell>
                <TableCell className="text-slate-500 text-xs flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(r.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <StatusBadge status={r.status} />
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
