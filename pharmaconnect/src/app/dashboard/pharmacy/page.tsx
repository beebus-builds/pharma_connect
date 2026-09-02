"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Plus, PackageCheck, Pill, ClipboardList, CheckCircle2, XCircle, AlertTriangle, TrendingUp, Search, Minus, MessageCircle } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockBadge, StatusBadge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { stockUpsertSchema, type StockUpsertInput } from "@/lib/validations";
import { stockStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { MedicineDTO, RequestDTO } from "@/types";

interface StockRow {
  id: string;
  quantity: number;
  updatedAt: string;
  medicine: MedicineDTO;
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
  const [tab, setTab] = useState<"stock" | "requests">("stock");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [qty, setQty] = useState<number>(10);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockUpsertInput>({ resolver: zodResolver(stockUpsertSchema), defaultValues: { quantity: 10 } });

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
      reset({ quantity: 10, medicineId: "" as any });
      setSelectedMedicine(null);
      setQty(10);
      loadStocks();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  };

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

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const lowStockCount = stocks.filter((s) => s.quantity > 0 && s.quantity < 10).length;
  const outOfStockCount = stocks.filter((s) => s.quantity === 0).length;

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
      </div>

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
                  }}
                  onClear={() => setSelectedMedicine(null)}
                />
                {errors.medicineId && <p className="text-xs text-red-600 mt-1">{errors.medicineId.message}</p>}
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

              <Button type="submit" loading={isSubmitting} className="w-full">
                <PackageCheck className="h-4 w-4" />
                Save stock
              </Button>
            </form>
          </Card>

          <div className="md:col-span-3">
            <div className="mb-4 space-y-3">
              <h2 className="font-bold flex items-center justify-between">
                <span>Current inventory</span>
                <span className="text-sm font-normal text-slate-500">{stocks.length} items</span>
              </h2>
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
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">Qty: {row.quantity}</span>
                          <StockBadge status={stockStatus(row.quantity)} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={async () => {
                              const next = Math.max(0, row.quantity - 1);
                              await fetch("/api/pharmacies/stock", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ medicineId: row.medicine.id, quantity: next }),
                              });
                              loadStocks();
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                            aria-label="Decrease stock"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            onClick={async () => {
                              const next = row.quantity + 1;
                              await fetch("/api/pharmacies/stock", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ medicineId: row.medicine.id, quantity: next }),
                              });
                              loadStocks();
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                            aria-label="Increase stock"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
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
