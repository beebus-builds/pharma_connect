"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { appToast as toast } from "@/components/Providers";
import {
  Plus,
  PackageCheck,
  Pill,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Search,
  Minus,
  MessageCircle,
  ImagePlus,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  ImageOff,
  Clock,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PhotoManager from "@/components/PhotoManager";
import PlanCard, { type PlanDefinitionDTO } from "@/components/PlanCard";
import { Card } from "@/components/ui/Card";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Switch } from "@/components/ui/Input";
import { StockBadge, StatusBadge, Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { Tabs, Tab } from "@/components/ui/Tabs";
import { StatTile } from "@/components/ui/StatTile";
import { EmptyState } from "@/components/ui/EmptyState";
import { Alert } from "@/components/ui/Feedback";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Dialog } from "@/components/ui/Dialog";
import { Chip } from "@/components/ui/Chip";
import { useLocale } from "@/components/LocaleProvider";
import {
  stockUpsertSchema,
  medicineCreateSchema,
  type StockUpsertInput,
  type MedicineCreateInput,
} from "@/lib/validations";
import {
  effectiveThreshold,
  formatExpiry,
  isExpired,
  isExpiringSoon,
  DEFAULT_LOW_STOCK_THRESHOLD,
} from "@/lib/inventory";
import { stockStatus } from "@/lib/utils";
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
  plan: string;
  daysRemaining: number | null;
}

const QUICK_QUANTITIES = [5, 10, 25, 50];
const HISTORY_LIMIT = 50;

export default function PharmacyDashboard() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] bg-canvas" />}>
      <PharmacyDashboardContent />
    </Suspense>
  );
}

