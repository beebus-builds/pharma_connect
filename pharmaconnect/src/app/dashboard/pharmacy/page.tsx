"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Plus, PackageCheck, Pill, ClipboardList, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Search, Minus, MessageCircle, ImagePlus, Trash2 } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PhotoManager from "@/components/PhotoManager";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockBadge, StatusBadge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { stockUpsertSchema, medicineCreateSchema, type StockUpsertInput, type MedicineCreateInput } from "@/lib/validations";
import { effectiveThreshold, formatExpiry, isExpired, isExpiringSoon, DEFAULT_LOW_STOCK_THRESHOLD } from "@/lib/inventory";
import { stockStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MedicineDTO, RequestDTO } from "@/types";

interface StockRow {
  id: string;
  quantity: number;
  expiryDate: string | null;
  mrp: number | null;
  lowStockThreshold: number;
  updatedAt: string;
  medicine: MedicineDTO;
}

interface HistoryRow {
  id: string;
  oldQuantity: number;
  newQuantity: number;
  delta: number;
  note: string | null;
  createdAt: string;
  medicine: { id: string; genericName: string; brandName: string; strength: string };
}

interface SubscriptionInfo {
  active: boolean;
  expiresAt: string | null;
}

export default function PharmacyDashboard() {
  return (
    <Suspense fallback={null}>
      <PharmacyDashboardContent />
    </Suspense>
  );
}

