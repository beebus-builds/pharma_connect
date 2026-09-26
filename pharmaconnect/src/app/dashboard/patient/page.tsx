"use client";

import { useEffect, useMemo, useState } from "react";
import { appToast as toast } from "@/components/Providers";
import { Clock, Search, Inbox, Filter, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { Table, TableHeader, TableRow, TableCell } from "@/components/ui/Table";
import Link from "next/link";
import type { RequestDTO } from "@/types";

const PAGE_SIZE = 8;

export default function PatientDashboard() {
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "AVAILABLE" | "UNAVAILABLE">("ALL");
  const [page, setPage] = useState(1);

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

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [requests, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const counts = useMemo(() => {
    return {
      ALL: requests.length,
      PENDING: requests.filter((r) => r.status === "PENDING").length,
      AVAILABLE: requests.filter((r) => r.status === "AVAILABLE").length,
      UNAVAILABLE: requests.filter((r) => r.status === "UNAVAILABLE").length,
    };
  }, [requests]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10 animate-fadeIn">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Requests</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Track requests & chat realtime with pharmacies</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Link href="/chat">
            <Button variant="secondary" className="rounded-full">
              <MessageCircle className="h-4 w-4" /> Messages
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="rounded-full">
              <Search className="h-4 w-4" />
              New Search
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {!loading && requests.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Filter:
          </span>
          {(["ALL", "PENDING", "AVAILABLE", "UNAVAILABLE"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20 ${
                statusFilter === s
                  ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {s} {counts[s] > 0 && `(${counts[s]})`}
            </button>
          ))}
          {filtered.length > 0 && (
            <span className="ml-auto text-xs text-slate-400">
              {filtered.length} {filtered.length === 1 ? "request" : "requests"} · Page {page}/{totalPages}
            </span>
          )}
        </div>
      )}

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
            Search for a medicine on the homepage and send a request to a pharmacy if it&apos;s currently unavailable.
          </p>
          <Link href="/">
            <Button className="rounded-full px-8">
              Find medicines
            </Button>
          </Link>
        </Card>
      )}

      {!loading && filtered.length === 0 && requests.length > 0 && (
        <Card className="p-10 text-center">
          <Filter className="h-8 w-8 text-slate-300 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-500">No requests with status “{statusFilter}”.</p>
          <button onClick={() => setStatusFilter("ALL")} className="text-xs font-semibold text-primary-600 hover:underline mt-2">
            Clear filter
          </button>
        </Card>
      )}

      {!loading && paged.length > 0 && (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell className="font-bold">Medicine</TableCell>
                  <TableCell className="font-bold">Pharmacy</TableCell>
                  <TableCell className="font-bold">Requested At</TableCell>
                  <TableCell className="font-bold text-right">Status</TableCell>
                  <TableCell className="font-bold text-right">Chat</TableCell>
                </TableRow>
              </TableHeader>
              <tbody>
                {paged.map((r, i) => (
                  <TableRow key={r.id} className="animate-fadeIn" style={{ animationDelay: `${i * 30}ms` }}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{r.medicine.genericName}</span>
                        <span className="text-xs text-slate-500">{r.medicine.brandName} {r.medicine.strength}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{r.pharmacy.name}</TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/chat/${r.id}`}>
                        <Button variant="secondary" className="px-3 py-1 text-xs rounded-full">
                          <MessageCircle className="h-3.5 w-3.5" /> Chat
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {paged.map((r) => (
              <Card key={r.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{r.medicine.genericName}</p>
                    <p className="text-xs text-slate-500">{r.medicine.brandName} {r.medicine.strength}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <p className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" aria-hidden="true" /> {r.pharmacy.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="h-3 w-3" aria-hidden="true" /> {new Date(r.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Link href={`/chat/${r.id}`} className="block">
                  <Button variant="secondary" className="w-full rounded-xl text-xs">
                    <MessageCircle className="h-3.5 w-3.5" /> Chat with {r.pharmacy.name}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </Button>
                <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