function PharmacyDashboardContent() {
  const searchParams = useSearchParams();
  const { t, locale } = useLocale();
  const dateTag = locale === "ne" ? "ne-NP" : "en-US";
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [planCatalog, setPlanCatalog] = useState<PlanDefinitionDTO[]>([]);
  const [stocks, setStocks] = useState<StockRow[]>([]);
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineDTO | null>(null);
  const [tab, setTab] = useState<"stock" | "requests" | "photos" | "history">("stock");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<MedicineCreateInput>({
    genericName: "",
    brandName: "",
    strength: "",
    manufacturer: "",
  });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [newProductPhoto, setNewProductPhoto] = useState<File | null>(null);
  const [newProductPhotoPreview, setNewProductPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [clearExpiry, setClearExpiry] = useState(false);

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

  const watchedQty = Number(watch("quantity")) || 0;

  // History is fetched on entry, so selection routes through here rather than
  // repeating the guard inside every Tab onClick.
  function selectTab(next: string) {
    if (next === "history" && history.length === 0) void loadHistory();
    setTab(next as typeof tab);
  }

  const formatDateTime = (value: string) =>
    new Date(value).toLocaleString(dateTag, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatFullDateTime = (value: string) =>
    new Date(value).toLocaleString(dateTag, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  async function loadStocks() {
    setLoadingStocks(true);
    try {
      const res = await fetch("/api/pharmacies/stock");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.stockFailed"));
      setStocks(data.stocks ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoadingStocks(false);
    }
  }

  async function loadRequests() {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/requests");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.requestsFailed"));
      setRequests(data.requests ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoadingRequests(false);
    }
  }

  async function loadSubscription() {
    try {
      const res = await fetch("/api/user/profile");
      const data = await res.json();
      if (!res.ok) return;
      if (Array.isArray(data.plans)) setPlanCatalog(data.plans);
      setSubscription({
        plan: data.user?.pharmacy?.effectivePlan ?? "FREE",
        daysRemaining: data.user?.pharmacy?.daysRemaining ?? null,
      });
    } catch {
      // Non-critical for page load; the plan card simply will not render.
    }
  }

  useEffect(() => {
    void loadStocks();
    void loadRequests();
    void loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const status = searchParams.get("subscription");
    if (status === "success") toast.success(t("pharmacy.subscriptionActive"));
    else if (status === "failed") toast.error(t("pharmacy.paymentFailed"));
    else if (status === "pending") toast(t("pharmacy.paymentPending"));
  }, [searchParams, t]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/pharmacies/stock/history?limit=${HISTORY_LIMIT}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.historyFailed"));
      setHistory(data.history ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setLoadingHistory(false);
    }
  }

  const onSubmit = async (values: StockUpsertInput) => {
    try {
      const res = await fetch("/api/pharmacies/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(t("pharmacy.stockSaved"));
      (data.warnings ?? []).forEach((w: string) => toast(w));
      reset({
        quantity: 10,
        medicineId: "" as never,
        expiryDate: undefined,
        mrp: undefined,
        lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
        clearExpiry: false,
      });
      setSelectedMedicine(null);
      setClearExpiry(false);
      void loadStocks();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  };

  function exportCsv() {
    window.location.href = "/api/pharmacies/stock/export";
  }

  async function importCsv(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error(t("pharmacy.csvOnly"));
      return;
    }
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/pharmacies/stock/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.importFailed"));
      toast.success(data.message);
      if (data.errors?.length) {
        toast(t("pharmacy.importIssue", { row: data.errors[0].row, message: data.errors[0].message }));
      }
      void loadStocks();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
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
      if (!res.ok) throw new Error(t("common.error"));
      toast.success(t("pharmacy.requestUpdated"));
      void loadRequests();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
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
      if (!res.ok) throw new Error(t("common.error"));
      toast.success(newQuantity > 0 ? t("pharmacy.markedAvailable") : t("pharmacy.markedUnavailable"));
      void loadStocks();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  }

  async function adjustStock(row: StockRow, next: number) {
    try {
      const res = await fetch("/api/pharmacies/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicineId: row.medicine.id, quantity: Math.max(0, next) }),
      });
      if (!res.ok) throw new Error(t("common.error"));
      void loadStocks();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
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
      const res = await fetch(`/api/pharmacies/stock?medicineId=${row.medicine.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(data.message || t("pharmacy.productRemoved"));
      void loadStocks();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    }
  }

  async function uploadMedicinePhoto(medicineId: string, file: File): Promise<string | null> {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("pharmacy.photoTooLarge"));
      return null;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error(t("pharmacy.photoType"));
      return null;
    }
    setUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/medicines/${medicineId}/photo`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("pharmacy.photoFailed"));
      return data.medicine?.imageUrl ?? null;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("pharmacy.photoFailed"));
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removeMedicinePhoto(medicineId: string) {
    setUploadingPhoto(true);
    try {
      const res = await fetch(`/api/medicines/${medicineId}/photo`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("common.error"));
      setSelectedMedicine((prev) =>
        prev && prev.id === medicineId ? { ...prev, imageUrl: null } : prev
      );
      setStocks((prev) =>
        prev.map((s) =>
          s.medicine.id === medicineId
            ? { ...s, medicine: { ...s.medicine, imageUrl: null } }
            : s
        )
      );
      toast.success(t("pharmacy.photoRemoved"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function createNewProduct(e: React.FormEvent) {
    e.preventDefault();
    const parsed = medicineCreateSchema.safeParse(newProduct);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first || t("pharmacy.fillAllFields"));
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
      if (!res.ok) throw new Error(data.error || t("common.error"));
      let medicine = data.medicine as MedicineDTO;
      if (newProductPhoto) {
        const url = await uploadMedicinePhoto(medicine.id, newProductPhoto);
        if (url) medicine = { ...medicine, imageUrl: url };
      }
      setSelectedMedicine(medicine);
      setValue("medicineId", medicine.id);
      setNewProduct({ genericName: "", brandName: "", strength: "", manufacturer: "" });
      setNewProductPhoto(null);
      setNewProductPhotoPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setShowNewProduct(false);
      toast.success(data.message || t("pharmacy.productAdded"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.error"));
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
  const expiringSoonCount = stocks.filter(
    (s) => !isExpired(s.expiryDate) && isExpiringSoon(s.expiryDate)
  ).length;
  // Expired batches are hidden from patient search, so counting them as
  // "healthy" told the owner they had stock nobody could find.
  const healthyCount = Math.max(
    0,
    stocks.length - lowStockCount - outOfStockCount - expiredCount
  );

  const filteredStocks = stocks.filter((row) =>
    inventoryQuery
      ? `${row.medicine.genericName} ${row.medicine.brandName} ${row.medicine.strength}`
          .toLowerCase()
          .includes(inventoryQuery.toLowerCase())
      : true
  );

  return (
    <Container className="py-8 sm:py-10">
      {/* ------------------------------------------------------------- Header */}
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow={t("pharmacy.eyebrow")}
          title={t("pharmacy.title")}
          description={t("pharmacy.subtitle")}
        />
        <Link href="/chat" className={buttonClasses({ variant: "secondary" })}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {t("nav.messages")}
        </Link>
      </div>

      {subscription && planCatalog.length > 0 && (
        <div className="mb-7">
          <PlanCard
            currentPlan={subscription.plan as "FREE" | "VERIFIED" | "FEATURED"}
            daysRemaining={subscription.daysRemaining}
            catalog={planCatalog}
          />
        </div>
      )}

      {/* ------------------------------------------------------- Stock health */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatTile icon={PackageCheck} label={t("pharmacy.healthy")} value={healthyCount} tone="positive" />
        <StatTile icon={AlertTriangle} label={t("pharmacy.lowStock")} value={lowStockCount} tone="warning" />
        <StatTile icon={XCircle} label={t("pharmacy.outOfStock")} value={outOfStockCount} tone="critical" />
        <StatTile
          icon={ClipboardList}
          label={t("pharmacy.pendingRequests")}
          value={pendingCount}
          tone={pendingCount > 0 ? "accent" : "neutral"}
          onClick={() => setTab("requests")}
          caption={pendingCount > 0 ? t("pharmacy.tapToReview") : undefined}
        />
      </div>

      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <Alert
          tone={expiredCount > 0 ? "danger" : "warning"}
          className="mb-7"
          title={
            expiredCount > 0
              ? t("pharmacy.expiryHeadlineExpired", { count: expiredCount })
              : t("pharmacy.expiryHeadlineSoon", { count: expiringSoonCount })
          }
        >
          {expiredCount > 0 && <p>{t("pharmacy.expiryExpiredBody")}</p>}
          {expiringSoonCount > 0 && <p>{t("pharmacy.expirySoonBody")}</p>}
        </Alert>
      )}

      {/* --------------------------------------------------------------- Tabs */}
      <Tabs value={tab} onChange={selectTab} label={t("pharmacy.sections")} className="mb-6">
        <Tab value="stock" active={tab === "stock"} onSelect={selectTab} icon={<Pill className="h-4 w-4" />}>
          {t("pharmacy.tabStock")}
        </Tab>
        <Tab
          value="requests"
          active={tab === "requests"}
          onSelect={selectTab}
          icon={<ClipboardList className="h-4 w-4" />}
          count={pendingCount}
          tone="alert"
        >
          {t("pharmacy.tabRequests")}
        </Tab>
        <Tab value="photos" active={tab === "photos"} onSelect={selectTab} icon={<ImagePlus className="h-4 w-4" />}>
          {t("pharmacy.tabPhotos")}
        </Tab>
        <Tab value="history" active={tab === "history"} onSelect={selectTab} icon={<TrendingUp className="h-4 w-4" />}>
          {t("pharmacy.tabHistory")}
        </Tab>
      </Tabs>

      {/* ------------------------------------------------------------- Photos */}
      {tab === "photos" && <PhotoManager />}

      {/* ------------------------------------------------------------ History */}
      {tab === "history" && (
        <div>
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionHeading
              title={t("pharmacy.historyTitle")}
              // The list is capped at HISTORY_LIMIT rows; say so rather than
              // printing the row count as if it were the total.
              description={t("pharmacy.historySubtitle", { limit: HISTORY_LIMIT })}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadHistory()}
              loading={loadingHistory}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {t("common.retry")}
            </Button>
          </div>

          {loadingHistory && history.length === 0 && <CardSkeleton count={4} />}

          {!loadingHistory && history.length === 0 && (
            <EmptyState
              icon={TrendingUp}
              title={t("pharmacy.historyEmpty")}
              body={t("pharmacy.historyEmptyBody")}
            />
          )}

          {history.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {history.map((row, i) => (
                <li
                  key={row.id}
                  className="flex animate-rise items-center justify-between gap-3 px-4 py-3 motion-reduce:animate-none"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-fg">
                      {row.medicine.genericName}
                      <span className="ml-1.5 text-xs font-normal text-fg-muted">
                        {row.medicine.brandName} · {row.medicine.strength}
                      </span>
                    </p>
                    <p className="tabular mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-fg-subtle">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {formatDateTime(row.createdAt)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <Badge
                    tone={row.delta > 0 ? "success" : row.delta < 0 ? "danger" : "neutral"}
                    className="tabular shrink-0"
                  >
                    {row.delta > 0 ? `+${row.delta}` : row.delta} → {row.newQuantity}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------- Stock */}
      {tab === "stock" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="h-fit p-5 lg:col-span-2">
            <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold text-fg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Plus className="h-4 w-4" aria-hidden="true" />
              </span>
              {t("pharmacy.addMedicine")}
            </h2>
            <p className="mb-5 text-xs text-fg-muted">{t("pharmacy.addMedicineBody")}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <span className="mb-1 block text-sm font-medium text-fg">
                  {t("pharmacy.medicine")}
                </span>
                <SearchBar
                  selected={selectedMedicine}
                  onSelect={(m) => {
                    setSelectedMedicine(m);
                    setValue("medicineId", m.id);
                    const row = stocks.find((s) => s.medicine.id === m.id);
                    if (row) {
                      setValue("quantity", row.quantity, { shouldValidate: true });
                      setValue("mrp", row.mrp ?? undefined);
                      setValue("lowStockThreshold", row.lowStockThreshold);
                      setValue(
                        "expiryDate",
                        row.expiryDate
                          ? (new Date(row.expiryDate).toISOString().slice(0, 10) as never)
                          : undefined
                      );
                      setClearExpiry(false);
                    }
                  }}
                  onClear={() => setSelectedMedicine(null)}
                />
                {errors.medicineId && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.medicineId.message}
                  </p>
                )}

                {selectedMedicine && (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-line p-2.5">
                    {selectedMedicine.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedMedicine.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-fg-subtle">
                        <ImageOff className="h-5 w-5" aria-hidden="true" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-fg">
                        {selectedMedicine.genericName}
                      </p>
                      <div className="mt-1.5 flex gap-3">
                        <label
                          className={`cursor-pointer text-[11px] font-semibold text-accent hover:underline ${
                            uploadingPhoto ? "pointer-events-none opacity-50" : ""
                          }`}
                        >
                          {uploadingPhoto
                            ? t("common.saving")
                            : selectedMedicine.imageUrl
                              ? t("pharmacy.replacePhoto")
                              : t("pharmacy.addPhoto")}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            disabled={uploadingPhoto}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (!f || !selectedMedicine) return;
                              const url = await uploadMedicinePhoto(selectedMedicine.id, f);
                              if (url) {
                                setSelectedMedicine({ ...selectedMedicine, imageUrl: url });
                                setStocks((prev) =>
                                  prev.map((s) =>
                                    s.medicine.id === selectedMedicine.id
                                      ? { ...s, medicine: { ...s.medicine, imageUrl: url } }
                                      : s
                                  )
                                );
                                toast.success(t("pharmacy.photoUpdated"));
                              }
                            }}
                          />
                        </label>
                        {selectedMedicine.imageUrl && (
                          <button
                            type="button"
                            disabled={uploadingPhoto}
                            onClick={() => void removeMedicinePhoto(selectedMedicine.id)}
                            className="text-[11px] font-semibold text-red-600 hover:underline disabled:opacity-50"
                          >
                            {t("common.dismiss")}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowNewProduct(true)}
                  className="mt-2 rounded text-xs font-semibold text-accent underline-offset-2 hover:underline"
                >
                  {t("pharmacy.addToCatalog")}
                </button>
              </div>

              {/* Quantity stepper: the primary interaction of this whole page. */}
              <div>
                <label
                  htmlFor="stock-quantity"
                  className="mb-1 block text-sm font-medium text-fg"
                >
                  {t("pharmacy.quantity")}
                </label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() =>
                      setValue("quantity", Math.max(0, watchedQty - 1), { shouldValidate: true })
                    }
                    aria-label={t("pharmacy.decrease")}
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <input
                    id="stock-quantity"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    {...register("quantity", { valueAsNumber: true })}
                    className="tabular h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-center text-sm font-semibold text-fg shadow-xs transition-[box-shadow,border-color] focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-ring"
                    placeholder="0"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setValue("quantity", watchedQty + 1, { shouldValidate: true })}
                    aria-label={t("pharmacy.increase")}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-1.5">
                  {QUICK_QUANTITIES.map((n) => (
                    <Chip
                      key={n}
                      size="sm"
                      selected={watchedQty === n}
                      onClick={() => setValue("quantity", n, { shouldValidate: true })}
                      className="flex-1 justify-center tabular"
                    >
                      {n}
                    </Chip>
                  ))}
                </div>
                {errors.quantity && (
                  <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.quantity.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={`${t("pharmacy.expiry")} · ${t("auth.optional")}`}
                  type="date"
                  {...register("expiryDate", { valueAsDate: false } as never)}
                  error={errors.expiryDate?.message as string | undefined}
                  disabled={clearExpiry}
                />
                <Input
                  label={`${t("pharmacy.mrp")} · ${t("auth.optional")}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  placeholder="45"
                  {...register("mrp", { valueAsNumber: false } as never)}
                  error={errors.mrp?.message as string | undefined}
                />
              </div>

              <Switch
                checked={clearExpiry}
                onChange={(checked) => {
                  setClearExpiry(checked);
                  setValue("clearExpiry", checked);
                  if (checked) setValue("expiryDate", undefined);
                }}
                label={t("pharmacy.clearExpiry")}
              />

              <Input
                label={t("pharmacy.lowStockAlert")}
                type="number"
                inputMode="numeric"
                min={0}
                hint={t("pharmacy.lowStockHint")}
                {...register("lowStockThreshold", { valueAsNumber: false } as never)}
                error={errors.lowStockThreshold?.message as string | undefined}
              />

              <Button type="submit" block loading={isSubmitting}>
                <PackageCheck className="h-4 w-4" aria-hidden="true" />
                {t("pharmacy.saveStock")}
              </Button>
            </form>
          </Card>

          <div className="lg:col-span-3">
            <div className="mb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-fg">
                  {t("pharmacy.currentInventory")}
                  <span className="tabular ml-2 text-sm font-normal text-fg-muted">
                    {stocks.length} {t("pharmacy.items")}
                  </span>
                </h2>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="secondary" size="xs" onClick={exportCsv}>
                    <Download className="h-3 w-3" aria-hidden="true" />
                    {t("pharmacy.export")}
                  </Button>
                  <label
                    className={`inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-line px-2.5 text-[11px] font-semibold text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg ${
                      importing ? "pointer-events-none opacity-50" : ""
                    }`}
                    title={t("pharmacy.importTitle")}
                  >
                    <Upload className="h-3 w-3" aria-hidden="true" />
                    {importing ? t("common.loading") : t("pharmacy.import")}
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      disabled={importing}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = "";
                        if (f) void importCsv(f);
                      }}
                    />
                  </label>
                </div>
              </div>

              {stocks.length > 0 && (
                <Input
                  value={inventoryQuery}
                  onChange={(e) => setInventoryQuery(e.target.value)}
                  placeholder={t("pharmacy.filterInventory")}
                  aria-label={t("pharmacy.filterInventory")}
                  leading={<Search />}
                />
              )}
            </div>

            {loadingStocks && <CardSkeleton count={4} />}

            {!loadingStocks && stocks.length === 0 && (
              <EmptyState
                icon={Pill}
                title={t("pharmacy.inventoryEmpty")}
                body={t("pharmacy.inventoryEmptyBody")}
              />
            )}

            {!loadingStocks && stocks.length > 0 && filteredStocks.length === 0 && (
              <EmptyState
                icon={Search}
                title={t("pharmacy.noMatches")}
                body={t("pharmacy.noMatchesBody", { query: inventoryQuery })}
                action={
                  <Button variant="outline" size="sm" onClick={() => setInventoryQuery("")}>
                    {t("common.clearFilters")}
                  </Button>
                }
              />
            )}

            {filteredStocks.length > 0 && (
              <ul className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
                {filteredStocks.map((row, i) => (
                  <li
                    key={row.id}
                    className="flex animate-rise items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none"
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                  >
                    {row.medicine.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.medicine.imageUrl}
                        alt=""
                        loading="lazy"
                        className="h-12 w-12 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg">
                        {row.medicine.genericName}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        {row.medicine.brandName} {row.medicine.strength}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone="neutral" className="tabular">
                          {t("pharmacy.qty", { count: row.quantity })}
                        </Badge>
                        <StockBadge status={stockStatus(row.quantity, effectiveThreshold(row.lowStockThreshold))} />
                        {row.mrp != null && (
                          <Badge tone="accent" className="tabular">
                            Rs. {row.mrp}
                          </Badge>
                        )}
                        {row.expiryDate ? (
                          isExpired(row.expiryDate) ? (
                            <Badge tone="danger">{t("pharmacy.expiredHidden")}</Badge>
                          ) : (
                            <span
                              className={`tabular text-[11px] ${
                                isExpiringSoon(row.expiryDate)
                                  ? "font-bold text-amber-600"
                                  : "text-fg-subtle"
                              }`}
                            >
                              {t("pharmacy.expShort")} {formatExpiry(row.expiryDate)}
                            </span>
                          )
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          onClick={() => void adjustStock(row, row.quantity - 1)}
                          aria-label={t("pharmacy.decreaseNamed", {
                            name: row.medicine.genericName,
                          })}
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          onClick={() => void adjustStock(row, row.quantity + 1)}
                          aria-label={t("pharmacy.increaseNamed", {
                            name: row.medicine.genericName,
                          })}
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon-sm"
                          onClick={() => void deleteStockRow(row)}
                          aria-label={
                            confirmDeleteId === row.medicine.id
                              ? t("pharmacy.confirmRemoveAria")
                              : t("pharmacy.removeAria", { name: row.medicine.genericName })
                          }
                          className={
                            confirmDeleteId === row.medicine.id
                              ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                              : "text-fg-subtle hover:border-red-300 hover:text-red-600"
                          }
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </div>
                      <Button
                        variant={row.quantity > 0 ? "secondary" : "primary"}
                        size="xs"
                        onClick={() => void toggleAvailability(row)}
                      >
                        {row.quantity > 0 ? (
                          <>
                            <XCircle className="h-3 w-3" aria-hidden="true" />
                            {t("pharmacy.markOut")}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            {t("pharmacy.markIn")}
                          </>
                        )}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- Requests */}
      {tab === "requests" && (
        <div>
          {loadingRequests && <CardSkeleton count={3} />}
          {!loadingRequests && requests.length === 0 && (
            <EmptyState
              icon={ClipboardList}
              title={t("pharmacy.requestsEmpty")}
              body={t("pharmacy.requestsEmptyBody")}
            />
          )}
          {!loadingRequests && requests.length > 0 && (
            <ul className="space-y-3">
              {requests.map((r, i) => (
                <li
                  key={r.id}
                  className="flex animate-rise flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-fg">
                      {r.medicine.genericName}{" "}
                      <span className="text-sm font-normal text-fg-muted">
                        ({r.medicine.brandName})
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {t("pharmacy.from")}{" "}
                      <span className="font-medium text-fg">{r.patient.name}</span> · {r.patient.email}
                    </p>
                    <p className="tabular mt-1 text-xs text-fg-subtle">
                      {formatFullDateTime(r.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    <Link
                      href={`/chat/${r.id}`}
                      className={buttonClasses({ size: "sm", variant: "secondary" })}
                      aria-label={t("patient.chatWith", { name: r.patient.name })}
                    >
                      <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("patient.chat")}
                    </Link>
                    {r.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => void updateRequestStatus(r.id, "AVAILABLE")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("badge.inStock")}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void updateRequestStatus(r.id, "UNAVAILABLE")}
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("badge.outOfStock")}
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------------------------- Add-to-catalog modal */}
      <Dialog
        open={showNewProduct}
        onClose={() => setShowNewProduct(false)}
        size="md"
        title={t("pharmacy.newProductTitle")}
        description={t("pharmacy.newProductBody")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewProduct(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="new-product-form" loading={creatingProduct}>
              {t("pharmacy.addProduct")}
            </Button>
          </>
        }
      >
        <form id="new-product-form" onSubmit={createNewProduct} className="space-y-4">
          <Input
            label={t("pharmacy.genericName")}
            placeholder="Paracetamol"
            value={newProduct.genericName}
            onChange={(e) => setNewProduct((p) => ({ ...p, genericName: e.target.value }))}
            data-autofocus="true"
          />
          <Input
            label={t("pharmacy.brandName")}
            placeholder="Napa"
            value={newProduct.brandName}
            onChange={(e) => setNewProduct((p) => ({ ...p, brandName: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("pharmacy.strength")}
              placeholder="500mg"
              value={newProduct.strength}
              onChange={(e) => setNewProduct((p) => ({ ...p, strength: e.target.value }))}
            />
            <Input
              label={t("pharmacy.manufacturer")}
              placeholder="Beximco"
              value={newProduct.manufacturer}
              onChange={(e) => setNewProduct((p) => ({ ...p, manufacturer: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">
              {t("pharmacy.packPhoto")} · {t("auth.optional")}
            </p>
            <div className="flex items-center gap-3">
              {newProductPhotoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={newProductPhotoPreview}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-fg-subtle">
                  <ImageOff className="h-5 w-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <label className="cursor-pointer text-xs font-semibold text-accent hover:underline">
                  {t("pharmacy.choosePhoto")}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      e.target.value = "";
                      setNewProductPhoto(f);
                      setNewProductPhotoPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return f ? URL.createObjectURL(f) : null;
                      });
                    }}
                  />
                </label>
                {newProductPhoto && (
                  <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{newProductPhoto.name}</p>
                )}
              </div>
              {newProductPhoto && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setNewProductPhoto(null);
                    setNewProductPhotoPreview((prev) => {
                      if (prev) URL.revokeObjectURL(prev);
                      return null;
                    });
                  }}
                >
                  {t("common.dismiss")}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Dialog>
    </Container>
  );
}
