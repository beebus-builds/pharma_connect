"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Plus, PackageCheck } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StockBadge, StatusBadge } from "@/components/ui/Badge";
import { ListSkeleton } from "@/components/ui/Skeleton";
import { stockUpsertSchema, type StockUpsertInput } from "@/lib/validations";
import { stockStatus } from "@/lib/utils";
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Pharmacy dashboard</h1>
      <p className="text-sm text-slate-500 mb-6">Manage your medicine stock and respond to patient requests.</p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("stock")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "stock" ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
        >
          Stock
        </button>
        <button
          onClick={() => setTab("requests")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "requests" ? "bg-primary-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
        >
          Requests {requests.filter((r) => r.status === "PENDING").length > 0 && `(${requests.filter((r) => r.status === "PENDING").length})`}
        </button>
      </div>

      {tab === "stock" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5 h-fit">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add / update medicine stock
            </h2>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
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

          <div>
            <h2 className="font-semibold mb-4">Current inventory ({stocks.length})</h2>
            {loadingStocks && <ListSkeleton count={4} />}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {!loadingStocks &&
                stocks.map((row) => (
                  <Card key={row.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{row.medicine.genericName}</p>
                      <p className="text-sm text-slate-500">
                        {row.medicine.brandName} {row.medicine.strength} &middot; Qty: {row.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StockBadge status={stockStatus(row.quantity)} />
                      <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => toggleAvailability(row)}>
                        {row.quantity > 0 ? "Mark unavailable" : "Mark available"}
                      </Button>
                    </div>
                  </Card>
                ))}
              {!loadingStocks && stocks.length === 0 && (
                <Card className="p-6 text-center text-sm text-slate-500">No medicines added yet.</Card>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div>
          {loadingRequests && <ListSkeleton count={3} />}
          <div className="space-y-3">
            {!loadingRequests &&
              requests.map((r) => (
                <Card key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-medium">
                      {r.medicine.genericName} <span className="text-slate-500">({r.medicine.brandName})</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      From {r.patient.name} &middot; {r.patient.email}
                    </p>
                    <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          variant="secondary"
                          className="text-xs px-3 py-1.5"
                          onClick={() => updateRequestStatus(r.id, "AVAILABLE")}
                        >
                          Mark available
                        </Button>
                        <Button
                          variant="danger"
                          className="text-xs px-3 py-1.5"
                          onClick={() => updateRequestStatus(r.id, "UNAVAILABLE")}
                        >
                          Mark unavailable
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ))}
            {!loadingRequests && requests.length === 0 && (
              <Card className="p-8 text-center text-sm text-slate-500">No requests yet.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
