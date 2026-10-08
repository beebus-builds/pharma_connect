"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession, appToast as toast } from "@/components/Providers";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Pill, Plus, Search, Trash2, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Dialog } from "@/components/ui/Dialog";
import { useLocale } from "@/components/LocaleProvider";

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
  const { t, locale } = useLocale();
  const router = useRouter();

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminMedicine[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminMedicine | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && !isAdmin) router.replace("/");
  }, [status, isAdmin, router]);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // Debounced input lags the request by 300ms; show it so the list does not
  // look frozen while the user is still typing.
  useEffect(() => {
    setSearching(q.trim() !== debouncedQ);
  }, [q, debouncedQ]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (debouncedQ) params.set("q", debouncedQ);
      const res = await fetch(`/api/admin/medicines?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load medicines");
      setItems(data.medicines ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load medicines");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

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
        throw new Error(Array.isArray(first) ? first[0] : data.error || t("common.error"));
      }
      toast.success(data.message || t("admin.medicineAdded"));
      setForm(EMPTY_FORM);
      setShowCreate(false);
      setPage(1);
      void load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteMedicine() {
    if (!confirmDelete) return;
    setDeleting(true);
    setActingId(confirmDelete.id);
    try {
      const res = await fetch(`/api/admin/medicines/${confirmDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("common.error"));
      toast.success(t("admin.medicineRemoved", { name: confirmDelete.genericName }));
      setItems((prev) => prev.filter((x) => x.id !== confirmDelete.id));
      setTotal((n) => Math.max(n - 1, 0));
      setConfirmDelete(null);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setDeleting(false);
      setActingId(null);
    }
  }

  if (status === "loading" || !session) {
    return (
      <Container className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">{t("common.loading")}</span>
      </Container>
    );
  }

  const numberTag = locale === "ne" ? "ne-NP" : "en-NP";

  return (
    <Container className="py-8 sm:py-10">
      <Link
        href="/admin"
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("admin.backToAdmin")}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow={t("admin.eyebrow")}
          title={t("admin.medicinesTitle")}
          description={t("admin.catalogCount", {
            count: total.toLocaleString(numberTag),
          })}
        />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("admin.addMedicine")}
        </Button>
      </div>

      <div className="relative mb-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.searchCatalog")}
          aria-label={t("admin.searchCatalog")}
          leading={<Search />}
        />
        <span aria-live="polite" className="sr-only">
          {searching ? t("common.loading") : ""}
        </span>
      </div>

      {loading && items.length === 0 ? (
        <CardSkeleton count={6} />
      ) : loadError ? (
        <EmptyState
          tone="error"
          icon={Pill}
          title={t("admin.loadFailed")}
          body={loadError}
          action={<Button onClick={() => void load()}>{t("common.retry")}</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={debouncedQ ? t("admin.noCatalogMatches") : t("admin.catalogEmpty")}
          body={debouncedQ ? t("admin.noCatalogMatchesBody", { query: debouncedQ }) : undefined}
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("admin.addMedicine")}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((m, i) => (
              <li
                key={m.id}
                className="flex animate-rise flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover motion-reduce:animate-none"
                style={{ animationDelay: `${Math.min(i, 10) * 25}ms` }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[0.9375rem] font-semibold text-fg">
                    {m.genericName}
                    <span className="ml-1.5 font-sans text-sm font-normal text-fg-muted">
                      {m.strength}
                    </span>
                  </p>
                  <p className="truncate text-sm text-fg-muted">
                    {m.brandName} · {m.manufacturer}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Badge tone={m.stockCount > 0 ? "success" : "neutral"} className="tabular">
                    {t("admin.stockListings", { count: m.stockCount })}
                  </Badge>
                  <Badge tone={m.requestCount > 0 ? "accent" : "neutral"} className="tabular">
                    {t("admin.patientRequests", { count: m.requestCount })}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="xs"
                    loading={actingId === m.id}
                    onClick={() => setConfirmDelete(m)}
                    title={m.stockCount > 0 ? t("admin.deleteBlocked") : t("admin.delete")}
                    aria-label={t("admin.deleteNamed", {
                      name: `${m.genericName} ${m.strength}`,
                    })}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("admin.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <nav aria-label={t("admin.pagination")} className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                {t("patient.prev")}
              </Button>
              <span className="tabular text-sm text-fg-muted">
                {t("admin.pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("patient.next")}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </nav>
          )}
        </>
      )}

      {/* --------------------------------------------------------- Create modal */}
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={t("admin.addMedicine")}
        description={t("admin.addMedicineBody")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" form="create-medicine-form" loading={saving}>
              {t("common.save")}
            </Button>
          </>
        }
      >
        <form
          id="create-medicine-form"
          onSubmit={createMedicine}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Input
            label={t("pharmacy.genericName")}
            value={form.genericName}
            onChange={(e) => setForm({ ...form, genericName: e.target.value })}
            placeholder="Paracetamol"
            required
            data-autofocus="true"
          />
          <Input
            label={t("pharmacy.brandName")}
            value={form.brandName}
            onChange={(e) => setForm({ ...form, brandName: e.target.value })}
            placeholder="Crocin"
            required
          />
          <Input
            label={t("pharmacy.strength")}
            value={form.strength}
            onChange={(e) => setForm({ ...form, strength: e.target.value })}
            placeholder="500mg"
            required
          />
          <Input
            label={t("pharmacy.manufacturer")}
            value={form.manufacturer}
            onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
            placeholder="Cipla"
            required
          />
          {formError && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400 sm:col-span-2">
              {formError}
            </p>
          )}
        </form>
      </Dialog>

      {/* -------------------------------------------------------- Delete confirm */}
      <Dialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title={t("admin.delete")}
        description={t("admin.deleteConfirmBody", {
          name: confirmDelete
            ? `${confirmDelete.genericName} ${confirmDelete.strength} · ${confirmDelete.brandName}`
            : "",
        })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => void deleteMedicine()}>
              {t("admin.delete")}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-fg-muted">{t("admin.deleteConfirmNote")}</p>
      </Dialog>
    </Container>
  );
}
