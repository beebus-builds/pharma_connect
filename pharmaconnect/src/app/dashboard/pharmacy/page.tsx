"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Plus, PackageCheck, Pill, ClipboardList, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from "lucide-react";
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

export default function PharmacyDashboard() {
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineDTO | null>(null);
  const [tab, setTab] = useState<"stock" | "requests">("stock");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StockUpsertInput>({ resolver: zodResolver(stockUpsertSchema) });

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

  useEffect(() => {
    loadStocks();
    loadRequests();
  }, []);

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
      reset();
      setSelectedMedicine(null);
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pharmacy Dashboard</h1>
          <p className="text-slate-500 mt-1">Inventory management and patient requests</p>
        </div>
      </div>

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

              <Input
                label="Quantity in stock"
                type="number"
                min={0}
                placeholder="e.g. 50"
                {...register("quantity")}
                error={errors.quantity?.message}
              />

              <Button type="submit" loading={isSubmitting} className="w-full">
                <PackageCheck className="h-4 w-4" />
                Save stock
              </Button>
            </form>
          </Card>

          <div className="md:col-span-3">
            <h2 className="font-bold mb-4 flex items-center justify-between">
              <span>Current inventory</span>
              <span className="text-sm font-normal text-slate-500">{stocks.length} items</span>
            </h2>
            {loadingStocks && <ListSkeleton count={4} />}
            {!loadingStocks && stocks.length === 0 && (
              <Card className="p-10 text-center border-dashed border-2 border-slate-200 dark:border-slate-700">
                <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No medicines in your inventory yet.</p>
                <p className="text-xs text-slate-400 mt-1">Use the form to add your first item.</p>
              </Card>
            )}
            {!loadingStocks && stocks.length > 0 && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {stocks.map((row, i) => (
                  <Card key={row.id} className="p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow animate-fadeIn" style={{ animationDelay: `${i * 30}ms` }}>
                    <div className="min-w-0">
                      <p className="font-semibold">{row.medicine.genericName}</p>
                      <p className="text-sm text-slate-500">
                        {row.medicine.brandName} {row.medicine.strength}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">Qty: {row.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StockBadge status={stockStatus(row.quantity)} />
                      <Button
                        variant="secondary"
                        className="text-xs px-2.5 py-1"
                        onClick={() => toggleAvailability(row)}
                      >
                        {row.quantity > 0 ? (
                          <XCircle className="h-3 w-3" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
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