function PharmacyDashboardContent() {
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineDTO | null>(null);
  const [tab, setTab] = useState<"stock" | "requests" | "photos" | "history">("stock");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [qty, setQty] = useState<number>(10);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<MedicineCreateInput>({ genericName: "", brandName: "", strength: "", manufacturer: "" });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockUpsertInput>({
    resolver: zodResolver(stockUpsertSchema),
    defaultValues: { quantity: 10, lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD },
  });

  const watchedQty = watch("quantity");

  async function loadStocks() {
    setLoadingStocks(true);
    try {
      const res = await fetch("/api/pharmacies/stock");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load stock");
      setStocks(data.stocks ?? []);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoadingStocks(false);
    }
  }

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      setRequests(data.requests ?? []);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadSubscription() {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load subscription");
      setSubscription({
        active: !!data.user?.pharmacy?.subscriptionActive,
        expiresAt: data.user?.pharmacy?.subscriptionExpiresAt ?? null,
      });
    } catch {
      // Non-critical for page load; subscription card just won't render.
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    try {
      const res = await fetch("/api/payments/khalti/initiate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start payment");
      window.location.href = data.paymentUrl;
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      setSubscribing(false);
    }
  }

  useEffect(() => {
    loadStocks();
    loadRequests();
    loadSubscription();
  }, []);

  useEffect(() => {
    const status = searchParams.get("subscription");
    if (status === "success") toast.success("Subscription activated!");
    else if (status === "failed") toast.error("Payment failed. Please try again.");
    else if (status === "pending") toast("Payment is still processing.", { icon: "⏳" });
  }, [searchParams]);

  const onSubmit = async (values: StockUpsertInput) => {
    try {
      const res = await fetch("/api/pharmacies/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save stock");
      toast.success("Stock updated");
      (data.warnings ?? []).forEach((w: string) => toast(w, { icon: "⚠️" }));
      reset({ quantity: 10, medicineId: "" as any, expiryDate: undefined, mrp: undefined, lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD, clearExpiry: false });
      setSelectedMedicine(null);
      setQty(10);
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  };

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/pharmacies/stock/history?limit=50");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setHistory(data.history ?? []);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoadingHistory(false);
    }
  }

  function exportCsv() {
    window.location.href = "/api/pharmacies/stock/export";
  }

  async function importCsv(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file (export first to get the template)");
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pharmacies/stock/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      toast.success(data.message);
      if (data.errors?.length) {
        toast(`First issue: row ${data.errors[0].row} — ${data.errors[0].message}`, { icon: "⚠️" });
      }
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setImporting(false);
    }
  }

  async function updateRequestStatus(id: string, status: "AVAILABLE" | "UNAVAILABLE") {
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update request");
      toast.success("Request updated");
      loadRequests();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function toggleAvailability(row: StockRow) {
    const newQuantity = row.quantity > 0 ? 0 : 10;
    try {
      const res = await fetch("/api/pharmacies/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: row.medicine.id, quantity: newQuantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(newQuantity > 0 ? "Marked as available" : "Marked as unavailable");
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function adjustStock(row: StockRow, next: number) {
    try {
      const res = await fetch("/api/pharmacies/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: row.medicine.id, quantity: Math.max(0, next) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update stock");
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function deleteStockRow(row: StockRow) {
    if (confirmDeleteId !== row.medicine.id) {
      setConfirmDeleteId(row.medicine.id);
      setTimeout(() => setConfirmDeleteId((cur) => (cur === row.medicine.id ? null : cur)), 3000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/pharmacies/stock?medicineId=${row.medicine.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove product");
      toast.success(data.message || "Product removed");
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function createNewProduct(e: React.FormEvent) {
    e.preventDefault();
    const parsed = medicineCreateSchema.safeParse(newProduct);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Please fill all product fields");
      return;
    }
    setCreatingProduct(true);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add product");
      setSelectedMedicine(data.medicine);
      setValue("medicineId", data.medicine.id);
      setNewProduct({ genericName: "", brandName: "", strength: "", manufacturer: "" });
      setShowNewProduct(false);
      toast.success(data.message || "Product added — set quantity and save stock");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setCreatingProduct(false);
    }
  }

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const lowStockCount = stocks.filter(
    (s) => s.quantity > 0 && s.quantity <= effectiveThreshold(s.lowStockThreshold)
  ).length;
  const outOfStockCount = stocks.filter((s) => s.quantity === 0).length;
  const expiredCount = stocks.filter((s) => isExpired(s.expiryDate)).length;
  const expiringSoonCount = stocks.filter((s) => isExpiringSoon(s.expiryDate)).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fadeIn">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
          <p className="text-slate-500 mt-1">Inventory and realtime patient chats</p>
        </div>
        <a href="/chat" className="self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity">
            <MessageCircle className="h-4 w-4" /> Messages
          </span>
        </a>
      </div>

      {subscription && (
        <Card className="mb-8 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold">
              Subscription: {subscription.active ? (
                <span className="text-emerald-600">Active</span>
              ) : (
                <span className="text-amber-600">Inactive</span>
              )}
            </p>
            <p className="text-sm text-slate-500">
              {subscription.active && subscription.expiresAt
                ? `Renews/expires ${new Date(subscription.expiresAt).toLocaleDateString()}`
                : "Subscribe to keep your pharmacy listed and receive patient requests."}
            </p>
          </div>
          <Button onClick={handleSubscribe} disabled={subscribing} variant={subscription.active ? "outline" : "primary"}>
            {subscribing ? "Redirecting…" : subscription.active ? "Renew (NPR 999/mo)" : "Subscribe (NPR 999/mo)"}
          </Button>
        </Card>
      )}

      {/* Stock Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-lg">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Healthy Stock</p>
            <p className="text-xl font-bold">{stocks.length - lowStockCount - outOfStockCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-lg">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Low Stock</p>
            <p className="text-xl font-bold">{lowStockCount}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-4 border-l-4 border-l-red-500">
          <div className="p-2 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-lg">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase">Out of Stock</p>
            <p className="text-xl font-bold">{outOfStockCount}</p>
          </div>
        </Card>
      </div>

      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <Card className="mb-8 p-4 border-l-4 border-l-orange-500">
          <p className="text-sm">
            {expiredCount > 0 && (
              <span className="font-semibold text-red-600">
                {expiredCount} expired batch{expiredCount === 1 ? "" : "es"} hidden from patient search.{" "}
              </span>
            )}
            {expiringSoonCount > 0 && (
              <span className="text-slate-600 dark:text-slate-300">
                {expiringSoonCount} batch{expiringSoonCount === 1 ? "" : "es"} expiring within 30 days — update the expiry after restocking.
              </span>
            )}
          </p>
        </Card>
      )}

      <div className="flex gap-1 mb-8 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          onClick={() => setTab("stock")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            tab === "stock"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <Pill className="h-4 w-4" />
          Stock
        </button>
        <button
          onClick={() => setTab("requests")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            tab === "requests"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          Requests
          {pendingCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("photos")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            tab === "photos"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <ImagePlus className="h-4 w-4" />
          Photos
        </button>
        <button
          onClick={() => { setTab("history"); loadHistory(); }}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            tab === "history"
              ? "bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          )}
        >
          <TrendingUp className="h-4 w-4" />
          History
        </button>
      </div>

      {tab === "photos" && <PhotoManager />}

      {tab === "history" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Stock changes <span className="text-sm font-normal text-slate-500">last {history.length}</span></h2>
            <Button variant="secondary" className="text-xs px-3 py-1.5" onClick={loadHistory} loading={loadingHistory}>
              Refresh
            </Button>
          </div>
          {loadingHistory && <ListSkeleton count={4} />}
          {!loadingHistory && history.length === 0 && (
            <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
              <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No changes yet — every add, update, import and removal is logged here.</p>
            </Card>
          )}
          {!loadingHistory && history.length > 0 && (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((h) => (
                <Card key={h.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">
                      {h.medicine.genericName}{" "}
                      <span className="text-slate-500 font-normal text-xs">({h.medicine.brandName} · {h.medicine.strength})</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {new Date(h.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {h.note ? ` · ${h.note}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${h.delta > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40" : h.delta < 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40" : "bg-slate-100 text-slate-500"}`}>
                    {h.delta > 0 ? `+${h.delta}` : h.delta} → {h.newQuantity}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "stock" && (
        <div className="grid md:grid-cols-5 gap-6">
          <Card className="md:col-span-2 p-6 h-fit">
            <h2 className="font-bold mb-1 flex items-center gap-2">
              <div className="p-1.5 bg-primary-100 dark:bg-primary-900/40 text-primary-600 rounded-lg">
                <Plus className="h-4 w-4" />
              </div>
              Add medicine
            </h2>
            <p className="text-xs text-slate-500 mb-5">Update stock levels for a medicine</p>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Medicine</label>
                <SearchBar
                  selected={selectedMedicine}
                  onSelect={(m) => {
                    setSelectedMedicine(m);
                    setValue("medicineId", m.id);
                    // Editing an existing row? Prefill its values.
                    const row = stocks.find((s) => s.medicine.id === m.id);
                    if (row) {
                      setValue("quantity", row.quantity, { shouldValidate: true });
                      setQty(row.quantity);
                      setValue("mrp", row.mrp ?? undefined);
                      setValue("lowStockThreshold", row.lowStockThreshold);
                      setValue(
                        "expiryDate",
                        row.expiryDate ? (new Date(row.expiryDate).toISOString().slice(0, 10) as any) : undefined
                      );
                      setValue("clearExpiry", false);
                    }
                  }}
                  onClear={() => setSelectedMedicine(null)}
                />
                {errors.medicineId && <p className="text-xs text-red-600 mt-1">{errors.medicineId.message}</p>}
                <button
                  type="button"
                  onClick={() => setShowNewProduct(true)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline underline-offset-2 mt-1.5"
                >
                  Can&apos;t find your product? Add it to the catalog
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity in stock</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(0, (Number(watchedQty) || 0) - 1);
                      setValue("quantity", next, { shouldValidate: true });
                      setQty(next);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    {...register("quantity", { valueAsNumber: true })}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10) || 0;
                      setQty(v);
                    }}
                    className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    placeholder="0"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = (Number(watchedQty) || 0) + 1;
                      setValue("quantity", next, { shouldValidate: true });
                      setQty(next);
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setValue("quantity", n, { shouldValidate: true });
                        setQty(n);
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border ${Number(watchedQty) === n ? "bg-primary-600 text-white border-primary-600" : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry (optional)</label>
                  <input
                    type="date"
                    {...register("expiryDate", { valueAsDate: false } as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                  {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate.message as string}</p>}
                  <label className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <input type="checkbox" {...register("clearExpiry")} className="rounded" />
                    Clear expiry
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">MRP Rs. (optional)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 45"
                    {...register("mrp", { valueAsNumber: false } as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  />
                  {errors.mrp && <p className="text-xs text-red-600 mt-1">{errors.mrp.message as string}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Low-stock alert at (units)
                </label>
                <input
                  type="number"
                  min={0}
                  {...register("lowStockThreshold", { valueAsNumber: false } as any)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">You&apos;ll get one email each time stock dips to this level.</p>
                {errors.lowStockThreshold && <p className="text-xs text-red-600 mt-1">{errors.lowStockThreshold.message as string}</p>}
              </div>

              <Button type="submit" loading={isSubmitting} className="w-full">
                <PackageCheck className="h-4 w-4" />
                Save stock
              </Button>
            </form>
          </Card>

          <div className="md:col-span-3">
            <div className="mb-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">
                  Current inventory <span className="text-sm font-normal text-slate-500">{stocks.length} items</span>
                </h2>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={exportCsv}
                    className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Download inventory as CSV"
                  >
                    Export
                  </button>
                  <label
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${importing ? "opacity-50 pointer-events-none" : ""}`}
                    title="Bulk upload from CSV (same columns as export)"
                  >
                    {importing ? "Importing…" : "Import"}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      disabled={importing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) importCsv(f);
                      }}
                    />
                  </label>
                </div>
              </div>
              {stocks.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                  <input
                    value={inventoryQuery}
                    onChange={(e) => setInventoryQuery(e.target.value)}
                    placeholder="Filter inventory…"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    aria-label="Filter inventory"
                  />
                </div>
              )}
            </div>
            {loadingStocks && <ListSkeleton count={4} />}
            {!loadingStocks && stocks.length === 0 && (
              <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No medicines in your inventory yet.</p>
                <p className="text-xs text-slate-400 mt-1">Use the form to add your first item.</p>
              </Card>
            )}
            {!loadingStocks && stocks.length > 0 && (() => {
              const filtered = stocks.filter((r) =>
                inventoryQuery
                  ? `${r.medicine.genericName} ${r.medicine.brandName} ${r.medicine.strength}`.toLowerCase().includes(inventoryQuery.toLowerCase())
                  : true
              );
              if (filtered.length === 0) {
                return (
                  <Card className="p-8 text-center">
                    <Search className="h-8 w-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-sm text-slate-500">No matches for “{inventoryQuery}”</p>
                    <button onClick={() => setInventoryQuery("")} className="text-xs font-semibold text-primary-600 hover:underline mt-1">Clear filter</button>
                  </Card>
                );
              }
              return (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {filtered.map((row, i) => (
                    <Card key={row.id} className="p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow animate-fadeIn" style={{ animationDelay: `${i * 20}ms` }}>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{row.medicine.genericName}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {row.medicine.brandName} {row.medicine.strength}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">Qty: {row.quantity}</span>
                          <StockBadge status={stockStatus(row.quantity, effectiveThreshold(row.lowStockThreshold))} />
                          {row.mrp !== null && row.mrp !== undefined && (
                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Rs. {row.mrp}</span>
                          )}
                          {row.expiryDate ? (
                            isExpired(row.expiryDate) ? (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40">Expired — hidden</span>
                            ) : (
                              <span className={`text-[11px] font-medium ${isExpiringSoon(row.expiryDate) ? "text-amber-600 font-bold" : "text-slate-400"}`}>
                                Exp {formatExpiry(row.expiryDate)}
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-300">No expiry</span>
                          )}
                          <span className="text-[11px] text-slate-400" title="Email alert threshold">
                            alert ≤ {effectiveThreshold(row.lowStockThreshold)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => adjustStock(row, row.quantity - 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                            aria-label="Decrease stock"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => adjustStock(row, row.quantity + 1)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                            aria-label="Increase stock"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteStockRow(row)}
                            className={`p-1.5 rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 transition-colors ${
                              confirmDeleteId === row.medicine.id
                                ? "bg-red-600 border-red-600 text-white"
                                : "border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            }`}
                            aria-label={confirmDeleteId === row.medicine.id ? "Click again to confirm removal" : "Remove product from inventory"}
                            title={confirmDeleteId === row.medicine.id ? "Click again to confirm" : "Remove from inventory"}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {confirmDeleteId === row.medicine.id && (
                          <p className="text-[10px] font-semibold text-red-600 text-right">Tap trash again to confirm</p>
                        )}
                        <Button
                          variant={row.quantity > 0 ? "secondary" : "primary"}
                          className="text-[11px] px-2.5 py-1 w-full"
                          onClick={() => toggleAvailability(row)}
                        >
                          {row.quantity > 0 ? (
                            <>
                              <XCircle className="h-3 w-3" /> Out
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> In stock
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showNewProduct && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowNewProduct(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add a new product"
        >
          <form
            onSubmit={createNewProduct}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4"
          >
            <div>
              <h3 className="font-bold text-base">Add a new product</h3>
              <p className="text-xs text-slate-500 mt-0.5">Not in our catalog? Add it once — every pharmacy can then stock it.</p>
            </div>
            <Input
              label="Generic name"
              placeholder="e.g. Paracetamol"
              value={newProduct.genericName}
              onChange={(e) => setNewProduct((p) => ({ ...p, genericName: e.target.value }))}
            />
            <Input
              label="Brand name"
              placeholder="e.g. Napa"
              value={newProduct.brandName}
              onChange={(e) => setNewProduct((p) => ({ ...p, brandName: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Strength"
                placeholder="e.g. 500mg"
                value={newProduct.strength}
                onChange={(e) => setNewProduct((p) => ({ ...p, strength: e.target.value }))}
              />
              <Input
                label="Manufacturer"
                placeholder="e.g. Beximco"
                value={newProduct.manufacturer}
                onChange={(e) => setNewProduct((p) => ({ ...p, manufacturer: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1 text-xs" onClick={() => setShowNewProduct(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creatingProduct} className="flex-1 text-xs">
                Add product
              </Button>
            </div>
          </form>
        </div>
      )}

      {tab === "requests" && (
        <div>
          {loadingRequests && <ListSkeleton count={3} />}
          {!loadingRequests && requests.length === 0 && (
            <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
              <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No patient requests yet.</p>
              <p className="text-xs text-slate-400 mt-1">Requests will appear here when patients reach out.</p>
            </Card>
          )}
          {!loadingRequests && requests.length > 0 && (
            <div className="space-y-3">
              {requests.map((r, i) => (
                <Card key={r.id} className="p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow animate-fadeIn" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {r.medicine.genericName} <span className="text-slate-500 font-normal text-sm">({r.medicine.brandName})</span>
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      From {r.patient.name} &middot; {r.patient.email}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <a href={`/chat/${r.id}`}>
                      <Button variant="secondary" className="text-xs px-3 py-1.5 rounded-full">
                        <MessageCircle className="h-3.5 w-3.5" /> Chat
                      </Button>
                    </a>
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          onClick={() => updateRequestStatus(r.id, "AVAILABLE")}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Available
                        </Button>
                        <Button
                          variant="danger"
                          className="text-xs px-3 py-1.5"
                          onClick={() => updateRequestStatus(r.id, "UNAVAILABLE")}
                        >
                          <XCircle className="h-3 w-3" />
                          Unavailable
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
