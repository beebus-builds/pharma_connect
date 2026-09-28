"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Pill, Plus, Search, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface AdminMedicine {
  id: string;
  genericName: string;
  brandName: string;
  strength: string;
  manufacturer: string;
  stockCount: number;
  requestCount: number;
}

const PAGE_SIZE = 25;

const EMPTY_FORM = { genericName: "", brandName: "", strength: "", manufacturer: "" };

export default function AdminMedicinesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminMedicine[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    else if (status === "authenticated" && (session?.user.role as string) !== "ADMIN") router.push("/");
  }, [status, router, session]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/admin/medicines?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load medicines");
      setItems(data.medicines);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    if ((session?.user.role as string) === "ADMIN") load();
  }, [session, load]);

  async function createMedicine(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        const first = data?.fieldErrors && Object.values(data.fieldErrors)[0];
        throw new Error(Array.isArray(first) ? first[0] : data.error || "Could not add medicine");
      }
      toast.success(data.message || "Medicine added");
      setForm(EMPTY_FORM);
      setShowCreate(false);
      setPage(1);
      load();
    } catch (e: any) {
      setFormError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedicine(m: AdminMedicine) {
    setActingId(m.id);
    try {
      const res = await fetch(`/api/admin/medicines/${m.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success(`Removed ${m.genericName} (${m.brandName})`);
      setItems((prev) => prev.filter((x) => x.id !== m.id));
      setTotal((n) => Math.max(n - 1, 0));
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

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Medicine catalog</h1>
          <p className="text-slate-500">
            {loading ? "Loading…" : `${total.toLocaleString()} product${total === 1 ? "" : "s"} in the shared catalog.`}
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreate ? "Cancel" : "Add medicine"}
        </Button>
      </div>

      {showCreate && (
        <Card className="p-5 mb-6">
          <form onSubmit={createMedicine} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="m-generic" className="block text-sm font-semibold mb-1.5">Generic name</label>
              <Input
                id="m-generic"
                value={form.genericName}
                onChange={(e) => setForm({ ...form, genericName: e.target.value })}
                placeholder="Paracetamol"
                required
              />
            </div>
            <div>
              <label htmlFor="m-brand" className="block text-sm font-semibold mb-1.5">Brand name</label>
              <Input
                id="m-brand"
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                placeholder="Crocin"
                required
              />
            </div>
            <div>
              <label htmlFor="m-strength" className="block text-sm font-semibold mb-1.5">Strength</label>
              <Input
                id="m-strength"
                value={form.strength}
                onChange={(e) => setForm({ ...form, strength: e.target.value })}
                placeholder="500mg"
                required
              />
            </div>
            <div>
              <label htmlFor="m-manufacturer" className="block text-sm font-semibold mb-1.5">Manufacturer</label>
              <Input
                id="m-manufacturer"
                value={form.manufacturer}
                onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                placeholder="Cipla"
                required
              />
            </div>
            {formError && (
              <p role="alert" className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">
                {formError}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving} disabled={saving}>Save to catalog</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search generic, brand or manufacturer…"
          aria-label="Search catalog"
          className="pl-10"
        />
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-slate-500">Loading…</Card>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
          <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {debouncedQ ? `Nothing matches “${debouncedQ}”.` : "The catalog is empty."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {m.genericName} <span className="font-normal text-slate-400">· {m.strength}</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {m.brandName} · {m.manufacturer}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {m.stockCount} stock listing{m.stockCount === 1 ? "" : "s"} · {m.requestCount} patient request
                    {m.requestCount === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="text-xs"
                  loading={actingId === m.id}
                  onClick={() => deleteMedicine(m)}
                  title={m.stockCount > 0 ? "Blocked while a pharmacy stocks this" : "Remove from catalog"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="secondary" className="text-xs" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className={cn("text-sm text-slate-500")}>
            Page {page} of {totalPages}
          </span>
          <Button variant="secondary" className="text-xs" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
