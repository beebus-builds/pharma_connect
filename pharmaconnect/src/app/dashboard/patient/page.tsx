"use client";

import { useEffect, useMemo, useState } from "react";
import { appToast as toast } from "@/components/Providers";
import { Clock, Search, Inbox, Filter, ChevronLeft, ChevronRight, MessageCircle, Bell, Plus, Trash2 } from "lucide-react";
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

  const [reminders, setReminders] = useState<any[]>([]);
  const [reminderQuery, setReminderQuery] = useState("");
  const [reminderResults, setReminderResults] = useState<any[]>([]);
  const [reminderMedicine, setReminderMedicine] = useState<any | null>(null);
  const [daysSupply, setDaysSupply] = useState(30);
  const [leadDays, setLeadDays] = useState(3);
  const [savingReminder, setSavingReminder] = useState(false);

  useEffect(() => {
    async function loadReminders() {
      try {
        const res = await fetch("/api/reminders");
        const data = await res.json();
        if (res.ok) setReminders(data.reminders ?? []);
      } catch {
        // surfaced silently; list just stays empty
      }
    }
    loadReminders();
  }, []);

  useEffect(() => {
    if (!reminderQuery.trim() || reminderMedicine) {
      setReminderResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(reminderQuery)}&limit=5`);
        const data = await res.json();
        setReminderResults(res.ok ? data.medicines ?? [] : []);
      } catch {
        setReminderResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [reminderQuery, reminderMedicine]);

  async function addReminder() {
    if (!reminderMedicine) {
      toast.error("Pick a medicine first");
      return;
    }
    setSavingReminder(true);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: reminderMedicine.id, daysSupply, leadDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save reminder");
      setReminders((prev) => {
        const rest = prev.filter((r) => r.id !== data.reminder.id && r.medicineId !== data.reminder.medicineId);
        return [...rest, data.reminder].sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());
      });
      setReminderMedicine(null);
      setReminderQuery("");
      setDaysSupply(30);
      setLeadDays(3);
      toast.success("Reminder saved — we'll email you before it runs out");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setSavingReminder(false);
    }
  }

  async function toggleReminder(r: any) {
    const res = await fetch(`/api/reminders/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !r.active }),
    });
    if (res.ok) {
      const data = await res.json();
      setReminders((prev) => prev.map((x) => (x.id === r.id ? data.reminder : x)));
    }
  }

  async function deleteReminder(id: string) {
    const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    if (res.ok) setReminders((prev) => prev.filter((r) => r.id !== id));
  }

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
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-1">Patient console</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Requests</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm sm:text-base">Track requests & chat realtime with pharmacies</p>
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

      {/* Refill reminders */}
      <Card className="p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
            <Bell className="h-4 w-4" />
          </div>
          <h2 className="font-bold text-sm">Refill reminders</h2>
          <span className="text-xs text-slate-400">{reminders.length} active course{reminders.length === 1 ? "" : "s"}</span>
        </div>

        {reminders.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800 mb-4">
            {reminders.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${r.active ? "" : "line-through text-slate-400"}`}>
                    {r.medicine.genericName} <span className="text-xs font-normal text-slate-500">{r.medicine.brandName} {r.medicine.strength}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.daysSupply}-day course · next due {new Date(r.nextDue).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · warns {r.leadDays}d before
                  </p>
                </div>
                <button onClick={() => toggleReminder(r)} className="text-[11px] font-bold text-primary-600 hover:underline">
                  {r.active ? "Pause" : "Resume"}
                </button>
                <button onClick={() => deleteReminder(r.id)} aria-label="Delete reminder" className="text-slate-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
          <div className="relative">
            <input
              value={reminderMedicine ? `${reminderMedicine.genericName} (${reminderMedicine.brandName})` : reminderQuery}
              onChange={(e) => { setReminderMedicine(null); setReminderQuery(e.target.value); }}
              placeholder="Search a medicine…"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {reminderResults.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden">
                {reminderResults.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => { setReminderMedicine(m); setReminderResults([]); setReminderQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {m.genericName} <span className="text-xs text-slate-500">{m.brandName} · {m.strength}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            type="number" min={1} max={365} value={daysSupply}
            onChange={(e) => setDaysSupply(Number(e.target.value))}
            aria-label="Days supply"
            className="w-24 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            title="Days supply per course"
          />
          <input
            type="number" min={0} max={30} value={leadDays}
            onChange={(e) => setLeadDays(Number(e.target.value))}
            aria-label="Days of warning"
            className="w-20 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            title="Warn this many days before it runs out"
          />
          <Button onClick={addReminder} loading={savingReminder} className="text-xs rounded-xl">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Course length (days) and how early to warn you. We email one reminder per course, then restart the countdown.</p>
      </Card>

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
              className={`px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${
                statusFilter === s
                  ? "bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white shadow-md"
                  : "bg-white dark:bg-slate-900 ring-slate-200 dark:ring-slate-700 text-slate-600 dark:text-slate-300 hover:ring-slate-300 dark:hover:ring-slate-600"
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
        <Card className="p-16 text-center border-dashed !border-2">
          <div className="w-20 h-20 bg-primary-50 dark:bg-primary-500/10 ring-1 ring-inset ring-primary-600/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <Inbox className="h-10 w-10 text-primary-500" />
          </div>
          <h3 className="text-xl font-bold tracking-tight mb-2">No requests yet</h3>
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
          <div className="hidden sm:block overflow-hidden rounded-2xl ring-1 ring-slate-200/80 dark:ring-slate-800 bg-white dark:bg-slate-900 shadow-card">
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
